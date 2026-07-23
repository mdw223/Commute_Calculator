import logging
from datetime import datetime, timedelta, timezone

from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from app.config import settings
from app.models import Job, User
from app.services.auth import get_user_refresh_token, refresh_google_credentials

logger = logging.getLogger(__name__)


def _build_calendar_service(refresh_token: str):
    creds = refresh_google_credentials(refresh_token)
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


def _list_calendar_ids(service, user_email: str) -> list[str]:
    try:
        calendar_ids: list[str] = []
        page_token = None
        while True:
            result = service.calendarList().list(pageToken=page_token).execute()
            for entry in result.get("items", []):
                if entry.get("deleted") or entry.get("accessRole") == "none":
                    continue
                calendar_ids.append(entry["id"])
            page_token = result.get("nextPageToken")
            if not page_token:
                break
        return calendar_ids
    except HttpError as e:
        if e.resp.status == 403:
            logger.warning(
                "Calendar list unavailable for %s (missing calendar.readonly scope); "
                "using primary calendar only — sign out and back in to fix",
                user_email,
            )
            return ["primary"]
        raise


def _fetch_events_from_calendar(
    service,
    calendar_id: str,
    time_min: datetime,
    time_max: datetime,
) -> list[dict]:
    events: list[dict] = []
    page_token = None
    while True:
        result = (
            service.events()
            .list(
                calendarId=calendar_id,
                timeMin=time_min.isoformat(),
                timeMax=time_max.isoformat(),
                singleEvents=True,
                orderBy="startTime",
                pageToken=page_token,
            )
            .execute()
        )
        events.extend(result.get("items", []))
        page_token = result.get("nextPageToken")
        if not page_token:
            break
    return events


def _dedupe_events(events: list[dict]) -> list[dict]:
    seen: set[str] = set()
    unique: list[dict] = []
    for event in events:
        key = event.get("iCalUID") or event.get("id")
        if not key or key in seen:
            continue
        seen.add(key)
        unique.append(event)
    return unique


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
        calendar_ids = _list_calendar_ids(service, user.email) or ["primary"]
        all_events: list[dict] = []
        for calendar_id in calendar_ids:
            try:
                all_events.extend(
                    _fetch_events_from_calendar(service, calendar_id, time_min, time_max)
                )
            except Exception as e:
                logger.warning(
                    "Failed to fetch events from calendar %s for %s: %s",
                    calendar_id,
                    user.email,
                    e,
                )
        deduped = _dedupe_events(all_events)
        deduped.sort(key=lambda e: _parse_event_datetime(e)[0])
        return deduped
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
            f"Pay: ${job.pay_amount or user.default_job_pay:.0f}/hr\n"
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
