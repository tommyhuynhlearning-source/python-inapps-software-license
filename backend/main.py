from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.config import settings
from routers import license, device, security

app = FastAPI(title="InApps Software License API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(license.router)
app.include_router(device.router)
app.include_router(security.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
