from fastapi import APIRouter, Depends
from pydantic import BaseModel
from core.auth import get_token
from core.firebase import get_db

router = APIRouter(prefix="/api/alias-mail-config", tags=["alias-config"])
COLLECTION = "alias-mail-config"
DEFAULT = {"status": "active", "odc_type": "odc"}
NON_ODC_DEFAULTS = {"legal@inapps.net", "vy.doan@inapps.net"}


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
    existing = {doc.id: doc.to_dict() for doc in existing_docs}

    created: dict = {}
    corrected: dict = {}
    deleted: list = []

    for email in emails:
        if email not in existing:
            entry = {**DEFAULT, "odc_type": "non-odc"} if email in NON_ODC_DEFAULTS else DEFAULT.copy()
            await db.collection(COLLECTION).document(email).set(entry)
            created[email] = entry
        elif email in NON_ODC_DEFAULTS and existing[email].get("odc_type") == "odc":
            await db.collection(COLLECTION).document(email).update({"odc_type": "non-odc"})
            corrected[email] = {**existing[email], "odc_type": "non-odc"}

    for email in existing:
        if email not in emails:
            await db.collection(COLLECTION).document(email).delete()
            deleted.append(email)

    return {"created": created, "corrected": corrected, "deleted": deleted}
