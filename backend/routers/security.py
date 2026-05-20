from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from core.firebase import get_db
from core.auth import get_token

router = APIRouter(prefix="/api/security", tags=["security"])


class SecurityEvent(BaseModel):
    tenService: str
    email: Optional[str] = None
    loaiCredential: Optional[str] = None
    vaiTro: Optional[str] = None
    nguoiNamGiu: Optional[str] = None
    team: Optional[str] = None


@router.get("/events")
async def list_events(token: str = Depends(get_token)):
    db = get_db(token)
    docs = db.collection("security_records").order_by("submittedAt", direction="DESCENDING").stream()
    return [{"id": doc.id, **doc.to_dict()} for doc in docs]


@router.post("/events", status_code=201)
async def create_event(payload: SecurityEvent, token: str = Depends(get_token)):
    db = get_db(token)
    ref = db.collection("security_records").document()
    data = payload.model_dump()
    ref.set(data)
    return {"id": ref.id, **data}


@router.post("/revoke/{license_id}")
async def revoke_license(license_id: str, token: str = Depends(get_token)):
    db = get_db(token)
    doc_ref = db.collection("software_licenses").document(license_id)
    doc = doc_ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="License not found")
    doc_ref.update({"active": False})
    return {"revoked": True, "license_id": license_id}
