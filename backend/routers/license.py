from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from core.firebase import get_db
from core.auth import get_token

router = APIRouter(prefix="/api/licenses", tags=["licenses"])


class License(BaseModel):
    tenPhanMem: str
    team: Optional[str] = None
    soLuongLicense: Optional[int] = None
    chiPhiHangNam: Optional[float] = None
    chiPhiHangThang: Optional[float] = None
    loaiChiPhi: Optional[str] = None
    loaiTaiKhoan: Optional[str] = None
    nguoiQuanLy: Optional[str] = None
    ngayHetHan: Optional[str] = None


@router.get("/")
async def list_licenses(token: str = Depends(get_token)):
    db = get_db(token)
    docs = db.collection("software_licenses").stream()
    return [{"id": doc.id, **doc.to_dict()} for doc in docs]


@router.post("/", status_code=201)
async def create_license(payload: License, token: str = Depends(get_token)):
    db = get_db(token)
    ref = db.collection("software_licenses").document()
    ref.set(payload.model_dump())
    return {"id": ref.id, **payload.model_dump()}


@router.get("/{license_id}")
async def get_license(license_id: str, token: str = Depends(get_token)):
    db = get_db(token)
    doc = db.collection("software_licenses").document(license_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="License not found")
    return {"id": doc.id, **doc.to_dict()}


@router.delete("/{license_id}", status_code=204)
async def delete_license(license_id: str, token: str = Depends(get_token)):
    db = get_db(token)
    db.collection("software_licenses").document(license_id).delete()
