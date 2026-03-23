from __future__ import annotations

import structlog
from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import SQLAlchemyError

from app.api.dependencies import RequireAuth, get_db_session, get_memory_service
from app.core.security import AuthContext
from app.schemas import ClearMemoryResponse, ReflectionResponse, RetainExperiencePayload
from app.services.memory import MemoryService

router = APIRouter()
logger = structlog.get_logger(__name__)


@router.post("/retain", status_code=202)
async def retain_experience(
    payload: RetainExperiencePayload,
    background_tasks: BackgroundTasks,
    auth: AuthContext = RequireAuth,
    memory_service: MemoryService = Depends(get_memory_service),
) -> dict[str, str]:
    await memory_service.retain_project_experience(auth, payload, background_tasks=background_tasks)
    return {"message": "Experience retention queued."}


@router.post("/clear", response_model=ClearMemoryResponse)
async def clear_memory(
    auth: AuthContext = RequireAuth,
    session: AsyncSession = Depends(get_db_session),
    memory_service: MemoryService = Depends(get_memory_service),
) -> ClearMemoryResponse:
    await memory_service.clear_user_memory(session, auth)
    return ClearMemoryResponse(message="Career memory cleared. Start logging again to rebuild your tree.")


@router.get("/reflections/latest", response_model=ReflectionResponse | None)
async def latest_reflection(
    auth: AuthContext = RequireAuth,
    session: AsyncSession = Depends(get_db_session),
    memory_service: MemoryService = Depends(get_memory_service),
) -> ReflectionResponse | None:
    try:
        record = await memory_service.latest_reflection(session, auth.user_id)
    except (SQLAlchemyError, OSError) as exc:
        logger.warning("database.latest_reflection_failed", user_id=auth.user_id, error=str(exc))
        return None
    if not record:
        return None
    return ReflectionResponse(timestamp=record.created_at, suggestion=record.suggestion, metadata=record.payload)
