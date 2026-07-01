import base64
import logging
from datetime import datetime, timezone

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models import Job, JobStatus, User
from app.parsers.sweeps import parse_sweeps_email
from app.services.auth import get_user_refresh_token
from app.services.geocode import geocode_address

logger = logging.getLogger(__name__)

SWEEPS_LABEL = "Sweeps"
PROCESSED_LABEL = "Sweeps/Processed"


def _build_gmail_service(refresh_token: str):
    creds = Credentials(
        token=None,
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=settings.google_client_id,
        client_secret=settings.google_client_secret,
        scopes=settings.google_scopes,
    )
    creds.refresh(Request())
    return build("gmail", "v1", credentials=creds, cache_discovery=False)


def _get_or_create_label(service, name: str) -> str:
    labels = service.users().labels().list(userId="me").execute().get("labels", [])
    for label in labels:
        if label["name"] == name:
            return label["id"]
    created = (
        service.users()
        .labels()
        .create(
            userId="me",
            body={
                "name": name,
                "labelListVisibility": "labelShow",
                "messageListVisibility": "show",
            },
        )
        .execute()
    )
    return created["id"]


def _get_label_id_by_name(service, name: str) -> str | None:
    labels = service.users().labels().list(userId="me").execute().get("labels", [])
    for label in labels:
        if label["name"] == name:
            return label["id"]
    return None


async def ingest_message(
    db: AsyncSession,
    user: User,
    msg_id: str,
    service,
    sweeps_label_id: str,
    processed_label_id: str,
) -> Job | None:
    existing = await db.execute(
        select(Job).where(
            Job.user_id == user.id,
            Job.gmail_message_id == msg_id,
        )
    )
    if existing.scalar_one_or_none():
        return None

    raw = (
        service.users()
        .messages()
        .get(userId="me", id=msg_id, format="raw")
        .execute()
    )
    raw_bytes = base64.urlsafe_b64decode(raw["raw"])
    parsed = parse_sweeps_email(raw_bytes)

    lat, lng = None, None
    if parsed.full_address:
        coords = await geocode_address(parsed.full_address)
        if coords:
            lat, lng = coords

    job = Job(
        user_id=user.id,
        gmail_message_id=msg_id,
        sweeps_job_id=parsed.sweeps_job_id,
        category=parsed.category,
        details=parsed.details,
        sweepers_requested=parsed.sweepers_requested,
        street=parsed.street,
        city_state=parsed.city_state,
        zip_code=parsed.zip_code,
        full_address=parsed.full_address,
        lat=lat,
        lng=lng,
        start_at=parsed.start_at.replace(tzinfo=timezone.utc) if parsed.start_at else None,
        duration_minutes=parsed.duration_minutes,
        flexible_time=parsed.flexible_time,
        job_url=parsed.job_url,
        subject=parsed.subject,
        status=JobStatus.NEW,
        pay_amount=user.default_job_pay,
        expires_at=parsed.start_at.replace(tzinfo=timezone.utc) if parsed.start_at else None,
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    service.users().messages().modify(
        userId="me",
        id=msg_id,
        body={
            "removeLabelIds": [sweeps_label_id],
            "addLabelIds": [processed_label_id],
        },
    ).execute()

    logger.info("Ingested job %s for user %s", job.id, user.email)
    return job


async def poll_user_gmail(db: AsyncSession, user: User) -> int:
    refresh_token = get_user_refresh_token(user)
    if not refresh_token:
        return 0

    try:
        service = _build_gmail_service(refresh_token)
    except Exception as e:
        logger.error("Gmail auth failed for %s: %s", user.email, e)
        return 0

    sweeps_label_id = _get_label_id_by_name(service, SWEEPS_LABEL)
    if not sweeps_label_id:
        logger.debug("No Sweeps label for %s", user.email)
        return 0

    processed_label_id = _get_or_create_label(service, PROCESSED_LABEL)

    results = (
        service.users()
        .messages()
        .list(userId="me", labelIds=[sweeps_label_id], maxResults=20)
        .execute()
    )
    messages = results.get("messages", [])
    count = 0
    for msg in messages:
        try:
            job = await ingest_message(
                db, user, msg["id"], service, sweeps_label_id, processed_label_id
            )
            if job:
                count += 1
        except Exception as e:
            logger.error("Failed to ingest message %s: %s", msg["id"], e)
    return count


async def poll_all_users(db: AsyncSession) -> None:
    result = await db.execute(
        select(User).where(User.google_refresh_token_encrypted.isnot(None))
    )
    users = result.scalars().all()
    for user in users:
        await poll_user_gmail(db, user)


async def expire_old_jobs(db: AsyncSession) -> int:
    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(Job).where(
            Job.status.in_([JobStatus.NEW, JobStatus.CONSIDERING]),
            Job.start_at.isnot(None),
            Job.start_at < now,
        )
    )
    jobs = result.scalars().all()
    for job in jobs:
        job.status = JobStatus.EXPIRED
    await db.commit()
    return len(jobs)
