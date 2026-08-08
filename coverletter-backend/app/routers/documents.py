import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models import Document, DocumentStatus, User
from app.rate_limit import limiter, user_or_ip_key
from app.schemas import DocumentOut, DocumentUpdate
from app.services.extraction import SUPPORTED_CONTENT_TYPES, ExtractionError, extract_text
from app.services.storage import build_object_key, delete_object, generate_presigned_url, upload_bytes

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/documents", tags=["documents"])


@router.get("", response_model=list[DocumentOut])
@limiter.limit("120/minute", key_func=user_or_ip_key)
async def list_documents(
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Document).where(Document.user_id == user.id).order_by(Document.created_at.desc())
    )
    return result.scalars().all()


@router.post("", response_model=DocumentOut)
@limiter.limit("20/hour", key_func=user_or_ip_key)
async def upload_document(
    request: Request,
    file: UploadFile,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    data = await file.read()
    if len(data) > settings.max_upload_size_bytes:
        raise HTTPException(status_code=413, detail="File too large (max 10MB)")
    if not data:
        raise HTTPException(status_code=400, detail="Empty file")

    content_type = file.content_type or "application/octet-stream"
    if content_type not in SUPPORTED_CONTENT_TYPES and not any(
        (file.filename or "").lower().endswith(ext) for ext in (".pdf", ".docx", ".txt")
    ):
        raise HTTPException(
            status_code=400, detail="Unsupported file type. Upload a PDF, DOCX, or TXT file."
        )

    r2_key = build_object_key(user.id, "resumes", file.filename or "resume")
    upload_bytes(r2_key, data, content_type)

    document = Document(
        user_id=user.id,
        kind="resume",
        filename=file.filename or "resume",
        content_type=content_type,
        size_bytes=len(data),
        r2_key=r2_key,
        status=DocumentStatus.PROCESSING,
    )

    try:
        text = extract_text(file.filename or "resume", content_type, data)
        document.extracted_text = text
        document.status = DocumentStatus.READY
    except ExtractionError as e:
        document.status = DocumentStatus.FAILED
        document.error_message = str(e)

    # First uploaded document (or first ready one) becomes the default
    # auto-attached resume so new users don't have to configure anything.
    existing_count = await db.scalar(
        select(Document.id).where(Document.user_id == user.id).limit(1)
    )
    if existing_count is None and document.status == DocumentStatus.READY:
        document.is_default = True

    db.add(document)
    await db.commit()
    await db.refresh(document)
    return document


@router.patch("/{document_id}", response_model=DocumentOut)
@limiter.limit("60/minute", key_func=user_or_ip_key)
async def update_document(
    request: Request,
    document_id: UUID,
    body: DocumentUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    document = await _get_user_document(db, user, document_id)
    if body.is_default is True:
        if document.status != DocumentStatus.READY:
            raise HTTPException(status_code=400, detail="Only successfully processed documents can be attached")
        # Only one default resume auto-attaches per user for now.
        await db.execute(
            update(Document).where(Document.user_id == user.id).values(is_default=False)
        )
        document.is_default = True
    elif body.is_default is False:
        document.is_default = False

    await db.commit()
    await db.refresh(document)
    return document


@router.get("/{document_id}/download")
@limiter.limit("60/minute", key_func=user_or_ip_key)
async def download_document(
    request: Request,
    document_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    document = await _get_user_document(db, user, document_id)
    url = generate_presigned_url(document.r2_key, filename=document.filename)
    return {"url": url}


@router.delete("/{document_id}", status_code=204)
@limiter.limit("60/minute", key_func=user_or_ip_key)
async def delete_document(
    request: Request,
    document_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    document = await _get_user_document(db, user, document_id)
    try:
        delete_object(document.r2_key)
    except Exception:
        logger.exception("Failed to delete R2 object %s", document.r2_key)
    await db.delete(document)
    await db.commit()


async def _get_user_document(db: AsyncSession, user: User, document_id: UUID) -> Document:
    result = await db.execute(
        select(Document).where(Document.id == document_id, Document.user_id == user.id)
    )
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    return document
