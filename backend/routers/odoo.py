import asyncio

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from core.auth import get_token
from core.email_utils import send_task_notification
from core.odoo_client import create_task, list_tasks

router = APIRouter(prefix="/api/odoo", tags=["odoo"])


class TaskCreate(BaseModel):
    name: str


@router.get("/tasks")
async def get_tasks(token: str = Depends(get_token)):
    try:
        return list_tasks()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/tasks", status_code=201)
async def post_task(payload: TaskCreate, token: str = Depends(get_token)):
    if not payload.name.strip():
        raise HTTPException(status_code=422, detail="Task name is required")
    try:
        task = create_task(payload.name.strip())
        await asyncio.to_thread(send_task_notification, task["name"], task["id"])
        return task
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
