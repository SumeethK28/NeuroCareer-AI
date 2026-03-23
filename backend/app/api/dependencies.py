from __future__ import annotations

import os
from typing import Annotated

import jwt
from fastapi import Cookie, Depends, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import AuthContext
from app.db.session import get_session
from app.services.memory import MemoryService
from app.services.hindsight_client import HindsightMemoryClient

JWT_SECRET = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"


def verify_token(authorization: Annotated[str | None, Header()] = None) -> dict:
    """Verify JWT token from Authorization header only."""
    print(f"DEBUG verify_token: authorization header = {authorization}")
    
    token = None
    
    if authorization:
        parts = authorization.split(" ")
        if len(parts) == 2 and parts[0].lower() == "bearer":
            token = parts[1]
            print(f"DEBUG: Extracted token from header")
    
    if not token:
        print(f"DEBUG: No token found, raising 401")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated - provide Authorization header",
        )
    
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        print(f"DEBUG: Token decoded successfully")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired",
        )
    except jwt.InvalidTokenError as e:
        print(f"DEBUG: Invalid token: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}",
        )


def get_auth_context(payload: dict = Depends(verify_token)) -> AuthContext:
    """Extract auth context from JWT payload."""
    user_id = payload.get("user_id")
    email = payload.get("email")
    
    if not user_id or not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: missing required claims",
        )
    
    return AuthContext(
        user_id=user_id,
        email=email,
    )


RequireAuth = Depends(get_auth_context)


def get_memory_service() -> MemoryService:
    """Get memory service instance."""
    client = HindsightMemoryClient()
    return MemoryService(client)


def get_reflection_service():
    """Get reflection service instance from app state."""
    from app.services.reflection import ReflectionService
    return ReflectionService


async def get_db_session() -> AsyncSession:
    """Get database session."""
    async for session in get_session():
        yield session