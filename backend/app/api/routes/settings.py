from __future__ import annotations

import structlog
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import SQLAlchemyError

from app.api.dependencies import RequireAuth, get_db_session, get_memory_service, get_reflection_service
from app.core.security import AuthContext
from app.schemas import CareerGrowthSuggestion
from app.services.memory import MemoryService
from app.services.reflection import ReflectionService

router = APIRouter()
logger = structlog.get_logger(__name__)


@router.get("/profile")
async def profile(auth: AuthContext = RequireAuth) -> dict[str, int | str | None]:
    return {
        "user_id": auth.user_id,
        "email": auth.email,
    }


@router.post("/career-growth/trigger", response_model=CareerGrowthSuggestion)
async def trigger_career_growth(
    auth: AuthContext = RequireAuth,
    session: AsyncSession = Depends(get_db_session),
    memory_service: MemoryService = Depends(get_memory_service),
) -> CareerGrowthSuggestion:
    suggestion = await memory_service.career_growth_suggestion(auth.user_id, session=session)
    try:
        await memory_service.record_reflection(session, auth.user_id, suggestion.suggestion, "manual", suggestion.model_dump())
    except (SQLAlchemyError, OSError) as exc:
        logger.warning("database.manual_reflection_failed", user_id=auth.user_id, error=str(exc))
    return suggestion


@router.post("/scheduler/reload")
async def reload_scheduler(reflection_service: ReflectionService = Depends(get_reflection_service)) -> dict[str, str]:
    reflection_service.start()
    return {"message": "Scheduler restarted"}
