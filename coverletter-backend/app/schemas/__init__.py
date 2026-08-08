from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel


class UserOut(BaseModel):
    id: UUID
    email: str
    name: str | None
    picture_url: str | None
    full_name: str | None
    phone: str | None
    location: str | None
    profile_notes: str | None
    plan: str

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    full_name: str | None = None
    phone: str | None = None
    location: str | None = None
    profile_notes: str | None = None


class DocumentStatusEnum(str, Enum):
    PROCESSING = "processing"
    READY = "ready"
    FAILED = "failed"


class DocumentOut(BaseModel):
    id: UUID
    kind: str
    filename: str
    content_type: str
    size_bytes: int
    status: DocumentStatusEnum
    error_message: str | None
    is_default: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class DocumentUpdate(BaseModel):
    is_default: bool | None = None


class MessageRoleEnum(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class MessageOut(BaseModel):
    id: UUID
    role: MessageRoleEnum
    content: str
    cover_letter_id: UUID | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ConversationStatusEnum(str, Enum):
    ACTIVE = "active"
    COMPLETED = "completed"


class ConversationOut(BaseModel):
    id: UUID
    title: str
    job_description: str | None
    status: ConversationStatusEnum
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ConversationDetailOut(ConversationOut):
    messages: list[MessageOut] = []


class ConversationCreate(BaseModel):
    job_description: str | None = None
    title: str | None = None


class MessageCreate(BaseModel):
    content: str


class CoverLetterOut(BaseModel):
    id: UUID
    conversation_id: UUID | None
    company_name: str | None
    job_title: str | None
    template_key: str
    filename: str
    created_at: datetime

    model_config = {"from_attributes": True}


class SendMessageResponse(BaseModel):
    messages: list[MessageOut]
    cover_letter: CoverLetterOut | None = None


class ConversationCreateResponse(BaseModel):
    conversation: ConversationOut
    messages: list[MessageOut]
    cover_letter: CoverLetterOut | None = None
