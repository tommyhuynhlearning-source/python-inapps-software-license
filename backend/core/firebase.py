import os
import asyncio
import firebase_admin
from firebase_admin import credentials as fb_creds, firestore as _admin_firestore

_FIREBASE_CLI_CLIENT_ID = "563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com"
_FIREBASE_CLI_CLIENT_SECRET = "j9iVZfS8kkCEFUPaAeJV0sAi"


def _init_app():
    if not firebase_admin._apps:
        from core.config import settings
        refresh_token = os.environ.get("GOOGLE_REFRESH_TOKEN")
        if refresh_token:
            cred = fb_creds.RefreshToken({
                "type": "authorized_user",
                "client_id": _FIREBASE_CLI_CLIENT_ID,
                "client_secret": _FIREBASE_CLI_CLIENT_SECRET,
                "refresh_token": refresh_token,
            })
            firebase_admin.initialize_app(credential=cred, options={"projectId": settings.firebase_project_id})
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
