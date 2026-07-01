import logging

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from google_auth_oauthlib.flow import Flow
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models import User
from app.oauth_state import create_oauth_state, sign_oauth_state, verify_oauth_state
from app.rate_limit import limiter, user_or_ip_key
from app.schemas import UserOut
from app.services.auth import create_access_token, upsert_google_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])

OAUTH_STATE_COOKIE = "oauth_state"


def _get_oauth_flow() -> Flow:
    client_config = {
        "web": {
            "client_id": settings.google_client_id,
            "client_secret": settings.google_client_secret,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [settings.google_redirect_uri],
        }
    }
    flow = Flow.from_client_config(
        client_config,
        scopes=settings.google_scopes,
        redirect_uri=settings.google_redirect_uri,
    )
    return flow


def _oauth_state_cookie_kwargs() -> dict:
    return {
        "httponly": True,
        "secure": settings.is_production,
        "samesite": "lax",
        "max_age": 600,
    }


@router.get("/google/login")
@limiter.limit("10/minute")
async def google_login(request: Request):
    if not settings.google_client_id:
        raise HTTPException(status_code=503, detail="Google OAuth not configured")
    flow = _get_oauth_flow()
    state = create_oauth_state()
    auth_url, _ = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
        state=state,
    )
    response = RedirectResponse(auth_url)
    response.set_cookie(
        OAUTH_STATE_COOKIE,
        sign_oauth_state(state),
        **_oauth_state_cookie_kwargs(),
    )
    return response


@router.get("/google/callback")
@limiter.limit("20/minute")
async def google_callback(
    request: Request,
    code: str,
    state: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    if not settings.google_client_id:
        raise HTTPException(status_code=503, detail="Google OAuth not configured")

    signed_state = request.cookies.get(OAUTH_STATE_COOKIE)
    if not state or not signed_state or not verify_oauth_state(signed_state, state):
        raise HTTPException(status_code=400, detail="Invalid OAuth state")

    flow = _get_oauth_flow()
    flow.fetch_token(code=code)
    creds = flow.credentials

    async with httpx.AsyncClient() as client:
        res = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {creds.token}"},
        )
        res.raise_for_status()
        info = res.json()

    if not settings.is_email_allowed(info["email"]):
        raise HTTPException(status_code=403, detail="Sign-in not allowed for this account")

    if not creds.refresh_token:
        raise HTTPException(
            status_code=400,
            detail="No refresh token received. Revoke app access and try again.",
        )

    user = await upsert_google_user(
        db,
        google_sub=info["id"],
        email=info["email"],
        name=info.get("name"),
        refresh_token=creds.refresh_token,
    )
    token = create_access_token(user.id, user.email)
    redirect_url = f"{settings.frontend_url}/sweeps/auth/callback#token={token}"
    response = RedirectResponse(redirect_url)
    response.delete_cookie(OAUTH_STATE_COOKIE)
    return response


@router.get("/me", response_model=UserOut)
@limiter.limit("120/minute", key_func=user_or_ip_key)
async def get_me(request: Request, user: User = Depends(get_current_user)):
    return user
