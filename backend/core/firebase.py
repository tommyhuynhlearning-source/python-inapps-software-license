import json
import os
import uuid


FIRESTORE_BASE = "https://firestore.googleapis.com/v1"


def _make_credentials():
    import httpx  # noqa: F401 — ensure httpx available early
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials

    raw = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS_JSON")
    if raw:
        data = json.loads(raw)
        creds = Credentials(
            token=None,
            refresh_token=data["refresh_token"],
            client_id=data["client_id"],
            client_secret=data["client_secret"],
            token_uri="https://oauth2.googleapis.com/token",
            scopes=["https://www.googleapis.com/auth/cloud-platform"],
        )
    else:
        import google.auth
        creds, _ = google.auth.default(
            scopes=["https://www.googleapis.com/auth/cloud-platform"]
        )
    if not getattr(creds, "token", None):
        from google.auth.transport.requests import Request
        creds.refresh(Request())
    return creds


def _auth_header(creds) -> dict:
    from google.auth.transport.requests import Request
    if not creds.valid:
        creds.refresh(Request())
    return {"Authorization": f"Bearer {creds.token}"}


# ---------- value encoding / decoding ----------

def _decode(v: dict):
    if "stringValue" in v:    return v["stringValue"]
    if "booleanValue" in v:   return v["booleanValue"]
    if "integerValue" in v:   return int(v["integerValue"])
    if "doubleValue" in v:    return float(v["doubleValue"])
    if "nullValue" in v:      return None
    if "timestampValue" in v: return v["timestampValue"]
    if "mapValue" in v:       return _decode_fields(v["mapValue"].get("fields", {}))
    if "arrayValue" in v:     return [_decode(x) for x in v["arrayValue"].get("values", [])]
    return v


def _decode_fields(fields: dict) -> dict:
    return {k: _decode(v) for k, v in fields.items()}


def _encode(val) -> dict:
    if isinstance(val, bool):  return {"booleanValue": val}
    if isinstance(val, int):   return {"integerValue": str(val)}
    if isinstance(val, float): return {"doubleValue": val}
    if isinstance(val, str):   return {"stringValue": val}
    if val is None:            return {"nullValue": None}
    if isinstance(val, dict):
        return {"mapValue": {"fields": {k: _encode(v) for k, v in val.items()}}}
    if isinstance(val, list):
        return {"arrayValue": {"values": [_encode(x) for x in val]}}
    return {"stringValue": str(val)}


def _encode_fields(data: dict) -> dict:
    return {"fields": {k: _encode(v) for k, v in data.items()}}


# ---------- Firestore REST wrapper ----------

class _Doc:
    def __init__(self, raw: dict):
        name = raw.get("name", "")
        self.id = name.rsplit("/", 1)[-1]
        self._fields = raw.get("fields", {})
        self.exists = True

    def to_dict(self) -> dict:
        return _decode_fields(self._fields)


class _DocRef:
    def __init__(self, url: str, doc_id: str, creds):
        self._url = url
        self.id = doc_id
        self._creds = creds
        self._raw = None
        self.exists = False

    def get(self) -> "_DocRef":
        import httpx
        r = httpx.get(self._url, headers=_auth_header(self._creds), timeout=30)
        if r.status_code == 404:
            self.exists = False
        else:
            r.raise_for_status()
            self._raw = r.json()
            self.exists = True
        return self

    def to_dict(self) -> dict:
        return _decode_fields(self._raw.get("fields", {})) if self._raw else {}

    def set(self, data: dict):
        import httpx
        r = httpx.patch(
            self._url, headers=_auth_header(self._creds),
            json=_encode_fields(data), timeout=30,
        )
        r.raise_for_status()

    def update(self, data: dict):
        import httpx
        params = [("updateMask.fieldPaths", k) for k in data]
        r = httpx.patch(
            self._url, headers=_auth_header(self._creds),
            json=_encode_fields(data), params=params, timeout=30,
        )
        r.raise_for_status()

    def delete(self):
        import httpx
        r = httpx.delete(self._url, headers=_auth_header(self._creds), timeout=30)
        r.raise_for_status()


class _OrderedCollection:
    def __init__(self, coll: "_Collection", field: str, direction: str):
        self._coll = coll
        self._field = field
        self._direction = direction

    def stream(self):
        import httpx
        db = self._coll._db
        url = f"{db._base}:runQuery"
        query = {
            "structuredQuery": {
                "from": [{"collectionId": self._coll._name}],
                "orderBy": [
                    {"field": {"fieldPath": self._field}, "direction": self._direction}
                ],
            }
        }
        r = httpx.post(url, headers=_auth_header(db._creds), json=query, timeout=30)
        r.raise_for_status()
        return [_Doc(item["document"]) for item in r.json() if "document" in item]


class _Collection:
    def __init__(self, db: "FirestoreDB", name: str):
        self._db = db
        self._name = name

    def _doc_url(self, doc_id: str) -> str:
        return f"{self._db._base}/{self._name}/{doc_id}"

    def stream(self):
        import httpx
        r = httpx.get(
            f"{self._db._base}/{self._name}",
            headers=_auth_header(self._db._creds),
            timeout=30,
        )
        r.raise_for_status()
        return [_Doc(d) for d in r.json().get("documents", [])]

    def document(self, doc_id: str = None) -> _DocRef:
        if doc_id is None:
            doc_id = uuid.uuid4().hex
        return _DocRef(self._doc_url(doc_id), doc_id, self._db._creds)

    def order_by(self, field: str, direction: str = "ASCENDING") -> _OrderedCollection:
        return _OrderedCollection(self, field, direction)


class FirestoreDB:
    def __init__(self, project_id: str, creds):
        self._project = project_id
        self._creds = creds
        self._base = (
            f"{FIRESTORE_BASE}/projects/{project_id}/databases/(default)/documents"
        )

    def collection(self, name: str) -> _Collection:
        return _Collection(self, name)


def get_db() -> FirestoreDB:
    project_id = os.environ.get("FIREBASE_PROJECT_ID", "")
    return FirestoreDB(project_id, _make_credentials())
