from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from core.firebase import get_db

router = APIRouter(prefix="/api/security", tags=["security"])


class SecurityEvent(BaseModel):
    device_id: str
    license_id: str
    event_type: str
    description: str
    severity: str = "info"


@router.get("/events")
async def list_events():
    db = get_db()
    docs = db.collection("security_events").order_by("created_at", direction="DESCENDING").stream()
    return [{"id": doc.id, **doc.to_dict()} for doc in docs]


@router.post("/events", status_code=201)
async def create_event(payload: SecurityEvent):
    db = get_db()
    ref = db.collection("security_events").document()
    data = {**payload.model_dump(), "created_at": datetime.now(timezone.utc).isoformat()}
    ref.set(data)
    return {"id": ref.id, **data}


@router.post("/revoke/{license_id}")
async def revoke_license(license_id: str):
    db = get_db()
    doc_ref = db.collection("licenses").document(license_id)
    doc = doc_ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="License not found")
    doc_ref.update({"active": False})
    return {"revoked": True, "license_id": license_id}
