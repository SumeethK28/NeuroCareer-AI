from dataclasses import dataclass


@dataclass
class AuthContext:
    """Authentication context extracted from JWT token."""
    user_id: int
    email: str