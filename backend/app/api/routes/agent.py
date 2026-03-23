from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from app.agents import CareerAgentManager
from app.api.dependencies import RequireAuth, get_memory_service
from app.core.errors import LLMServiceError, MemoryUnavailableError, ToolFallbackError
from app.core.security import AuthContext
from app.schemas import AgentChatRequest, AgentChatResponse
from app.services.memory import MemoryService

router = APIRouter()


@router.post("/chat", response_model=AgentChatResponse)
async def agent_chat(
    payload: AgentChatRequest,
    auth: AuthContext = RequireAuth,
    memory_service: MemoryService = Depends(get_memory_service),
) -> AgentChatResponse:
    """
    Agent chat endpoint for Career Chat, Mock Interview, and Resume Analysis.
    
    Modes:
    - advisor: Career guidance and skill analysis
    - mock_interview: Simulated job interview
    - resume_worker: Resume parsing and analysis
    """
    manager = CareerAgentManager(memory_service)
    try:
        response = await manager.run(auth, payload)
        return response
    except ToolFallbackError as exc:
        # If tool calling fails, use fallback response
        fallback_reply = memory_service.fallback_agent_reply(payload)
        return AgentChatResponse(
            reply=fallback_reply,
            metadata={"source": "fallback", "error": str(exc)},
            fallback_used=True,
        )
    except LLMServiceError as exc:
        # Groq service error - return helpful message
        if "Rate limited" in str(exc):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Groq is rate-limited. Please try again in a moment."
            ) from exc
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"AI service temporarily unavailable: {exc}"
        ) from exc
    except MemoryUnavailableError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Career memory service is temporarily unavailable"
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error during agent execution: {str(exc)[:100]}"
        ) from exc
