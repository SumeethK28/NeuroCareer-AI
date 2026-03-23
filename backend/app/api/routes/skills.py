from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import RequireAuth, get_memory_service
from app.core.security import AuthContext
from app.db.session import get_session
from app.schemas import SkillTreeResponse
from app.services.memory import MemoryService

router = APIRouter()


@router.get("/tree", response_model=SkillTreeResponse)
async def skill_tree(
    auth: AuthContext = RequireAuth,
    memory_service: MemoryService = Depends(get_memory_service),
    session: AsyncSession = Depends(get_session),
) -> SkillTreeResponse:
    return await memory_service.fetch_skill_tree(session, auth)
