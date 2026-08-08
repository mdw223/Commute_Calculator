"""Ties together: chat history -> Gemini -> (optional) docx generation + R2 upload."""

import logging
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Conversation, ConversationStatus, CoverLetter, Document, Message, MessageRole, User
from app.services import docgen
from app.services.gemini import run_chat_turn
from app.services.storage import build_object_key, upload_bytes

logger = logging.getLogger(__name__)

MAX_HISTORY_MESSAGES = 40


@dataclass
class TurnOutcome:
    new_messages: list[Message]
    cover_letter: CoverLetter | None


async def build_profile_context(db: AsyncSession, user: User) -> str:
    result = await db.execute(
        select(Document).where(Document.user_id == user.id, Document.is_default.is_(True))
    )
    docs = result.scalars().all()

    sections = []
    if user.profile_notes:
        sections.append(f"About the candidate (notes they provided):\n{user.profile_notes}")
    for doc in docs:
        if doc.extracted_text:
            sections.append(f"Resume ({doc.filename}):\n{doc.extracted_text}")

    if user.full_name:
        sections.insert(0, f"Full name: {user.full_name}")

    return "\n\n".join(sections)


def _history_for_gemini(messages: list[Message]) -> list[dict]:
    role_map = {MessageRole.USER: "user", MessageRole.ASSISTANT: "model"}
    history = []
    for m in messages[-MAX_HISTORY_MESSAGES:]:
        role = role_map.get(m.role)
        if role is None:
            continue
        history.append({"role": role, "text": m.content})
    return history


def _compose_letter_text(content: dict) -> str:
    parts = [content.get("opening_paragraph", "")]
    parts.extend(content.get("body_paragraphs") or [])
    parts.append(content.get("closing_paragraph", ""))
    return "\n\n".join(p for p in parts if p)


async def run_turn(db: AsyncSession, user: User, conversation: Conversation) -> TurnOutcome:
    profile_context = await build_profile_context(db, user)
    history = _history_for_gemini(conversation.messages)

    result = run_chat_turn(profile_context=profile_context, history=history)

    new_messages: list[Message] = []
    cover_letter: CoverLetter | None = None

    if result.function_call:
        content = result.function_call
        full_name = user.full_name or user.name or user.email
        docx_bytes = docgen.render_cover_letter_docx(
            content=content,
            full_name=full_name,
            email=user.email,
            phone=user.phone,
            location=user.location,
        )
        filename = docgen.build_filename(content.get("company_name"), content.get("job_title"))
        r2_key = build_object_key(user.id, "cover-letters", filename)
        upload_bytes(
            r2_key,
            docx_bytes,
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        )

        cover_letter = CoverLetter(
            user_id=user.id,
            conversation_id=conversation.id,
            company_name=content.get("company_name"),
            job_title=content.get("job_title"),
            filename=filename,
            r2_key=r2_key,
            content=content,
        )
        db.add(cover_letter)
        await db.flush()

        if content.get("company_name") or content.get("job_title"):
            title_bits = [b for b in [content.get("job_title"), content.get("company_name")] if b]
            conversation.title = " at ".join(title_bits) if len(title_bits) == 2 else title_bits[0]
        conversation.status = ConversationStatus.COMPLETED

        assistant_message = Message(
            conversation_id=conversation.id,
            role=MessageRole.ASSISTANT,
            content=(
                f"Here's your cover letter for the {content.get('job_title', 'role')} position "
                f"at {content.get('company_name', 'this company')}:\n\n"
                f"{_compose_letter_text(content)}"
            ),
            cover_letter_id=cover_letter.id,
        )
    else:
        assistant_message = Message(
            conversation_id=conversation.id,
            role=MessageRole.ASSISTANT,
            content=result.text or "Sorry, something went wrong generating a response.",
        )

    db.add(assistant_message)
    await db.commit()
    await db.refresh(assistant_message)
    new_messages.append(assistant_message)
    if cover_letter:
        await db.refresh(cover_letter)

    return TurnOutcome(new_messages=new_messages, cover_letter=cover_letter)
