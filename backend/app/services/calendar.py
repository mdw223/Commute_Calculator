import logging
from datetime import datetime, timedelta, timezone

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

from app.config import settings
from app.models import Job, User
from app.services.auth import get_user_refresh_token

logger = logging.getLogger(__name__)


def _build_calendar_service(refresh_token: str):
    creds = Credentials(
        token=None,
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=settings.google_client_id,
        client_secret=settings.google_client_secret,
        scopes=settings.google_scopes,
    )
    creds.refresh(Request())
    return build("calendar", "v3", credentials=creds, cache_discovery=False)


def _parse_event_datetime(event: dict) -> tuple[datetime, datetime]:
    start = event["start"].get("dateTime") or event["start"].get("date")
    end = event["end"].get("dateTime") or event["end"].get("date")
    start_dt = datetime.fromisoformat(start.replace("Z", "+00:00"))
    end_dt = datetime.fromisoformat(end.replace("Z", "+00:00"))
    if start_dt.tzinfo is None:
        start_dt = start_dt.replace(tzinfo=timezone.utc)
    if end_dt.tzinfo is None:
        end_dt = end_dt.replace(tzinfo=timezone.utc)
    return start_dt, end_dt


async def get_calendar_events(
    user: User,
    time_min: datetime,
    time_max: datetime,
) -> list[dict]:
    refresh_token = get_user_refresh_token(user)
    if not refresh_token:
        return []
    try:
        service = _build_calendar_service(refresh_token)
        events_result = (
            service.events()
            .list(
                calendarId="primary",
                timeMin=time_min.isoformat(),
                timeMax=time_max.isoformat(),
                singleEvents=True,
                orderBy="startTime",
            )
            .execute()
        )
        return events_result.get("items", [])
    except Exception as e:
        logger.error("Calendar fetch failed for %s: %s", user.email, e)
        return []


def check_job_conflicts(
    job: Job,
    events: list[dict],
    travel_buffer_minutes: int,
) -> dict:
    if not job.start_at:
        return {
            "has_conflict": False,
            "conflicting_events": [],
            "job_window_start": None,
            "job_window_end": None,
            "travel_buffer_minutes": travel_buffer_minutes,
        }

    duration = job.duration_minutes or 180
    window_start = job.start_at - timedelta(minutes=travel_buffer_minutes)
    window_end = job.start_at + timedelta(minutes=duration)

    conflicting = []
    for event in events:
        if event.get("status") == "cancelled":
            continue
        ev_start, ev_end = _parse_event_datetime(event)
        if ev_start < window_end and ev_end > window_start:
            conflicting.append(
                {
                    "id": event["id"],
                    "summary": event.get("summary", "(No title)"),
                    "start": ev_start,
                    "end": ev_end,
                    "status": event.get("status"),
                }
            )

    return {
        "has_conflict": len(conflicting) > 0,
        "conflicting_events": conflicting,
        "job_window_start": window_start,
        "job_window_end": window_end,
        "travel_buffer_minutes": travel_buffer_minutes,
    }


async def create_tentative_event(user: User, job: Job) -> str:
    refresh_token = get_user_refresh_token(user)
    if not refresh_token:
        raise ValueError("No calendar access")
    if not job.start_at:
        raise ValueError("Job has no start time")

    service = _build_calendar_service(refresh_token)
    duration = job.duration_minutes or 180
    end_time = job.start_at + timedelta(minutes=duration)

    event_body = {
        "summary": f"[Sweeps] {job.category or 'Job'} — {job.street or job.full_address}",
        "description": (
            f"{job.details or ''}\n\n"
            f"Pay: ${job.pay_amount or user.default_job_pay:.0f}\n"
            f"{job.job_url or ''}"
        ),
        "location": job.full_address or "",
        "start": {"dateTime": job.start_at.isoformat(), "timeZone": "America/New_York"},
        "end": {"dateTime": end_time.isoformat(), "timeZone": "America/New_York"},
        "status": "tentative",
        "colorId": "5",
    }

    event = service.events().insert(calendarId="primary", body=event_body).execute()
    return event["id"]
