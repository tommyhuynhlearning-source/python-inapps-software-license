import os
import asyncio
import datetime
import json as _json
import urllib.request
import urllib.parse
import firebase_admin
import google.auth.credentials
from firebase_admin import credentials as fb_creds, firestore as _admin_firestore

_FIREBASE_CLI_CLIENT_ID = "563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com"
_FIREBASE_CLI_CLIENT_SECRET = "j9iVZfS8kkCEFUPaAeJV0sAi"


class _DirectRefreshCredentials(google.auth.credentials.Credentials):
    """Refreshes OAuth2 token directly via HTTP, bypassing google-auth reauth flow."""

    def __init__(self, refresh_token: str, client_id: str, client_secret: str):
        super().__init__()
        self._refresh_token = refresh_token
        self._client_id = client_id
        self._client_secret = client_secret

    def refresh(self, request):
        last_exc = None
        for attempt in range(2):
            data = urllib.parse.urlencode({
                "client_id": self._client_id,
                "client_secret": self._client_secret,
                "refresh_token": self._refresh_token,
                "grant_type": "refresh_token",
            }).encode()
            req = urllib.request.Request(
                "https://oauth2.googleapis.com/token",
                data=data,
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                method="POST",
            )
            try:
                with urllib.request.urlopen(req, timeout=10) as resp:
                    result = _json.loads(resp.read())
                self.token = result["access_token"]
                self.expiry = datetime.datetime.utcnow() + datetime.timedelta(
                    seconds=result.get("expires_in", 3600) - 60
                )
                return
            except Exception as exc:
                last_exc = exc
                if attempt == 0:
                    # Token may have been rotated via reauth — check Firestore for a fresh one
                    fresh = _load_token_from_firestore()
                    if fresh and fresh != self._refresh_token:
                        self._refresh_token = fresh
                        # Firestore token was issued by the reauth OAUTH client, not Firebase CLI
                        cid, csec = _get_oauth_client_credentials()
                        if cid and csec:
                            self._client_id = cid
                            self._client_secret = csec
                        continue
                break
        raise last_exc


class _CloudPlatformCredential(fb_creds.Base):
    """Uses a refresh token with cloud-platform scope."""
    def __init__(self, refresh_token: str, client_id: str, client_secret: str):
        self._g_credential = _DirectRefreshCredentials(refresh_token, client_id, client_secret)

    def get_credential(self):
        return self._g_credential


def _get_oauth_client_credentials() -> tuple[str, str]:
    """Return (client_id, client_secret) for tokens issued by the reauth OAuth flow."""
    try:
        from core.config import settings
        cid = os.environ.get("OAUTH_CLIENT_ID") or settings.oauth_client_id
        csec = os.environ.get("OAUTH_CLIENT_SECRET") or settings.oauth_client_secret
        return cid, csec
    except Exception:
        return "", ""


def _load_token_from_firestore() -> str:
    """Read token from Firestore REST API without auth (uses public read rule on _admin_config)."""
    try:
        from core.config import settings
        project_id = settings.firebase_project_id
        if not project_id:
            return ""
        url = (
            f"https://firestore.googleapis.com/v1/projects/{project_id}"
            "/databases/(default)/documents/_admin_config/google_refresh_token"
        )
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=5) as resp:
            doc = _json.loads(resp.read())
        return doc.get("fields", {}).get("value", {}).get("stringValue", "")
    except Exception:
        return ""


def _load_refresh_token() -> tuple[str, str, str]:
    """Returns (refresh_token, client_id, client_secret)."""
    # Firestore is the primary store — updated without redeploy via reauth callback
    fs_token = _load_token_from_firestore()
    if fs_token:
        cid, csec = _get_oauth_client_credentials()
        if cid and csec:
            return fs_token, cid, csec

    from core.config import settings
    token = os.environ.get("GOOGLE_REFRESH_TOKEN") or settings.google_refresh_token
    if token:
        return token, _FIREBASE_CLI_CLIENT_ID, _FIREBASE_CLI_CLIENT_SECRET
    import json
    # Try firebase-tools configstore (populated by `npx firebase-tools login`)
    ft = os.path.expanduser("~/.config/configstore/firebase-tools.json")
    if os.path.exists(ft):
        try:
            d = json.load(open(ft))
            t = d.get("tokens", {}).get("refresh_token", "")
            if t:
                return t, _FIREBASE_CLI_CLIENT_ID, _FIREBASE_CLI_CLIENT_SECRET
        except Exception:
            pass
    # Try ADC file (populated by `gcloud auth application-default login`)
    adc = os.path.expanduser("~/.config/gcloud/application_default_credentials.json")
    if os.path.exists(adc):
        try:
            d = _json.load(open(adc))
            if d.get("client_id") == _FIREBASE_CLI_CLIENT_ID:
                t = d.get("refresh_token", "")
                if t:
                    return t, _FIREBASE_CLI_CLIENT_ID, _FIREBASE_CLI_CLIENT_SECRET
        except Exception:
            pass
    return "", _FIREBASE_CLI_CLIENT_ID, _FIREBASE_CLI_CLIENT_SECRET


def _init_app():
    if not firebase_admin._apps:
        import json
        from core.config import settings
        cred = None
        sa_json = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS_JSON")
        if sa_json:
            d = json.loads(sa_json)
            if d.get("type") == "service_account":
                cred = fb_creds.Certificate(d)
        if cred is None:
            refresh_token, client_id, client_secret = _load_refresh_token()
            if refresh_token:
                cred = _CloudPlatformCredential(refresh_token, client_id, client_secret)
        if cred:
            firebase_admin.initialize_app(cred, options={"projectId": settings.firebase_project_id})
        else:
            firebase_admin.initialize_app(options={"projectId": settings.firebase_project_id})


def _sync_client():
    _init_app()
    return _admin_firestore.client()


class _Doc:
    def __init__(self, snap):
        self.id = snap.id
        self.exists = snap.exists
        self._snap = snap

    def to_dict(self) -> dict:
        return self._snap.to_dict() or {}


class _DocRef:
    def __init__(self, ref):
        self._ref = ref
        self.id = ref.id
        self.exists = False
        self._snap = None

    async def get(self) -> "_DocRef":
        snap = await asyncio.to_thread(self._ref.get)
        self.exists = snap.exists
        self._snap = snap
        return self

    def to_dict(self) -> dict:
        return self._snap.to_dict() if self._snap and self._snap.exists else {}

    async def set(self, data: dict):
        await asyncio.to_thread(self._ref.set, data)

    async def update(self, data: dict):
        await asyncio.to_thread(self._ref.update, data)

    async def delete(self):
        await asyncio.to_thread(self._ref.delete)


class _OrderedCollection:
    def __init__(self, query):
        self._query = query

    async def stream(self, limit: int = 500):
        docs = await asyncio.to_thread(lambda: list(self._query.limit(limit).stream()))
        return [_Doc(d) for d in docs]


class _Collection:
    def __init__(self, coll_ref):
        self._ref = coll_ref

    async def stream(self, limit: int = 500):
        docs = await asyncio.to_thread(lambda: list(self._ref.limit(limit).stream()))
        return [_Doc(d) for d in docs]

    def document(self, doc_id: str = None) -> _DocRef:
        ref = self._ref.document(doc_id) if doc_id else self._ref.document()
        return _DocRef(ref)

    def order_by(self, field: str, direction: str = "ASCENDING") -> _OrderedCollection:
        from google.cloud.firestore_v1 import Query
        dir_const = Query.DESCENDING if direction == "DESCENDING" else Query.ASCENDING
        return _OrderedCollection(self._ref.order_by(field, direction=dir_const))


class FirestoreDB:
    def collection(self, name: str) -> _Collection:
        return _Collection(_sync_client().collection(name))


def get_db(token: str = None) -> FirestoreDB:
    return FirestoreDB()
