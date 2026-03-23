from __future__ import annotations

from datetime import datetime
from typing import Any, Literal, Sequence

from pydantic import BaseModel, Field


class Message(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str


class AgentChatRequest(BaseModel):
    mode: Literal["advisor", "mock_interview", "resume_worker"] = "advisor"
    messages: Sequence[Message]
    context_hints: list[str] | None = None


class AgentChatResponse(BaseModel):
    reply: str
    metadata: dict[str, Any] = Field(default_factory=dict)
    fallback_used: bool = False


class RetainExperiencePayload(BaseModel):
    title: str
    summary: str
    tags: list[str] = Field(default_factory=list)
    evidence_url: str | None = None


class SkillObservation(BaseModel):
    skill: str
    level: Literal["beginner", "intermediate", "advanced", "expert"]
    confidence: float = Field(ge=0, le=1)
    notes: str | None = None


class SkillTreeNode(BaseModel):
    id: str
    label: str
    progress: float = Field(ge=0, le=1)
    role_alignment: dict[str, float] = Field(default_factory=dict)


class SkillTreeResponse(BaseModel):
    nodes: list[SkillTreeNode]
    readiness_summary: str


class ApplicationLogRequest(BaseModel):
    company: str
    role: str
    status: Literal["applied", "interview", "offer", "rejected", "ghosted"] = "applied"
    job_description: str | None = None
    notes: str | None = None


class ApplicationInsight(BaseModel):
    application_id: int | str | None = None
    message: str
    blockers: list[str] = Field(default_factory=list)
    recommended_actions: list[str] = Field(default_factory=list)


class ApplicationInsightsResponse(BaseModel):
    insights: list[ApplicationInsight]


class ApplicationLogItem(BaseModel):
    id: int
    company: str
    role: str
    status: str
    applied_at: datetime
    job_description: str | None = None
    notes: str | None = None


class ApplicationLogResponse(BaseModel):
    applications: list[ApplicationLogItem]


class ResumeUploadResponse(BaseModel):
    retained_skills: list[str]
    summary: str
    missing_skills: list[str] = Field(default_factory=list)
    recommended_actions: list[str] = Field(default_factory=list)


class ReflectionResponse(BaseModel):
    timestamp: datetime
    suggestion: str
    metadata: dict[str, Any] | None = None


class ClearMemoryResponse(BaseModel):
    message: str


class CareerGrowthSuggestion(BaseModel):
    suggestion: str
    missing_skill: str | None = None
    recommended_action: str | None = None


class SignupRequest(BaseModel):
    email: str
    password: str
    display_name: str | None = None


class LoginRequest(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: int
    email: str
    display_name: str | None = None


class AuthResponse(BaseModel):
    token: str
    user: UserResponse


class Reflection(BaseModel):
    id: int | None = None
    kind: str | None = None
    suggestion: str
    timestamp: datetime | None = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

