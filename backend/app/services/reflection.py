from __future__ import annotations

from typing import Iterable

import structlog
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.models import User
from app.schemas import CareerGrowthSuggestion
from app.services.memory import MemoryService


class ReflectionService:
    """Coordinates APScheduler jobs for daily/weekly reflections."""

    def __init__(self, scheduler: AsyncIOScheduler, memory_service: MemoryService):
        self._scheduler = scheduler
        self._memory_service = memory_service
        self._log = structlog.get_logger(__name__)

    def start(self) -> None:
        if not self._scheduler.running:
            self._scheduler.start()
        self._scheduler.add_job(
            self.run_daily_career_growth,
            trigger="cron",
            hour=settings.career_reflect_hour_utc,
            minute=0,
            id="career_growth_daily",
            replace_existing=True,
        )
        self._scheduler.add_job(
            self.run_weekly_pivot,
            trigger="cron",
            day_of_week=settings.weekly_reflection_weekday,
            hour=settings.career_reflect_hour_utc + 1,
            id="weekly_pivot",
            replace_existing=True,
        )

    async def run_daily_career_growth(self) -> None:
        from app.db.session import async_session_factory

        async with async_session_factory() as session:
            try:
                profiles = await self._all_profiles(session)
            except (SQLAlchemyError, OSError) as exc:
                self._log.warning("database.fetch_profiles_failed", error=str(exc), job="daily")
                return

            for profile in profiles:
                suggestion = await self._memory_service.career_growth_suggestion(profile.id, session=session)
                try:
                    await self._memory_service.record_reflection(
                        session=session,
                        user_id=profile.id,
                        suggestion=suggestion.suggestion,
                        kind="daily",
                        metadata=suggestion.model_dump(),
                    )
                except (SQLAlchemyError, OSError) as exc:
                    self._log.warning("database.record_reflection_failed", error=str(exc), job="daily")
                    return

    async def run_weekly_pivot(self) -> None:
        from app.db.session import async_session_factory

        async with async_session_factory() as session:
            try:
                profiles = await self._all_profiles(session)
            except (SQLAlchemyError, OSError) as exc:
                self._log.warning("database.fetch_profiles_failed", error=str(exc), job="weekly")
                return

            for profile in profiles:
                reflection = await self._memory_service.career_growth_suggestion(profile.id, session=session)
                try:
                    await self._memory_service.record_reflection(
                        session=session,
                        user_id=profile.id,
                        suggestion=reflection.suggestion,
                        kind="weekly",
                        metadata={"type": "career_pivot", **reflection.model_dump()},
                    )
                except (SQLAlchemyError, OSError) as exc:
                    self._log.warning("database.record_reflection_failed", error=str(exc), job="weekly")
                    return

    async def _all_profiles(self, session: AsyncSession) -> Iterable[User]:
        result = await session.execute(select(User))
        return list(result.scalars())
