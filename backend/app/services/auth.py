from datetime import datetime, timedelta, timezone
from uuid import UUID

from google.auth.exceptions import RefreshError
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models import User
from app.services.encryption import decrypt_token, encrypt_token

ALGORITHM = "HS256"


def create_access_token(user_id: UUID, email: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    payload = {"sub": str(user_id), "email": email, "exp": expire}
    return jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
    except JWTError as e:
        raise ValueError("Invalid token") from e


async def get_user_by_id(db: AsyncSession, user_id: UUID) -> User | None:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def get_user_by_google_sub(db: AsyncSession, google_sub: str) -> User | None:
    result = await db.execute(select(User).where(User.google_sub == google_sub))
    return result.scalar_one_or_none()


async def upsert_google_user(
    db: AsyncSession,
    *,
    google_sub: str,
    email: str,
    name: str | None,
    refresh_token: str,
) -> User:
    user = await get_user_by_google_sub(db, google_sub)
    encrypted = encrypt_token(refresh_token)
    if user:
        user.email = email
        user.name = name
        user.google_refresh_token_encrypted = encrypted
    else:
        user = User(
            google_sub=google_sub,
            email=email,
            name=name,
            google_refresh_token_encrypted=encrypted,
            cost_settings={
                "gasPricePerGallon": 3.5,
                "mpg": 25.0,
                "includeMaintenance": False,
                "maintenancePerMile": 0.1,
                "includeTimeValue": False,
                "hourlyRate": 20.0,
                "includeHourlySalary": False,
                "hourlySalary": 25.0,
                "roundTrip": True,
                "frequency": {"count": 1, "unit": "day"},
            },
        )
        db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


def get_user_refresh_token(user: User) -> str | None:
    if not user.google_refresh_token_encrypted:
        return None
    return decrypt_token(user.google_refresh_token_encrypted)


def refresh_google_credentials(refresh_token: str) -> Credentials:
    """Refresh access token using the scopes granted at sign-in.

    Do not pass scopes here — requesting scopes that differ from the original
    OAuth grant causes Google to return invalid_scope.
    """
    creds = Credentials(
        token=None,
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=settings.google_client_id,
        client_secret=settings.google_client_secret,
    )
    creds.refresh(Request())
    return creds
