from __future__ import annotations

from datetime import datetime
from fastapi import APIRouter

from app.core.config import settings

router = APIRouter()

_startup_time = datetime.utcnow()

@router.get("/", summary="Health check")
async def health() -> dict[str, str | int]:
    return {
        "status": "ok",
        "app": settings.app_name,
        "groq_model": settings.groq_model,
        "api_prefix": settings.api_prefix,
        "timestamp": int(datetime.utcnow().timestamp()),
        "uptime_seconds": int((datetime.utcnow() - _startup_time).total_seconds()),
    }
