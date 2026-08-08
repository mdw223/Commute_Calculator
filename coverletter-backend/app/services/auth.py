from datetime import datetime, timedelta, timezone
from uuid import UUID

from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models import User

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
    picture_url: str | None,
) -> User:
    user = await get_user_by_google_sub(db, google_sub)
    if user:
        user.email = email
        user.name = name
        user.picture_url = picture_url
    else:
        user = User(
            google_sub=google_sub,
            email=email,
            name=name,
            picture_url=picture_url,
            full_name=name,
        )
        db.add(user)
    await db.commit()
    await db.refresh(user)
    return user
