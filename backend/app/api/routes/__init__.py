from fastapi import APIRouter

from . import applications, memory, skills, agent, resume, auth  # Add auth

router = APIRouter()

router.include_router(auth.router, prefix="/auth", tags=["auth"])
router.include_router(applications.router, prefix="/applications", tags=["applications"])
router.include_router(memory.router, prefix="/memory", tags=["memory"])
router.include_router(skills.router, prefix="/skills", tags=["skills"])
router.include_router(agent.router, prefix="/agent", tags=["agent"])
router.include_router(resume.router, prefix="/resume", tags=["resume"])