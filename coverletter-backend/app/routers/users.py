from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models import User
from app.rate_limit import limiter, user_or_ip_key
from app.schemas import UserOut, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserOut)
@limiter.limit("120/minute", key_func=user_or_ip_key)
async def get_profile(request: Request, user: User = Depends(get_current_user)):
    return user


@router.patch("/me", response_model=UserOut)
@limiter.limit("60/minute", key_func=user_or_ip_key)
async def update_profile(
    request: Request,
    body: UserUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if body.full_name is not None:
        user.full_name = body.full_name
    if body.phone is not None:
        user.phone = body.phone
    if body.location is not None:
        user.location = body.location
    if body.profile_notes is not None:
        user.profile_notes = body.profile_notes
    await db.commit()
    await db.refresh(user)
    return user
