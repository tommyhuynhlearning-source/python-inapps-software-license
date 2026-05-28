import os
import asyncio
import firebase_admin
from firebase_admin import credentials as fb_creds, firestore as _admin_firestore
from google.oauth2.credentials import Credentials as OAuthCredentials

_FIREBASE_CLI_CLIENT_ID = "563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com"
_FIREBASE_CLI_CLIENT_SECRET = "j9iVZfS8kkCEFUPaAeJV0sAi"


class _CloudPlatformCredential(fb_creds.Base):
    """Uses Firebase CLI refresh token with cloud-platform scope (supported by the CLI OAuth client)."""
    def __init__(self, refresh_token: str):
        self._g_credential = OAuthCredentials(
            token=None,
            refresh_token=refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=_FIREBASE_CLI_CLIENT_ID,
            client_secret=_FIREBASE_CLI_CLIENT_SECRET,
            scopes=["https://www.googleapis.com/auth/cloud-platform"],
        )

    def get_credential(self):
        return self._g_credential


def _load_refresh_token() -> str:
    from core.config import settings
    token = os.environ.get("GOOGLE_REFRESH_TOKEN") or settings.google_refresh_token
    if token:
        return token
    import json
    # Try firebase-tools configstore (populated by `npx firebase-tools login`)
    ft = os.path.expanduser("~/.config/configstore/firebase-tools.json")
    if os.path.exists(ft):
        try:
            d = json.load(open(ft))
            t = d.get("tokens", {}).get("refresh_token", "")
            if t:
                return t
        except Exception:
            pass
    # Try ADC file (populated by `gcloud auth application-default login`)
    adc = os.path.expanduser("~/.config/gcloud/application_default_credentials.json")
    if os.path.exists(adc):
        try:
            d = json.load(open(adc))
            if d.get("client_id") == _FIREBASE_CLI_CLIENT_ID:
                return d.get("refresh_token", "")
        except Exception:
            pass
    return ""


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
            refresh_token = _load_refresh_token()
            if refresh_token:
                cred = _CloudPlatformCredential(refresh_token)
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
