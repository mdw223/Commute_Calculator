"""slowapi limiter and key functions."""

from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.config import settings
from app.services.auth import decode_access_token

limiter = Limiter(
    key_func=get_remote_address,
    enabled=settings.rate_limit_enabled,
    storage_uri="memory://",
)


def user_or_ip_key(request: Request) -> str:
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        try:
            payload = decode_access_token(auth[7:])
            sub = payload.get("sub")
            if sub:
                return str(sub)
        except ValueError:
            pass
    return get_remote_address(request)
