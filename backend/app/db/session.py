from __future__ import annotations

import asyncio
import ssl
from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

import structlog
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.db.base import Base


def _clean_database_url(raw_url: str) -> tuple[str, dict]:
    """Parse Neon/Postgres URL and extract asyncpg-safe connect_args."""
    try:
        parsed = urlparse(raw_url)
        
        # Ensure drivername is postgresql+asyncpg
        scheme = parsed.scheme
        if scheme in {"postgresql", "postgres"}:
            scheme = "postgresql+asyncpg"
        
        # Parse query params
        query_params = parse_qs(parsed.query)
        
        # Strip problematic params; asyncpg only accepts: ssl, timeout, command_timeout, etc.
        params_to_remove = [
            "sslmode", "pgbouncer", "channel_binding", "options",
            "application_name", "fallback_application_name",
        ]
        for param in params_to_remove:
            query_params.pop(param, None)
        
        # Rebuild URL without bad params
        clean_query = urlencode(query_params, doseq=True)
        clean_url = urlunparse((
            scheme,
            parsed.netloc,
            parsed.path,
            parsed.params,
            clean_query,
            parsed.fragment,
        ))
        
        # Setup connect_args for asyncpg
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        
        connect_args = {
            "ssl": ctx,
        }
        
        return clean_url, connect_args
    except Exception as e:
        structlog.get_logger(__name__).warning("database_url_parse_failed", error=str(e))
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        return raw_url, {"ssl": ctx}


normalized_url, connect_args = _clean_database_url(settings.database_url)
engine = create_async_engine(
    normalized_url,
    echo=settings.debug,
    connect_args=connect_args,
    pool_pre_ping=True,
    pool_recycle=3600,
)
async_session_factory = async_sessionmaker(engine, expire_on_commit=False)

_tables_ready = asyncio.Event()
_init_lock = asyncio.Lock()
_log = structlog.get_logger(__name__)


async def get_session() -> AsyncSession:
    await init_database()
    async with async_session_factory() as session:
        yield session


async def init_database(force: bool = False) -> None:
    """Ensure core tables exist; optionally propagate errors when force=True."""

    if _tables_ready.is_set() and not force:
        return

    async with _init_lock:
        if _tables_ready.is_set() and not force:
            return
        try:
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
        except Exception as exc:  # pragma: no cover - depends on runtime DB availability
            _log.warning("database.init_failed", error=str(exc))
            if force:
                raise
        else:
            _tables_ready.set()
