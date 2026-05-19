from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from core.firebase import get_db

router = APIRouter(prefix="/api/licenses", tags=["licenses"])


class License(BaseModel):
    key: str
    product: str
    owner: str
    expires_at: str | None = None
    active: bool = True


@router.get("/")
async def list_licenses():
    db = get_db()
    docs = db.collection("licenses").stream()
    return [{"id": doc.id, **doc.to_dict()} for doc in docs]


@router.post("/", status_code=201)
async def create_license(payload: License):
    db = get_db()
    ref = db.collection("licenses").document()
    ref.set(payload.model_dump())
    return {"id": ref.id, **payload.model_dump()}


@router.get("/{license_id}")
async def get_license(license_id: str):
    db = get_db()
    doc = db.collection("licenses").document(license_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="License not found")
    return {"id": doc.id, **doc.to_dict()}


@router.delete("/{license_id}", status_code=204)
async def delete_license(license_id: str):
    db = get_db()
    db.collection("licenses").document(license_id).delete()
