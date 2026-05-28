from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from core.firebase import get_db
from core.auth import get_token

router = APIRouter(prefix="/api/licenses", tags=["licenses"])


class License(BaseModel):
    tenPhanMem: str
    team: str | None = None
    soLuongLicense: int | None = None
    chiPhiHangNam: float | None = None
    chiPhiHangThang: float | None = None
    loaiChiPhi: str | None = None
    loaiTaiKhoan: str | None = None
    nguoiQuanLy: str | None = None
    ngayHetHan: str | None = None
    emailDangKy: str | None = None


@router.get("/")
async def list_licenses(token: str = Depends(get_token)):
    db = get_db(token)
    docs = await db.collection("software_licenses").stream()
    return [{"id": doc.id, **doc.to_dict()} for doc in docs]


@router.post("/", status_code=201)
async def create_license(payload: License, token: str = Depends(get_token)):
    db = get_db(token)
    ref = db.collection("software_licenses").document()
    await ref.set(payload.model_dump())
    return {"id": ref.id, **payload.model_dump()}


@router.get("/{license_id}")
async def get_license(license_id: str, token: str = Depends(get_token)):
    db = get_db(token)
    doc = await db.collection("software_licenses").document(license_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="License not found")
    return {"id": doc.id, **doc.to_dict()}


@router.put("/{license_id}")
async def update_license(license_id: str, payload: License, token: str = Depends(get_token)):
    db = get_db(token)
    ref = db.collection("software_licenses").document(license_id)
    doc = await ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="License not found")
    await ref.set(payload.model_dump())
    return {"id": license_id, **payload.model_dump()}


@router.delete("/{license_id}", status_code=204)
async def delete_license(license_id: str, token: str = Depends(get_token)):
    db = get_db(token)
    await db.collection("software_licenses").document(license_id).delete()

