from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from core.firebase import get_db
from core.auth import get_token

router = APIRouter(prefix="/api/devices", tags=["devices"])


class Device(BaseModel):
    tenThietBi: str
    loaiMay: str | None = None
    nhanSuSuDung: str | None = None
    team: str | None = None


class BulkDevice(BaseModel):
    items: list[Device]


@router.get("/")
async def list_devices(token: str = Depends(get_token)):
    db = get_db(token)
    docs = await db.collection("devices").stream()
    return [{"id": doc.id, **doc.to_dict()} for doc in docs]


@router.post("/", status_code=201)
async def register_device(payload: Device, token: str = Depends(get_token)):
    db = get_db(token)
    ref = db.collection("devices").document()
    await ref.set(payload.model_dump())
    return {"id": ref.id, **payload.model_dump()}


@router.post("/bulk", status_code=201)
async def bulk_create_devices(payload: BulkDevice, token: str = Depends(get_token)):
    db = get_db(token)
    results = []
    for item in payload.items:
        ref = db.collection("devices").document()
        await ref.set(item.model_dump())
        results.append({"id": ref.id, **item.model_dump()})
    return results


@router.get("/{device_id}")
async def get_device(device_id: str, token: str = Depends(get_token)):
    db = get_db(token)
    doc = await db.collection("devices").document(device_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Device not found")
    return {"id": doc.id, **doc.to_dict()}


@router.put("/{device_id}")
async def update_device(device_id: str, payload: Device, token: str = Depends(get_token)):
    db = get_db(token)
    ref = db.collection("devices").document(device_id)
    doc = await ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Device not found")
    await ref.set(payload.model_dump())
    return {"id": device_id, **payload.model_dump()}


@router.delete("/{device_id}", status_code=204)
async def delete_device(device_id: str, token: str = Depends(get_token)):
    db = get_db(token)
    await db.collection("devices").document(device_id).delete()
