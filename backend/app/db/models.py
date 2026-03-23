from __future__ import annotations

from datetime import datetime

from sqlalchemy import JSON, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    display_name: Mapped[str | None] = mapped_column(String(255))

    applications: Mapped[list["ApplicationLog"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    reflections: Mapped[list["ReflectionRecord"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    skills: Mapped[list["UserSkill"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    resume_analyses: Mapped[list["ResumeAnalysis"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class ApplicationLog(Base, TimestampMixin):
    __tablename__ = "application_logs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    company: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(64), default="pending")
    job_description: Mapped[str | None] = mapped_column(Text)
    notes: Mapped[str | None] = mapped_column(Text)
    skills_snapshot: Mapped[dict | None] = mapped_column(JSON)
    ghosting_risk_score: Mapped[float] = mapped_column(default=0.0)
    last_recruiter_activity: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    user: Mapped["User"] = relationship(back_populates="applications")


class ReflectionRecord(Base, TimestampMixin):
    __tablename__ = "reflection_records"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    kind: Mapped[str] = mapped_column(String(32))
    suggestion: Mapped[str] = mapped_column(Text)
    payload: Mapped[dict | None] = mapped_column(JSON)

    user: Mapped["User"] = relationship(back_populates="reflections")


class UserSkill(Base, TimestampMixin):
    __tablename__ = "user_skills"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    skill: Mapped[str] = mapped_column(String(255), index=True)
    level: Mapped[str] = mapped_column(String(64), default="intermediate")
    confidence: Mapped[float] = mapped_column(default=0.5)
    notes: Mapped[str | None] = mapped_column(Text)

    user: Mapped["User"] = relationship(back_populates="skills")


class ResumeAnalysis(Base, TimestampMixin):
    __tablename__ = "resume_analyses"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    summary: Mapped[str] = mapped_column(Text)
    retained_skills: Mapped[list[str]] = mapped_column(JSON)
    missing_skills: Mapped[list[str]] = mapped_column(JSON)
    recommended_actions: Mapped[list[str]] = mapped_column(JSON)

    user: Mapped["User"] = relationship(back_populates="resume_analyses")

