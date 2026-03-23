from __future__ import annotations

class MemoryServiceError(RuntimeError):
    """Raised when Hindsight operations fail."""


class MemoryUnavailableError(MemoryServiceError):
    """Raised when long-term memory cannot be reached."""


class LLMServiceError(RuntimeError):
    """Raised when the Groq LLM fails."""


class ToolFallbackError(RuntimeError):
    """Raised when a tool execution fails even after retries."""
