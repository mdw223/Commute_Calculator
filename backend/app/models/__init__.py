import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class JobStatus(str, enum.Enum):
    NEW = "new"
    CONSIDERING = "considering"
    DISMISSED = "dismissed"
    EXPIRED = "expired"


class CalendarEventStatus(str, enum.Enum):
    TENTATIVE = "tentative"
    CONFIRMED = "confirmed"


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    google_sub: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    google_refresh_token_encrypted: Mapped[str | None] = mapped_column(Text, nullable=True)
    cost_settings: Mapped[dict] = mapped_column(JSONB, default=dict)
    default_job_pay: Mapped[float] = mapped_column(Float, default=20.0)
    travel_buffer_minutes: Mapped[int] = mapped_column(Integer, default=30)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    jobs: Mapped[list["Job"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class Job(Base):
    __tablename__ = "jobs"
    __table_args__ = (UniqueConstraint("user_id", "gmail_message_id", name="uq_user_gmail_message"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), index=True)
    gmail_message_id: Mapped[str] = mapped_column(String(512))
    sweeps_job_id: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    category: Mapped[str | None] = mapped_column(String(255), nullable=True)
    details: Mapped[str | None] = mapped_column(Text, nullable=True)
    sweepers_requested: Mapped[int | None] = mapped_column(Integer, nullable=True)
    street: Mapped[str | None] = mapped_column(String(512), nullable=True)
    city_state: Mapped[str | None] = mapped_column(String(255), nullable=True)
    zip_code: Mapped[str | None] = mapped_column(String(20), nullable=True)
    full_address: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    lng: Mapped[float | None] = mapped_column(Float, nullable=True)
    start_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    duration_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    flexible_time: Mapped[bool] = mapped_column(default=False)
    job_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    subject: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[JobStatus] = mapped_column(Enum(JobStatus), default=JobStatus.NEW, index=True)
    pay_amount: Mapped[float | None] = mapped_column(Float, nullable=True)
    drive_distance_miles: Mapped[float | None] = mapped_column(Float, nullable=True)
    drive_duration_minutes: Mapped[float | None] = mapped_column(Float, nullable=True)
    gas_cost: Mapped[float | None] = mapped_column(Float, nullable=True)
    worth_it_mood: Mapped[str | None] = mapped_column(String(16), nullable=True)
    parsed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped["User"] = relationship(back_populates="jobs")
    calendar_links: Mapped[list["CalendarLink"]] = relationship(
        back_populates="job", cascade="all, delete-orphan"
    )


class CalendarLink(Base):
    __tablename__ = "calendar_links"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("jobs.id"), index=True)
    google_event_id: Mapped[str] = mapped_column(String(512))
    event_status: Mapped[CalendarEventStatus] = mapped_column(
        Enum(CalendarEventStatus), default=CalendarEventStatus.TENTATIVE
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    job: Mapped["Job"] = relationship(back_populates="calendar_links")
