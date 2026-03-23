"""FastAPI routers."""

from fastapi import APIRouter

from app.api.routes import agent, applications, auth, health, memory, resume, skills, settings

api_router = APIRouter()
api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(agent.router, prefix="/agent", tags=["agent"])
api_router.include_router(applications.router, prefix="/applications", tags=["applications"])
api_router.include_router(memory.router, prefix="/memory", tags=["memory"])
api_router.include_router(skills.router, prefix="/skills", tags=["skills"])
api_router.include_router(resume.router, prefix="/resume", tags=["resume"])
api_router.include_router(settings.router, prefix="/settings", tags=["settings"])

__all__ = ["api_router"]
