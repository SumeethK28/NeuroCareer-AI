from __future__ import annotations

from functools import lru_cache
from typing import List

from pydantic import AnyHttpUrl, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Centralised configuration loaded from the environment/.env file."""

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "NeuroCareer AI"
    debug: bool = False
    api_version: str = "v1"
    api_prefix: str = "/api/v1"
    cors_origins: List[AnyHttpUrl | str] = Field(
        default_factory=lambda: ["http://localhost:3000", "https://localhost:3000"]
    )
    frontend_base_url: AnyHttpUrl | str = "http://localhost:3000"

    # Groq / LLM
    groq_api_key: str = ""
    groq_model: str = "qwen/qwen3-32b"
    groq_base_url: AnyHttpUrl = "https://api.groq.com/openai/v1"  # type: ignore[assignment]
    groq_timeout_seconds: int = 60

    # Hindsight
    hindsight_api_key: str = ""
    hindsight_base_url: AnyHttpUrl = "https://api.hindsight.vectorize.io"  # type: ignore[assignment]
    hindsight_bank_id: str = ""

    # Database
    database_url: str = (
        "postgresql+asyncpg://<user>:<password>@<endpoint>.neon.tech/<database>?sslmode=require"
    )

    # Auth / security
    github_client_id: str = ""
    github_client_secret: str = ""
    jwt_secret_key: str = ""
    jwt_algorithm: str = "HS256"
    jwt_expiry_hours: int = 24
    jwt_audience: str = "neurocareer-users"
    jwt_issuer: str = "neurocareer"
    nextauth_secret: str = ""

    # Scheduler
    scheduler_timezone: str = "UTC"
    career_reflect_hour_utc: int = 5
    weekly_reflection_weekday: int = 0  # Monday

    # Feature flags
    enable_mock_interview: bool = True
    enable_resume_parsing: bool = True


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return a cached settings instance."""

    return Settings()  # type: ignore[call-arg]


settings = get_settings()
