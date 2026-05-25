from fastapi import APIRouter, Depends
from pydantic import BaseModel
from core.auth import get_token
from core.firebase import get_db

router = APIRouter(prefix="/api/alias-mail-config", tags=["alias-config"])
COLLECTION = "alias-mail-config"
DEFAULT = {"status": "active", "odc_type": "odc"}


class ConfigEntry(BaseModel):
    status: str
    odc_type: str


class SyncPayload(BaseModel):
    emails: list[str]


@router.get("")
async def get_config(token: str = Depends(get_token)):
    db = get_db(token)
    docs = await db.collection(COLLECTION).stream()
    return {doc.id: doc.to_dict() for doc in docs}


@router.put("/{email:path}")
async def upsert_config(email: str, entry: ConfigEntry, token: str = Depends(get_token)):
    db = get_db(token)
    await db.collection(COLLECTION).document(email).set(entry.model_dump())
    return {"ok": True}


@router.post("/sync")
async def sync_config(payload: SyncPayload, token: str = Depends(get_token)):
    db = get_db(token)
    emails = set(payload.emails)
    existing_docs = await db.collection(COLLECTION).stream()
    existing = {doc.id for doc in existing_docs}

    for email in emails:
        if email not in existing:
            await db.collection(COLLECTION).document(email).set(DEFAULT.copy())

    for email in existing:
        if email not in emails:
            await db.collection(COLLECTION).document(email).delete()

    return {"ok": True}
