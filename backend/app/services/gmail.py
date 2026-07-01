import base64
import logging
from dataclasses import dataclass
from datetime import datetime, timezone

from google.auth.exceptions import RefreshError
from googleapiclient.discovery import build
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Job, JobStatus, User
from app.parsers.sweeps import parse_sweeps_email
from app.services.auth import get_user_refresh_token, refresh_google_credentials
from app.services.geocode import geocode_address

logger = logging.getLogger(__name__)

SWEEPS_LABEL = "Sweeps"


@dataclass(frozen=True)
class GmailPollResult:
    ingested: int
    label_found: bool
    needs_reauth: bool = False


def _build_gmail_service(refresh_token: str):
    creds = refresh_google_credentials(refresh_token)
    return build("gmail", "v1", credentials=creds, cache_discovery=False)


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

    logger.info("Ingested job %s for user %s", job.id, user.email)
    return job


async def poll_user_gmail(db: AsyncSession, user: User) -> GmailPollResult:
    refresh_token = get_user_refresh_token(user)
    if not refresh_token:
        return GmailPollResult(ingested=0, label_found=False)

    try:
        service = _build_gmail_service(refresh_token)
    except RefreshError as e:
        logger.error("Gmail auth failed for %s: %s", user.email, e)
        return GmailPollResult(ingested=0, label_found=False, needs_reauth=True)
    except Exception as e:
        logger.error("Gmail auth failed for %s: %s", user.email, e)
        return GmailPollResult(ingested=0, label_found=False)

    sweeps_label_id = _get_label_id_by_name(service, SWEEPS_LABEL)
    if not sweeps_label_id:
        logger.debug("No Sweeps label for %s", user.email)
        return GmailPollResult(ingested=0, label_found=False)

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
            job = await ingest_message(db, user, msg["id"], service)
            if job:
                count += 1
        except Exception as e:
            logger.error("Failed to ingest message %s: %s", msg["id"], e)
    return GmailPollResult(ingested=count, label_found=True)


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
