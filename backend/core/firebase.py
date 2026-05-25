import uuid
import httpx

FIRESTORE_BASE = "https://firestore.googleapis.com/v1"

_client = httpx.AsyncClient(timeout=30)


def _auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


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
    def __init__(self, url: str, doc_id: str, token: str):
        self._url = url
        self.id = doc_id
        self._token = token
        self._raw = None
        self.exists = False

    async def get(self) -> "_DocRef":
        r = await _client.get(self._url, headers=_auth_header(self._token))
        if r.status_code == 404:
            self.exists = False
        else:
            r.raise_for_status()
            self._raw = r.json()
            self.exists = True
        return self

    def to_dict(self) -> dict:
        return _decode_fields(self._raw.get("fields", {})) if self._raw else {}

    async def set(self, data: dict):
        r = await _client.patch(
            self._url, headers=_auth_header(self._token),
            json=_encode_fields(data),
        )
        r.raise_for_status()

    async def update(self, data: dict):
        params = [("updateMask.fieldPaths", k) for k in data]
        r = await _client.patch(
            self._url, headers=_auth_header(self._token),
            json=_encode_fields(data), params=params,
        )
        r.raise_for_status()

    async def delete(self):
        r = await _client.delete(self._url, headers=_auth_header(self._token))
        r.raise_for_status()


class _OrderedCollection:
    def __init__(self, coll: "_Collection", field: str, direction: str):
        self._coll = coll
        self._field = field
        self._direction = direction

    async def stream(self, limit: int = 500):
        db = self._coll._db
        url = f"{db._base}:runQuery"
        query = {
            "structuredQuery": {
                "from": [{"collectionId": self._coll._name}],
                "orderBy": [
                    {"field": {"fieldPath": self._field}, "direction": self._direction}
                ],
                "limit": limit,
            }
        }
        r = await _client.post(url, headers=_auth_header(db._token), json=query)
        r.raise_for_status()
        return [_Doc(item["document"]) for item in r.json() if "document" in item]


class _Collection:
    def __init__(self, db: "FirestoreDB", name: str):
        self._db = db
        self._name = name

    def _doc_url(self, doc_id: str) -> str:
        return f"{self._db._base}/{self._name}/{doc_id}"

    async def stream(self, limit: int = 500):
        r = await _client.get(
            f"{self._db._base}/{self._name}",
            headers=_auth_header(self._db._token),
            params={"pageSize": limit},
        )
        if not r.is_success:
            raise RuntimeError(f"Firestore {r.status_code}: {r.text}")
        return [_Doc(d) for d in r.json().get("documents", [])]

    def document(self, doc_id: str = None) -> _DocRef:
        if doc_id is None:
            doc_id = uuid.uuid4().hex
        return _DocRef(self._doc_url(doc_id), doc_id, self._db._token)

    def order_by(self, field: str, direction: str = "ASCENDING") -> _OrderedCollection:
        return _OrderedCollection(self, field, direction)


class FirestoreDB:
    def __init__(self, project_id: str, token: str):
        self._project = project_id
        self._token = token
        self._base = (
            f"{FIRESTORE_BASE}/projects/{project_id}/databases/(default)/documents"
        )

    def collection(self, name: str) -> _Collection:
        return _Collection(self, name)


def get_db(token: str) -> FirestoreDB:
    from core.config import settings
    return FirestoreDB(settings.firebase_project_id, token)
