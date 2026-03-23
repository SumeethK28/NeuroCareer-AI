from __future__ import annotations

from datetime import datetime
import json
import re
from typing import Sequence
import difflib

import httpx
from fastapi import BackgroundTasks
from sqlalchemy import delete, select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import SQLAlchemyError
import structlog

from app.core.config import settings
from app.core.errors import MemoryUnavailableError
from app.core.security import AuthContext
from app.db.models import ApplicationLog, ReflectionRecord, User, UserSkill
from app.schemas import (
    AgentChatRequest,
    ApplicationInsight,
    ApplicationInsightsResponse,
    CareerGrowthSuggestion,
    Message,
    RetainExperiencePayload,
    SkillObservation,
    SkillTreeNode,
    SkillTreeResponse,
)
from app.services.hindsight_client import HindsightMemoryClient


class MemoryService:
    """High-level orchestration around Hindsight + Postgres persistence."""

    def __init__(self, client: HindsightMemoryClient):
        self._client = client
        self._log = structlog.get_logger(__name__)

    async def ensure_profile(self, session: AsyncSession, auth: AuthContext) -> User:
        result = await session.execute(select(User).where(User.id == auth.user_id))
        user = result.scalar_one_or_none()
        if not user:
            raise ValueError(f"User with id {auth.user_id} not found")
        return user

    async def retain_project_experience(
        self,
        auth: AuthContext,
        payload: RetainExperiencePayload,
        background_tasks: BackgroundTasks | None = None,
    ) -> None:
        async def _retain() -> None:
            try:
                await self._client.retain_experience(
                    user_id=str(auth.user_id),
                    payload={
                        "title": payload.title,
                        "summary": payload.summary,
                        "tags": payload.tags,
                        "evidence_url": payload.evidence_url,
                        "captured_at": datetime.utcnow().isoformat(),
                        "source": "neurocareer-agent",
                    },
                )
            except MemoryUnavailableError as exc:
                self._log.warning("memory.retain_experience_failed", user_id=auth.user_id, error=str(exc))

        if background_tasks:
            background_tasks.add_task(_retain)
        else:
            await _retain()

    async def retain_skill_observations(
        self,
        session: AsyncSession,
        auth: AuthContext,
        observations: Sequence[SkillObservation],
    ) -> None:
        user_id = auth.user_id
        self._log.info("memory.retain_skill_observations.start", user_id=user_id, count=len(observations))
        
        # Store in database - deduplicate by skill name
        skill_map = {}
        for obs in observations:
            skill_lower = obs.skill.lower()
            if skill_lower not in skill_map:
                skill_map[skill_lower] = obs
        
        self._log.info("memory.retain_skill_observations.deduped", user_id=user_id, count=len(skill_map))
        
        # Fetch all existing skills for fuzzy matching
        existing_result = await session.execute(
            select(UserSkill).where(UserSkill.user_id == user_id)
        )
        existing_skills = existing_result.scalars().all()
        
        for obs in skill_map.values():
            # Check if skill already exists (case-insensitive exact match)
            exact_match = await session.execute(
                select(UserSkill).where(
                    (UserSkill.user_id == user_id) & 
                    (func.lower(UserSkill.skill) == obs.skill.lower())
                )
            )
            existing_skill = exact_match.scalar_one_or_none()
            
            # If no exact match, check for fuzzy match (80%+ similarity)
            if not existing_skill:
                for skill in existing_skills:
                    similarity = difflib.SequenceMatcher(
                        None,
                        obs.skill.lower(),
                        skill.skill.lower()
                    ).ratio()
                    if similarity >= 0.8:  # 80% match threshold
                        existing_skill = skill
                        self._log.info("memory.retain_skill_observations.fuzzy_match", 
                                      skill=obs.skill, matched_skill=skill.skill, similarity=similarity, user_id=user_id)
                        break
            
            if existing_skill:
                # Update existing skill with higher confidence
                self._log.info("memory.retain_skill_observations.updating", skill=obs.skill, user_id=user_id)
                existing_skill.level = obs.level
                existing_skill.confidence = max(existing_skill.confidence, obs.confidence)
                existing_skill.notes = obs.notes
            else:
                # Create new skill
                self._log.info("memory.retain_skill_observations.creating", skill=obs.skill, user_id=user_id)
                skill = UserSkill(
                    user_id=user_id,
                    skill=obs.skill,
                    level=obs.level,
                    confidence=obs.confidence,
                    notes=obs.notes,
                )
                session.add(skill)
        
        try:
            await session.commit()
            self._log.info("memory.retain_skill_observations.committed", user_id=user_id)
        except (SQLAlchemyError, OSError) as exc:
            self._log.warning("database.retain_skill_failed", user_id=auth.user_id, error=str(exc))
            await session.rollback()
        
        # Also retain in Hindsight (for rich recall later)
        payload = [
            {
                k: v
                for k, v in {
                    "skill": obs.skill,
                    "level": obs.level,
                    "confidence": obs.confidence,
                    "notes": obs.notes,
                    "captured_at": datetime.utcnow().isoformat(),
                }.items()
                if v is not None
            }
            for obs in skill_map.values()
        ]
        try:
            await self._client.retain_observations(user_id=str(auth.user_id), observations=payload)
        except MemoryUnavailableError as exc:
            self._log.warning("memory.retain_observations_failed", user_id=auth.user_id, error=str(exc))

    async def fetch_skill_tree(self, session: AsyncSession, auth: AuthContext) -> SkillTreeResponse:
        try:
            user_id = auth.user_id
            result = await session.execute(
                select(UserSkill)
                .where(UserSkill.user_id == user_id)
                .order_by(UserSkill.confidence.desc(), UserSkill.updated_at.desc())
            )
            all_skills = result.scalars().all()
        except (SQLAlchemyError, OSError) as exc:
            self._log.warning("database.fetch_skills_failed", user_id=auth.user_id, error=str(exc))
            return SkillTreeResponse(
                nodes=[],
                readiness_summary="No skill data yet. Upload a resume or log a project to populate this map.",
            )

        # Filter: keep high-priority skills, high-confidence ones, and limit to top 8
        high_priority_skills = {
            "python", "javascript", "typescript", "java", "c++", "go", "rust",
            "react", "vue", "angular", "next.js", "svelte",
            "fastapi", "django", "flask", "express", "spring", "rails",
            "postgres", "mysql", "mongodb", "dynamodb", "redis", "elasticsearch",
            "docker", "kubernetes", "aws", "gcp", "azure",
            "git", "ci/cd",
            "machine learning", "deep learning", "nlp", "computer vision",
            "android", "ios", "flutter", "embedded systems", "iot",
        }
        
        filtered = []
        for skill in all_skills:
            skill_lower = skill.skill.lower()
            # Include if: high-priority skill OR high-confidence (0.6+) OR advanced/expert level
            if (
                skill_lower in high_priority_skills
                or skill.confidence >= 0.6
                or skill.level in {"advanced", "expert"}
            ):
                filtered.append(skill)
            if len(filtered) >= 8:
                break

        nodes = [
            SkillTreeNode(
                id=skill.skill.lower().replace(" ", "_"),
                label=skill.skill,
                progress=self._level_to_progress(skill.level),
                role_alignment={},
            )
            for skill in filtered
        ]

        summary = (
            f"You have mastered {len(nodes)} core skills in your career journey."
            if nodes
            else "No skill data yet. Upload a resume or log a project to populate this map."
        )
        return SkillTreeResponse(nodes=nodes, readiness_summary=summary)

    @staticmethod
    def _level_to_progress(level: str) -> float:
        mapping = {"beginner": 0.25, "intermediate": 0.6, "advanced": 0.8, "expert": 0.95}
        return mapping.get(level.lower(), 0.3)

    def _build_skill_nodes(self, items: Sequence[dict[str, object]]) -> list[SkillTreeNode]:
        nodes: list[SkillTreeNode] = []
        
        for item in items:
            data = item
            if isinstance(item, dict) and isinstance(item.get("metadata"), dict):
                data = item["metadata"]
            
            # Try to extract from content string like "Skill: python | Level: intermediate | Confidence: 0.8"
            content = str(item.get("content") or data.get("content") or "").strip()
            
            name = str(
                data.get("label") or data.get("skill") or data.get("name") or data.get("title") or ""
            ).strip()
            
            if not name and content:
                # Parse from content string
                parts = content.split("|")
                for part in parts:
                    if "Skill:" in part:
                        name = part.replace("Skill:", "").strip()
                        break
            
            if not name:
                continue
            
            progress = self._progress_from_item(data if isinstance(data, dict) else item)
            nodes.append(
                SkillTreeNode(
                    id=str(item.get("id") or name.lower().replace(" ", "_")),
                    label=name,
                    progress=progress,
                    role_alignment=data.get("role_alignment") or {},
                )
            )
        return nodes

    @staticmethod
    def _progress_from_item(item: dict[str, object]) -> float:
        if "metadata" in item and isinstance(item.get("metadata"), dict):
            item = item["metadata"]  # type: ignore[assignment]
        if "progress" in item and item.get("progress") is not None:
            return float(item["progress"])  # type: ignore[arg-type]
        if "confidence" in item and item.get("confidence") is not None:
            return float(item["confidence"])  # type: ignore[arg-type]
        level = str(item.get("level") or "").lower()
        mapping = {"beginner": 0.25, "intermediate": 0.5, "advanced": 0.75, "expert": 0.9}
        return mapping.get(level, 0.35)

    async def log_application(
        self,
        session: AsyncSession,
        auth: AuthContext,
        company: str,
        role: str,
        status: str,
        job_description: str | None,
        notes: str | None,
    ) -> ApplicationLog | None:
        application: ApplicationLog | None = None
        try:
            user_id = auth.user_id
            application = ApplicationLog(
                user_id=user_id,
                company=company,
                role=role,
                status=status,
                job_description=job_description,
                notes=notes,
            )
            session.add(application)
            await session.commit()
            await session.refresh(application)
        except (SQLAlchemyError, OSError) as exc:
            self._log.warning("database.application_log_failed", user_id=auth.user_id, error=str(exc))

        try:
            await self._client.retain_experience(
                str(auth.user_id),
                {
                    "title": f"Applied to {role} @ {company}",
                    "summary": notes or job_description or f"Status: {status}",
                    "tags": ["application", status],
                },
            )
        except MemoryUnavailableError as exc:
            self._log.warning("memory.retain_application_failed", user_id=auth.user_id, error=str(exc))
        if job_description:
            try:
                await self._client.retain_observations(
                    str(auth.user_id),
                    [
                        {
                            "skill": "job_requirements",
                            "notes": job_description,
                            "level": "advanced",
                            "confidence": 0.4,
                        }
                    ],
                )
            except MemoryUnavailableError as exc:
                self._log.warning(
                    "memory.retain_observations_failed",
                    user_id=auth.user_id,
                    error=str(exc),
                    context="application_log",
                )

        return application

    async def fetch_ghosting_insights(self, auth: AuthContext) -> ApplicationInsightsResponse:
        try:
            raw = await self._client.recall(
                str(auth.user_id),
                query="applications",
                options={"view": "applications", "filter": {"status": "rejected"}, "limit": 10},
            )
        except MemoryUnavailableError:
            message = self._fallback_message([])
            return ApplicationInsightsResponse(
                insights=[
                    ApplicationInsight(
                        message=message,
                        blockers=["Long-term memory unavailable"],
                        recommended_actions=["Log another application update so I can learn from it."],
                    )
                ]
            )

        insights: list[ApplicationInsight] = []
        for item in raw.get("items") or raw.get("memories") or raw.get("results") or []:
            data = item
            if isinstance(item, dict) and isinstance(item.get("metadata"), dict):
                data = item["metadata"]
            blockers = data.get("missing_skills") or data.get("blockers") or []
            actions = data.get("recommended_actions") or data.get("actions") or []
            insights.append(
                ApplicationInsight(
                    application_id=item.get("id"),
                    message=(
                        data.get("summary")
                        or data.get("content")
                        or data.get("text")
                        or data.get("notes")
                        or item.get("content")
                        or ""
                    ),
                    blockers=blockers,
                    recommended_actions=actions,
                )
            )
        return ApplicationInsightsResponse(insights=insights)

    async def clear_user_memory(self, session: AsyncSession, auth: AuthContext) -> None:
        try:
            await self._client.wipe_bank(str(auth.user_id))
        except MemoryUnavailableError as exc:
            self._log.warning("memory.wipe_failed", user_id=auth.user_id, error=str(exc))

        try:
            user_id = auth.user_id
            await session.execute(delete(ApplicationLog).where(ApplicationLog.user_id == user_id))
            await session.execute(delete(ReflectionRecord).where(ReflectionRecord.user_id == user_id))
            await session.commit()
        except (SQLAlchemyError, OSError) as exc:
            self._log.warning("database.clear_memory_failed", user_id=auth.user_id, error=str(exc))

    async def record_reflection(
        self,
        session: AsyncSession,
        user_id: int,
        suggestion: str,
        kind: str,
        metadata: dict | None = None,
    ) -> ReflectionRecord:
        record = ReflectionRecord(user_id=user_id, suggestion=suggestion, kind=kind, payload=metadata)
        session.add(record)
        await session.commit()
        await session.refresh(record)
        return record

    async def latest_reflection(self, session: AsyncSession, user_id: int) -> ReflectionRecord | None:
        result = await session.execute(
            select(ReflectionRecord)
            .where(ReflectionRecord.user_id == user_id, ReflectionRecord.kind == "daily")
            .order_by(ReflectionRecord.created_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    def fallback_agent_reply(self, request: AgentChatRequest) -> str:
        return self._fallback_message(request.messages)

    def _fallback_message(self, messages: Sequence[Message]) -> str:
        last_user_message = next((m.content for m in reversed(messages) if m.role == "user"), "your last update")
        return (
            "I'm having trouble accessing my long-term memory right now, "
            f"but based on {last_user_message!r}, I recommend identifying a concrete skill gap and logging a new project. "
            "Once memory is back online we can connect it to your internship targets."
        )

    async def career_growth_suggestion(
        self, user_id: int, session: AsyncSession | None = None
    ) -> CareerGrowthSuggestion:
        query = (
            "Review the user's experiences, projects, and observations. "
            "Return one actionable suggestion that either highlights a missing skill "
            "or proposes an improvement to an existing project that will increase internship readiness."
        )
        try:
            reflection = await self._client.reflect(str(user_id), query=query, lookback_days=3)
        except MemoryUnavailableError:
            if session:
                llm_fallback = await self._fallback_llm_suggestion(user_id, session)
                if llm_fallback:
                    return llm_fallback
            return CareerGrowthSuggestion(
                suggestion="Daily reflection unavailable until memory sync returns. Focus on logging one new project insight today.",
                missing_skill=None,
                recommended_action="Document a recent learning sprint so I can reconnect it later.",
            )

        payload = reflection if isinstance(reflection, dict) else {}
        return CareerGrowthSuggestion(
            suggestion=payload.get("suggestion") or payload.get("summary") or "Continue iterating on your current roadmap.",
            missing_skill=payload.get("missing_skill"),
            recommended_action=payload.get("recommended_action"),
        )

    async def _fallback_llm_suggestion(
        self, user_id: int, session: AsyncSession
    ) -> CareerGrowthSuggestion | None:
        try:
            result = await session.execute(select(User).where(User.id == user_id))
            user = result.scalar_one_or_none()
            if not user:
                return None

            apps = await session.execute(
                select(ApplicationLog)
                .where(ApplicationLog.user_id == user.id)
                .order_by(ApplicationLog.created_at.desc())
                .limit(5)
            )
            rows = apps.scalars().all()
            context = "\n".join(
                f"- {row.company} | {row.role} | {row.status} | {row.job_description or row.notes or ''}".strip()
                for row in rows
            )
            prompt = (
                "You are an AI career mentor. Use the user's recent application log to produce one actionable suggestion. "
                "Return JSON with keys: suggestion, missing_skill, recommended_action. "
                f"Recent applications:\n{context or 'No recent applications logged.'}"
            )
            payload = {
                "model": settings.groq_model,
                "messages": [
                    {"role": "system", "content": "Respond with JSON only."},
                    {"role": "user", "content": prompt},
                ],
            }
            async with httpx.AsyncClient(timeout=settings.groq_timeout_seconds) as client:
                response = await client.post(
                    f"{settings.groq_base_url}/chat/completions",
                    headers={"Authorization": f"Bearer {settings.groq_api_key}"},
                    json=payload,
                )
                response.raise_for_status()
                data = response.json()
            content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
            cleaned = re.sub(r"<think>.*?</think>", "", content, flags=re.DOTALL | re.IGNORECASE).strip()
            match = re.search(r"\{.*\}", cleaned, flags=re.DOTALL)
            candidate = match.group() if match else cleaned
            try:
                parsed = json.loads(candidate)
                return CareerGrowthSuggestion(
                    suggestion=parsed.get("suggestion") or cleaned,
                    missing_skill=parsed.get("missing_skill"),
                    recommended_action=parsed.get("recommended_action"),
                )
            except json.JSONDecodeError:
                return CareerGrowthSuggestion(suggestion=cleaned, missing_skill=None, recommended_action=None)
        except Exception as exc:  # pragma: no cover
            self._log.warning("memory.fallback_llm_failed", user_id=user_id, error=str(exc))
            return None
