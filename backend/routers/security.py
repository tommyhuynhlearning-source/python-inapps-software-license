from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from core.firebase import get_db
from core.auth import get_token

router = APIRouter(prefix="/api/security", tags=["security"])


class SecurityEvent(BaseModel):
    tenService: str
    email: str | None = None
    loaiCredential: str | None = None
    vaiTro: str | None = None
    nguoiNamGiu: str | None = None
    team: str | None = None


@router.get("/events")
async def list_events(token: str = Depends(get_token)):
    db = get_db(token)
    docs = await db.collection("security_records").order_by("submittedAt", direction="DESCENDING").stream()
    return [{"id": doc.id, **doc.to_dict()} for doc in docs]


@router.post("/events", status_code=201)
async def create_event(payload: SecurityEvent, token: str = Depends(get_token)):
    db = get_db(token)
    ref = db.collection("security_records").document()
    data = payload.model_dump()
    await ref.set(data)
    return {"id": ref.id, **data}


@router.put("/events/{event_id}")
async def update_event(event_id: str, payload: SecurityEvent, token: str = Depends(get_token)):
    db = get_db(token)
    ref = db.collection("security_records").document(event_id)
    doc = await ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Record not found")
    await ref.set(payload.model_dump())
    return {"id": event_id, **payload.model_dump()}


@router.delete("/events/{event_id}", status_code=204)
async def delete_event(event_id: str, token: str = Depends(get_token)):
    db = get_db(token)
    await db.collection("security_records").document(event_id).delete()


@router.post("/revoke/{license_id}")
async def revoke_license(license_id: str, token: str = Depends(get_token)):
    db = get_db(token)
    doc_ref = db.collection("software_licenses").document(license_id)
    doc = await doc_ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="License not found")
    await doc_ref.update({"active": False})
    return {"revoked": True, "license_id": license_id}
