from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from core.firebase import get_db

router = APIRouter(prefix="/api/devices", tags=["devices"])


class Device(BaseModel):
    name: str
    license_id: str
    hardware_id: str
    registered_at: str | None = None
    active: bool = True


@router.get("/")
async def list_devices():
    db = get_db()
    docs = db.collection("devices").stream()
    return [{"id": doc.id, **doc.to_dict()} for doc in docs]


@router.post("/", status_code=201)
async def register_device(payload: Device):
    db = get_db()
    ref = db.collection("devices").document()
    ref.set(payload.model_dump())
    return {"id": ref.id, **payload.model_dump()}


@router.get("/{device_id}")
async def get_device(device_id: str):
    db = get_db()
    doc = db.collection("devices").document(device_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Device not found")
    return {"id": doc.id, **doc.to_dict()}


@router.delete("/{device_id}", status_code=204)
async def delete_device(device_id: str):
    db = get_db()
    db.collection("devices").document(device_id).delete()
