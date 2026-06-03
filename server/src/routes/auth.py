from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from src.data.database import get_session
from src.data.db_models import User, RefreshToken
from src.utils.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    generate_refresh_token,
    hash_refresh_token,
    get_refresh_token_expiry,
)
from src.models.auth_basemodels import (
    RegisterRequest,
    LoginRequest,
    TokenResponse,
    AccessTokenResponse,
    RefreshRequest,
    LogoutRequest,
)

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(data: RegisterRequest, session: Session = Depends(get_session)):
    existing = session.exec(select(User).where(User.email == data.email)).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered"
        )

    user = User(
        email=data.email,
        hashed_password=get_password_hash(data.password)
    )
    session.add(user)
    session.commit()
    session.refresh(user)

    return {"id": str(user.id), "email": user.email}


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.email == data.email)).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated"
        )

    access_token = create_access_token({"sub": str(user.id)})

    raw_refresh = generate_refresh_token()
    refresh_entry = RefreshToken(
        user_id=user.id,
        token_hash=hash_refresh_token(raw_refresh),
        expires_at=get_refresh_token_expiry()
    )
    session.add(refresh_entry)
    session.commit()

    return TokenResponse(access_token=access_token, refresh_token=raw_refresh)


@router.post("/refresh", response_model=AccessTokenResponse)
def refresh(data: RefreshRequest, session: Session = Depends(get_session)):
    token_hash = hash_refresh_token(data.refresh_token)

    entry = session.exec(
        select(RefreshToken).where(RefreshToken.token_hash == token_hash)
    ).first()

    if not entry:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )

    if entry.is_revoked:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has been revoked"
        )

    if entry.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has expired"
        )

    access_token = create_access_token({"sub": str(entry.user_id)})
    return AccessTokenResponse(access_token=access_token)


@router.post("/logout", status_code=status.HTTP_200_OK)
def logout(data: LogoutRequest, session: Session = Depends(get_session)):
    token_hash = hash_refresh_token(data.refresh_token)

    entry = session.exec(
        select(RefreshToken).where(RefreshToken.token_hash == token_hash)
    ).first()

    if not entry:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )

    entry.is_revoked = True
    session.add(entry)
    session.commit()

    return {"detail": "Logged out successfully"}
