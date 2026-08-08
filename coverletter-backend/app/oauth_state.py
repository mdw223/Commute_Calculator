"""Signed OAuth state cookie helpers (CSRF protection)."""

import secrets
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt

from app.config import settings

ALGORITHM = "HS256"
STATE_TTL_MINUTES = 10


def create_oauth_state() -> str:
    return secrets.token_urlsafe(32)


def sign_oauth_state(state: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=STATE_TTL_MINUTES)
    return jwt.encode({"state": state, "exp": expire}, settings.secret_key, algorithm=ALGORITHM)


def verify_oauth_state(signed_cookie: str, returned_state: str) -> bool:
    try:
        payload = jwt.decode(signed_cookie, settings.secret_key, algorithms=[ALGORITHM])
        return payload.get("state") == returned_state
    except JWTError:
        return False
