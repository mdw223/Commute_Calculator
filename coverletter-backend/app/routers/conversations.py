from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models import Conversation, Message, MessageRole, User
from app.rate_limit import limiter, user_or_ip_key
from app.schemas import (
    ConversationCreate,
    ConversationCreateResponse,
    ConversationDetailOut,
    ConversationOut,
    MessageCreate,
    SendMessageResponse,
)
from app.services.conversation_engine import run_turn

router = APIRouter(prefix="/conversations", tags=["conversations"])


@router.get("", response_model=list[ConversationOut])
@limiter.limit("120/minute", key_func=user_or_ip_key)
async def list_conversations(
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Conversation)
        .where(Conversation.user_id == user.id)
        .order_by(Conversation.updated_at.desc())
    )
    return result.scalars().all()


@router.post("", response_model=ConversationCreateResponse)
@limiter.limit("30/hour", key_func=user_or_ip_key)
async def create_conversation(
    request: Request,
    body: ConversationCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not settings.gemini_api_key:
        raise HTTPException(status_code=503, detail="AI provider is not configured")

    conversation = Conversation(
        user_id=user.id,
        title=body.title or "New cover letter",
        job_description=body.job_description,
    )
    db.add(conversation)
    await db.flush()

    messages: list[Message] = []
    if body.job_description:
        first_message = Message(
            conversation_id=conversation.id,
            role=MessageRole.USER,
            content=body.job_description,
        )
        db.add(first_message)
        await db.flush()
        conversation.messages.append(first_message)
        messages.append(first_message)

    await db.commit()
    await db.refresh(conversation)

    cover_letter = None
    if body.job_description:
        outcome = await run_turn(db, user, conversation)
        messages.extend(outcome.new_messages)
        cover_letter = outcome.cover_letter
        await db.refresh(conversation)

    return ConversationCreateResponse(
        conversation=ConversationOut.model_validate(conversation),
        messages=messages,
        cover_letter=cover_letter,
    )


@router.get("/{conversation_id}", response_model=ConversationDetailOut)
@limiter.limit("120/minute", key_func=user_or_ip_key)
async def get_conversation(
    request: Request,
    conversation_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    conversation = await _get_user_conversation(db, user, conversation_id)
    return conversation


@router.delete("/{conversation_id}", status_code=204)
@limiter.limit("60/minute", key_func=user_or_ip_key)
async def delete_conversation(
    request: Request,
    conversation_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    conversation = await _get_user_conversation(db, user, conversation_id)
    await db.delete(conversation)
    await db.commit()


@router.post("/{conversation_id}/messages", response_model=SendMessageResponse)
@limiter.limit("60/hour", key_func=user_or_ip_key)
async def send_message(
    request: Request,
    conversation_id: UUID,
    body: MessageCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not settings.gemini_api_key:
        raise HTTPException(status_code=503, detail="AI provider is not configured")
    if not body.content.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    conversation = await _get_user_conversation(db, user, conversation_id)

    user_message = Message(
        conversation_id=conversation.id,
        role=MessageRole.USER,
        content=body.content,
    )
    db.add(user_message)
    await db.commit()
    await db.refresh(conversation)

    outcome = await run_turn(db, user, conversation)
    return SendMessageResponse(
        messages=[user_message, *outcome.new_messages],
        cover_letter=outcome.cover_letter,
    )


async def _get_user_conversation(db: AsyncSession, user: User, conversation_id: UUID) -> Conversation:
    result = await db.execute(
        select(Conversation)
        .options(selectinload(Conversation.messages))
        .where(Conversation.id == conversation_id, Conversation.user_id == user.id)
    )
    conversation = result.scalar_one_or_none()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation
