from __future__ import annotations

import io
import json
import re
from textwrap import shorten
from typing import Any
import structlog

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pypdf import PdfReader

from app.agents import CareerAgentManager
from app.api.dependencies import RequireAuth, get_memory_service
from app.db.session import get_session
from app.core.security import AuthContext
from app.db.models import ResumeAnalysis
from app.schemas import AgentChatRequest, Message, ResumeUploadResponse, SkillObservation
from app.services.memory import MemoryService
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()
logger = structlog.get_logger(__name__)

SKILL_LIBRARY: dict[str, tuple[str, ...]] = {
    "python": ("python",),
    "fastapi": ("fastapi",),
    "django": ("django",),
    "flask": ("flask",),
    "typescript": ("typescript", "ts"),
    "javascript": ("javascript", "js"),
    "react": ("react", "next.js", "nextjs"),
    "node": ("node", "node.js", "nodejs"),
    "postgres": ("postgres", "postgresql"),
    "mysql": ("mysql",),
    "mongodb": ("mongodb", "mongo"),
    "graphql": ("graphql",),
    "docker": ("docker",),
    "kubernetes": ("kubernetes", "k8s"),
    "aws": ("aws", "amazon web services"),
    "azure": ("azure",),
    "gcp": ("gcp", "google cloud"),
    "ml": ("machine learning", "ml"),
    "nlp": ("nlp", "natural language"),
    "data engineering": ("data engineering", "etl"),
    "ci/cd": ("ci/cd", "cicd", "continuous integration"),
}

# Keywords that indicate skill mastery level in resume context
EXPERT_INDICATORS = {"led", "architected", "designed", "spearheaded", "optimized", "deployed", "built", "developed", "implemented"}
INTERMEDIATE_INDICATORS = {"worked with", "collaborated", "assisted", "helped", "supported", "used", "learned"}
BEGINNER_INDICATORS = {"familiar with", "basic", "introductory", "beginner", "learning"}

CORE_GAP_CHECKLIST = [
    "python",
    "fastapi",
    "react",
    "typescript",
    "postgres",
    "docker",
    "aws",
    "ml",
    "data engineering",
]


def _detect_skill_level_in_resume(skill: str, resume_text: str) -> tuple[str, float]:
    """
    Detect skill level and confidence from resume context.
    Returns (level, confidence) tuple.
    """
    resume_lower = resume_text.lower()
    skill_lower = skill.lower()
    
    # Find context around the skill mention
    skill_contexts = []
    idx = 0
    while True:
        idx = resume_lower.find(skill_lower, idx)
        if idx == -1:
            break
        # Get 100 characters before and after for context
        start = max(0, idx - 100)
        end = min(len(resume_lower), idx + 100)
        context = resume_lower[start:end]
        skill_contexts.append(context)
        idx += 1
    
    if not skill_contexts:
        return ("intermediate", 0.6)
    
    # Analyze all contexts
    expert_count = 0
    intermediate_count = 0
    beginner_count = 0
    
    for context in skill_contexts:
        # Check for expert indicators
        if any(indicator in context for indicator in EXPERT_INDICATORS):
            expert_count += 1
        # Check for beginner indicators
        elif any(indicator in context for indicator in BEGINNER_INDICATORS):
            beginner_count += 1
        # Default to intermediate
        else:
            intermediate_count += 1
    
    # Determine level based on frequency
    total = expert_count + intermediate_count + beginner_count
    expert_ratio = expert_count / total if total > 0 else 0
    beginner_ratio = beginner_count / total if total > 0 else 0
    
    # Decision logic
    if expert_ratio >= 0.5:  # 50%+ expert mentions
        return ("advanced", 0.85)
    elif expert_ratio >= 0.3:  # 30%+ expert mentions
        return ("advanced", 0.75)
    elif beginner_ratio >= 0.7:  # 70%+ beginner mentions
        return ("beginner", 0.4)
    else:
        # Default based on total mentions (more mentions = higher confidence)
        confidence = min(0.9, 0.5 + (len(skill_contexts) * 0.1))
        return ("intermediate", confidence)


@router.get("", response_model=ResumeUploadResponse | None)
async def get_latest_resume(
    auth: AuthContext = RequireAuth,
    session: AsyncSession = Depends(get_session),
) -> ResumeUploadResponse | None:
    """Fetch the latest resume analysis for the user."""
    profile = await session.execute(
        select(ResumeAnalysis)
        .where(ResumeAnalysis.user_id == auth.user_id)
        .order_by(ResumeAnalysis.created_at.desc())
        .limit(1)
    )
    latest = profile.scalars().first()
    if not latest:
        return None
    
    return ResumeUploadResponse(
        retained_skills=latest.retained_skills,
        summary=latest.summary,
        missing_skills=latest.missing_skills,
        recommended_actions=latest.recommended_actions,
    )


@router.post("/upload", response_model=ResumeUploadResponse)
async def upload_resume(
    file: UploadFile = File(...),
    auth: AuthContext = RequireAuth,
    memory_service: MemoryService = Depends(get_memory_service),
    session: AsyncSession = Depends(get_session),
) -> ResumeUploadResponse:
    if file.content_type not in {"application/pdf", "application/octet-stream"}:
        raise HTTPException(status_code=400, detail="Only PDF resumes are supported right now.")

    content = await file.read()
    try:
        reader = PdfReader(io.BytesIO(content))
        text = "\n".join(page.extract_text() or "" for page in reader.pages)
    except Exception as exc:  # pragma: no cover - pdf parsing edge cases
        raise HTTPException(status_code=400, detail=f"Resume parsing failed: {exc}") from exc

    manager = CareerAgentManager(memory_service)
    try:
        agent_response = await manager.run(
            auth,
            AgentChatRequest(
                mode="resume_worker",
                messages=[
                    Message(
                        role="system",
                        content=(
                            "Analyze the resume FOCUSING on projects, internships, and training attended. "
                            "Extract ONLY skills demonstrated through actual work/learning, NOT from 'Skills' sections. "
                            "Return STRICT JSON with keys: summary (professional overview, max 100 words), "
                            "skills (array of skills proven by projects/internships/training, lowercase), "
                            "missing_skills (array of common industry skills not mentioned), "
                            "recommended_actions (array of next steps to strengthen profile). "
                            "Do not include generic or unproven skills."
                        ),
                    ),
                    Message(role="user", content=f"<resume>\n{text[:12000]}\n</resume>"),
                ],
            ),
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Resume analysis failed: {exc}") from exc

    parsed = _normalize_resume_payload(agent_response.reply, text)
    retained_skills = parsed.get("skills", [])
    
    logger.info("resume.upload.parsed", retained_skills=retained_skills, user_id=auth.user_id)
    
    # IMPORTANT: If AI didn't extract skills, force extraction from resume using SKILL_LIBRARY
    if not retained_skills:
        logger.info("resume.upload.no_ai_skills_fallback", user_id=auth.user_id)
        lower_resume = text.lower()
        detected_skills = set()
        for canonical, aliases in SKILL_LIBRARY.items():
            if any(alias in lower_resume for alias in aliases):
                detected_skills.add(canonical)
        retained_skills = sorted(detected_skills)
        logger.info("resume.upload.fallback_detected", detected_skills=retained_skills, user_id=auth.user_id)
    
    logger.info("resume.upload.final_skills", skills=retained_skills, count=len(retained_skills), user_id=auth.user_id)
    
    # Detect skill levels intelligently from resume context
    observations = []
    for skill in retained_skills:
        level, confidence = _detect_skill_level_in_resume(skill, text)
        observations.append(
            SkillObservation(skill=skill, level=level, confidence=confidence, notes="Detected from resume context")
        )
        logger.info("resume.upload.skill_level_detected", skill=skill, level=level, confidence=confidence, user_id=auth.user_id)
    
    if observations:
        logger.info("resume.upload.saving_observations", count=len(observations), user_id=auth.user_id)
        await memory_service.retain_skill_observations(session, auth, observations)
        logger.info("resume.upload.observations_saved", user_id=auth.user_id)

    summary = parsed.get("summary") or agent_response.reply
    missing_skills = parsed.get("missing_skills", [])
    recommended_actions = parsed.get("recommended_actions", [])
    
    # Store resume analysis in database
    profile = await memory_service.ensure_profile(session, auth)
    resume_analysis = ResumeAnalysis(
        user_id=profile.id,
        summary=summary,
        retained_skills=retained_skills,
        missing_skills=missing_skills,
        recommended_actions=recommended_actions,
    )
    session.add(resume_analysis)
    try:
        await session.commit()
    except Exception:
        await session.rollback()
    
    return ResumeUploadResponse(
        retained_skills=retained_skills,
        summary=summary,
        missing_skills=missing_skills,
        recommended_actions=recommended_actions,
    )


def _parse_resume_response(payload: str) -> dict[str, Any]:
    try:
        return json.loads(payload)
    except json.JSONDecodeError:
        # Try to extract JSON block from text
        match = re.search(r"\{.*\}", payload, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                pass
        
        # If JSON parsing completely fails, return empty but with the full response as summary
        # The _normalize_resume_payload will use _ensure_skills fallback to extract from resume text
        return {
            "summary": payload,
            "skills": [],  # Empty - will be populated by _ensure_skills fallback
            "missing_skills": [],
            "recommended_actions": []
        }


def _normalize_resume_payload(payload: str, resume_text: str) -> dict[str, Any]:
    parsed = _parse_resume_response(payload)
    summary = _ensure_summary(parsed.get("summary"), resume_text)
    skills = _ensure_skills(parsed.get("skills"), resume_text)
    missing_skills = _ensure_missing_skills(parsed.get("missing_skills"), skills)
    recommended_actions = parsed.get("recommended_actions") or _suggest_actions(missing_skills)
    return {
        "summary": summary,
        "skills": skills,
        "missing_skills": missing_skills,
        "recommended_actions": recommended_actions,
    }


def _ensure_summary(summary: str | None, resume_text: str) -> str:
    if summary:
        return summary.strip()
    cleaned = " ".join(resume_text.split())
    sentences = re.split(r"(?<=[.!?])\s+", cleaned)
    candidate = " ".join(sentences[:2]).strip() or cleaned[:400]
    return shorten(candidate, width=400, placeholder="...")


def _ensure_skills(raw_skills: Any, resume_text: str) -> list[str]:
    normalized = []
    if isinstance(raw_skills, list):
        normalized = [str(skill).lower().strip() for skill in raw_skills if str(skill).strip()]

    if normalized:
        return sorted(dict.fromkeys(normalized))

    detected = set()
    lower_resume = resume_text.lower()
    for canonical, aliases in SKILL_LIBRARY.items():
        if any(alias in lower_resume for alias in aliases):
            detected.add(canonical)
    return sorted(detected)


def _ensure_missing_skills(raw_missing: Any, existing_skills: list[str]) -> list[str]:
    if isinstance(raw_missing, list) and raw_missing:
        cleaned = [str(skill).lower().strip() for skill in raw_missing if str(skill).strip()]
        if cleaned:
            return cleaned

    existing = set(existing_skills)
    inferred = [skill for skill in CORE_GAP_CHECKLIST if skill not in existing]
    return inferred[:5]


def _suggest_actions(missing_skills: list[str]) -> list[str]:
    if not missing_skills:
        return [
            "Document a quantifiable impact metric for each project and push it to GitHub.",
            "Schedule a weekly reflection to update your Skill Tree with recent learnings.",
        ]
    return [
        f"Build a weekend project that spotlights {skill} and log it via the Skill Evolution dashboard."
        for skill in missing_skills[:3]
    ]
