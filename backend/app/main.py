from __future__ import annotations

from contextlib import asynccontextmanager

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import api_router
from app.core.config import settings
from app.core.logging import configure_logging
from app.db.session import init_database
from app.services import HindsightMemoryClient, MemoryService, ReflectionService

configure_logging()

hindsight_client = HindsightMemoryClient()
memory_service = MemoryService(hindsight_client)
scheduler = AsyncIOScheduler(timezone=settings.scheduler_timezone)
reflection_service = ReflectionService(scheduler, memory_service)


@asynccontextmanager
async def lifespan(application: FastAPI):
    try:
        print("=== STARTUP: Initializing database ===")
        await init_database()
        print("=== STARTUP: Database initialized successfully ===")
    except Exception as e:
        print(f"=== STARTUP ERROR: Database initialization failed: {e} ===")
        # Continue anyway - routes may still work if fallbacks exist
    
    try:
        reflection_service.start()
        print("=== STARTUP: Reflection service started ===")
    except Exception as e:
        print(f"=== STARTUP: Reflection service failed to start: {e} ===")
    
    application.state.memory_service = memory_service
    application.state.reflection_service = reflection_service
    print("=== STARTUP: Application state configured ===")
    print("=== STARTUP: Backend ready to receive requests ===")
    
    try:
        yield
    finally:
        if scheduler.running:
            scheduler.shutdown(wait=False)
        await hindsight_client.aclose()


app = FastAPI(
    title=settings.app_name,
    version=settings.api_version,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_origins),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.api_prefix)


@app.get("/")
async def index() -> dict[str, str]:
    return {"message": "NeuroCareer AI backend is running."}
