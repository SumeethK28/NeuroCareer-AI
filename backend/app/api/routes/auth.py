from __future__ import annotations

import os
from datetime import datetime, timedelta
from typing import Any

import bcrypt
import jwt
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import AuthContext
from app.db.models import User
from app.db.session import get_session
from app.api.dependencies import get_auth_context
from app.schemas import LoginRequest, SignupRequest, TokenResponse, UserResponse

router = APIRouter()

JWT_SECRET = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = int(os.getenv("JWT_EXPIRY_HOURS", "24"))


def hash_password(password: str) -> str:
    """Hash password using bcrypt."""
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hash."""
    return bcrypt.checkpw(plain_password.encode(), hashed_password.encode())


def create_token(user_id: int, email: str) -> str:
    """Create JWT token."""
    payload = {
        "user_id": user_id,
        "email": email,
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRY_HOURS),
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


@router.post("/signup", response_model=TokenResponse)
async def signup(
    request: SignupRequest,
    session: AsyncSession = Depends(get_session),
) -> TokenResponse:
    """Create a new user account."""
    # Validate display name
    if not request.display_name or len(request.display_name.strip()) == 0:
        raise HTTPException(status_code=422, detail="Display name is required")
    
    # Validate email format
    if "@" not in request.email or "." not in request.email:
        raise HTTPException(status_code=422, detail="Invalid email format")
    
    # Validate password strength
    if len(request.password) < 8:
        raise HTTPException(status_code=422, detail="Password must be at least 8 characters")
    
    # Check if user already exists
    existing = await session.execute(
        select(User).where(User.email == request.email.lower())
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email already registered")
    
    # Create new user
    user = User(
        email=request.email.lower(),
        password_hash=hash_password(request.password),
        display_name=request.display_name or request.email.split("@")[0],
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    
    token = create_token(user.id, user.email)
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse(
            id=user.id,
            email=user.email,
            display_name=user.display_name,
        ),
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    request: LoginRequest,
    session: AsyncSession = Depends(get_session),
) -> TokenResponse:
    """Login user with email and password."""
    # Find user by email
    result = await session.execute(
        select(User).where(User.email == request.email.lower())
    )
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = create_token(user.id, user.email)
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse(
            id=user.id,
            email=user.email,
            display_name=user.display_name,
        ),
    )


@router.get("/me", response_model=UserResponse)
async def get_me(
    auth: AuthContext = Depends(get_auth_context),
    session: AsyncSession = Depends(get_session),
) -> UserResponse:
    """Get current user info."""
    result = await session.execute(
        select(User).where(User.id == auth.user_id)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserResponse(
        id=user.id,
        email=user.email,
        display_name=user.display_name,
    )


@router.post("/logout")
async def logout() -> dict[str, str]:
    """Logout user (frontend should clear cookie)."""
    return {"message": "Logged out successfully"}