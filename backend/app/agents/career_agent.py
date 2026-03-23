from __future__ import annotations

import re
from types import SimpleNamespace
from typing import Any, Sequence

import httpx
from pydantic import BaseModel

from app.core.config import settings
from app.core.errors import LLMServiceError, ToolFallbackError
from app.core.security import AuthContext
from app.schemas import AgentChatRequest, AgentChatResponse, RetainExperiencePayload
from app.services.memory import MemoryService

try:  # pragma: no cover - optional during type checking
    from pydantic_ai import Agent, RunContext, tool
    from pydantic_ai.exceptions import ToolCallingError
    from pydantic_ai.models.openai import OpenAIModel
    HAS_PYDANTIC_AI = True
except Exception:  # pragma: no cover
    Agent = None  # type: ignore[assignment]
    ToolCallingError = Exception  # type: ignore
    HAS_PYDANTIC_AI = False

    def tool(func):  # type: ignore
        return func


class RetainProjectInput(BaseModel):
    title: str
    summary: str
    tags: list[str]
    evidence_url: str | None = None


class CareerAgentManager:
    """Coordinates PydanticAI agents (advisor + mock interview + resume worker)."""

    def __init__(self, memory_service: MemoryService):
        self._memory_service = memory_service
        self._advisor_agent = self._build_agent(mode="advisor")
        self._mock_agent = self._build_agent(mode="mock_interview")
        self._resume_agent = self._build_agent(mode="resume_worker")

    def _build_agent(self, mode: str):
        if not HAS_PYDANTIC_AI:
            return SimpleGroqAgent(mode=mode)

        model = OpenAIModel(
            model=settings.groq_model,
            api_key=settings.groq_api_key,
            base_url=str(settings.groq_base_url),
            timeout=settings.groq_timeout_seconds,
        )

        @tool
        async def retain_project(ctx: RunContext, data: RetainProjectInput) -> str:
            auth: AuthContext = ctx.user_data["auth"]
            await self._memory_service.retain_project_experience(
                auth,
                payload=RetainExperiencePayload(**data.model_dump()),
                background_tasks=None,
            )
            return "Project retained to long-term memory."

        @tool
        async def reflect(ctx: RunContext) -> str:
            auth: AuthContext = ctx.user_data["auth"]
            suggestion = await self._memory_service.career_growth_suggestion(auth.user_id)
            return suggestion.suggestion

        system_prompt = self._system_prompt(mode)
        return Agent(model=model, system_prompt=system_prompt, tools=[retain_project, reflect])

    def _system_prompt(self, mode: str) -> str:
        base_prompt = (
            "You are NeuroCareer, an AI career mentor with persistent Hindsight memory. "
            "You have access to the user's complete career journey: skills, projects, internship applications, and learning history. "
            "Provide thoughtful, actionable guidance that references their specific experiences. "
            "Be conversational but professional. Ask clarifying questions when needed. "
            "Use the provided tools to save important information for future reference."
        )
        
        if mode == "mock_interview":
            return (
                base_prompt
                + "\n\nMOCK INTERVIEW MODE:\n"
                + "- Conduct a realistic technical or behavioral interview.\n"
                + "- Reference the user's real projects and skills from their history.\n"
                + "- Start with medium difficulty questions based on their skill level.\n"
                + "- If they answer well, increase difficulty. If they struggle, offer hints.\n"
                + "- Ask follow-up questions about their implementation decisions.\n"
                + "- Provide feedback after each answer.\n"
                + "- For technical questions, ask about edge cases, optimization, and trade-offs.\n"
                + "- End with a brief assessment of their performance."
            )
        
        if mode == "resume_worker":
            return (
                base_prompt
                + "\n\nRESUME ANALYSIS MODE:\n"
                + "- Extract technical skills demonstrated through actual projects and internships.\n"
                + "- Identify quantifiable achievements (metrics, impact, scale).\n"
                + "- Map extracted skills to industry-standard categories.\n"
                + "- Suggest missing skills based on their target roles.\n"
                + "- Provide actionable next steps for skill development.\n"
                + "- Format output as structured JSON when requested."
            )
        
        return (
            base_prompt
            + "\n\nCAREER CHAT MODE:\n"
            + "- Provide personalized resume feedback based on their actual experience.\n"
            + "- Conduct skill-gap analysis for target roles.\n"
            + "- Recommend internship opportunities that match their profile.\n"
            + "- Offer strategies for improving applications and interview performance.\n"
            + "- Reference their specific projects and achievements.\n"
            + "- Suggest career pivots based on their skills and interests.\n"
            + "- Be proactive in identifying skill gaps and growth opportunities."
        )

    async def run(self, auth: AuthContext, request: AgentChatRequest) -> AgentChatResponse:
        agent = self._select_agent(request.mode)
        
        # Enhance transcript with user context
        user_context = await self._build_user_context(auth)
        transcript = self._format_transcript(request.messages)
        
        # Inject context hints into the prompt
        context_prefix = f"USER CONTEXT:\n{user_context}\n\n" if user_context else ""
        enhanced_transcript = context_prefix + transcript

        run_method = getattr(agent, "run_async", None)
        kwargs = {"user_data": {"auth": auth, "hints": request.context_hints}}
        try:
            if run_method:
                result = await run_method(enhanced_transcript, **kwargs)
            else:
                result = await agent.run(enhanced_transcript, **kwargs)  # type: ignore[attr-defined]
            metadata: dict[str, Any] = {}
            if hasattr(result, "model_dump"):
                metadata = result.model_dump()
            elif hasattr(result, "dict"):
                metadata = result.dict()
            
            # Clean response of internal reasoning tags
            reply = str(getattr(result, "output_text", result))
            reply = self._clean_response(reply)
            
            return AgentChatResponse(reply=reply, metadata=metadata)
        except ToolCallingError as exc:
            raise ToolFallbackError(str(exc)) from exc
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code == 429:
                raise LLMServiceError("Rate limited by Groq") from exc
            if exc.response.status_code >= 500:
                raise LLMServiceError(f"Groq service error: {exc.response.status_code}") from exc
            raise LLMServiceError(f"Groq request failed: {exc.response.status_code}") from exc
        except Exception as exc:  # pragma: no cover
            raise LLMServiceError(f"Agent execution failed: {str(exc)[:100]}") from exc
    
    def _clean_response(self, text: str) -> str:
        """Remove internal reasoning tags like <think> from response."""
        # Remove <think>...</think> tags
        text = re.sub(r'<think>.*?</think>', '', text, flags=re.DOTALL)
        # Remove any other internal tags
        text = re.sub(r'<[a-z_]+>.*?</[a-z_]+>', '', text, flags=re.DOTALL)
        return text.strip()
    
    async def _build_user_context(self, auth: AuthContext) -> str:
        """Build context about user's skills, projects, and applications."""
        try:
            # Get user's skills from profile
            skills = await self._memory_service.get_user_profile(auth.user_id)
            skill_names = [s.name for s in (skills.skills if hasattr(skills, 'skills') else [])][:10]
            
            # Format context
            context_parts = []
            if skill_names:
                context_parts.append(f"Top Skills: {', '.join(skill_names)}")
            
            return "\n".join(context_parts) if context_parts else ""
        except Exception:
            return ""


    def _select_agent(self, mode: str):
        if mode == "mock_interview":
            return self._mock_agent
        if mode == "resume_worker":
            return self._resume_agent
        return self._advisor_agent

    def _format_transcript(self, messages: Sequence[Any]) -> str:
        return "\n".join(f"{m.role.upper()}: {m.content}" for m in messages)


class SimpleGroqAgent:
    """Fallback agent used when pydantic-ai is unavailable in the current environment."""

    def __init__(self, mode: str):
        self._mode = mode

    async def run_async(self, transcript: str, user_data: dict[str, Any]) -> SimpleNamespace:
        system_prompt = self._system_prompt()
        payload = {
            "model": settings.groq_model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": transcript},
            ],
            "temperature": 0.7,
            "max_tokens": 1024,
        }
        
        try:
            async with httpx.AsyncClient(timeout=settings.groq_timeout_seconds) as client:
                response = await client.post(
                    f"{settings.groq_base_url}/chat/completions",
                    headers={"Authorization": f"Bearer {settings.groq_api_key}"},
                    json=payload,
                )
                response.raise_for_status()
                data = response.json()
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 429:
                raise LLMServiceError("Rate limited by Groq") from e
            if e.response.status_code >= 500:
                raise LLMServiceError(f"Groq service error ({e.response.status_code})") from e
            raise LLMServiceError(f"Groq request failed ({e.response.status_code})") from e
        except httpx.TimeoutException as e:
            raise LLMServiceError("Groq request timed out") from e
        except Exception as e:
            raise LLMServiceError(f"Failed to connect to Groq: {str(e)[:100]}") from e

        message = data.get("choices", [{}])[0].get("message", {}).get("content", "")
        if not message:
            message = "I couldn't generate a response. Please try again."
        
        # Remove internal reasoning tags that Groq might include
        message = self._clean_response(message)
        
        return SimpleNamespace(output_text=message, raw=data)

    def _clean_response(self, text: str) -> str:
        """Remove internal reasoning tags like <think> from response."""
        # Remove <think>...</think> tags
        text = re.sub(r'<think>.*?</think>', '', text, flags=re.DOTALL)
        # Remove any other internal tags
        text = re.sub(r'<[a-z_]+>.*?</[a-z_]+>', '', text, flags=re.DOTALL)
        return text.strip()

    async def run(self, transcript: str, user_data: dict[str, Any]) -> SimpleNamespace:
        return await self.run_async(transcript, user_data)

    def _system_prompt(self) -> str:
        base = (
            "You are NeuroCareer, a thoughtful AI career mentor with access to the user's complete career history. "
            "You understand their skills, projects, internship applications, and learning journey. "
            "Provide personalized, actionable guidance that directly references their experiences. "
            "Be conversational, encouraging, and honest about skill gaps. "
            "Ask clarifying questions to better understand their goals and context."
        )
        
        if self._mode == "mock_interview":
            return (
                base 
                + "\n\nConduct a realistic mock interview:\n"
                + "1. Start with a warm introduction and ask about their target role\n"
                + "2. Ask 3-5 questions appropriate to their skill level\n"
                + "3. Reference their actual projects when relevant\n"
                + "4. For each answer, provide specific feedback\n"
                + "5. If they struggle, offer hints and explanations\n"
                + "6. End with an overall assessment and growth areas\n"
                + "7. Keep the tone supportive and educational"
            )
        
        if self._mode == "resume_worker":
            return (
                base 
                + "\n\nAnalyze resumes and extract career insights:\n"
                + "1. Identify technical skills demonstrated through real work\n"
                + "2. Extract quantifiable achievements and impact metrics\n"
                + "3. Map skills to standard technology categories\n"
                + "4. Identify gaps between current skills and target roles\n"
                + "5. Suggest concrete next steps for skill development\n"
                + "6. Be specific and actionable in recommendations"
            )
        
        return (
            base
            + "\n\nProvide career guidance:\n"
            + "1. Give honest feedback on resume and experience\n"
            + "2. Analyze skill-to-role fit for their target positions\n"
            + "3. Identify which skills are strongest and which need work\n"
            + "4. Recommend specific projects or courses for skill gaps\n"
            + "5. Suggest interview preparation strategies\n"
            + "6. Reference their specific projects and achievements\n"
            + "7. Be encouraging while being realistic about challenges"
        )
