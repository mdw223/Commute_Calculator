from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models import CoverLetter, User
from app.rate_limit import limiter, user_or_ip_key
from app.schemas import CoverLetterOut
from app.services.storage import generate_presigned_url

router = APIRouter(prefix="/cover-letters", tags=["cover-letters"])


@router.get("", response_model=list[CoverLetterOut])
@limiter.limit("120/minute", key_func=user_or_ip_key)
async def list_cover_letters(
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(CoverLetter).where(CoverLetter.user_id == user.id).order_by(CoverLetter.created_at.desc())
    )
    return result.scalars().all()


@router.get("/{cover_letter_id}/download")
@limiter.limit("60/minute", key_func=user_or_ip_key)
async def download_cover_letter(
    request: Request,
    cover_letter_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(CoverLetter).where(CoverLetter.id == cover_letter_id, CoverLetter.user_id == user.id)
    )
    cover_letter = result.scalar_one_or_none()
    if not cover_letter:
        raise HTTPException(status_code=404, detail="Cover letter not found")
    url = generate_presigned_url(cover_letter.r2_key, filename=cover_letter.filename)
    return {"url": url}
