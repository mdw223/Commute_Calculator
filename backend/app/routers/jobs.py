from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies import get_current_user
from app.models import CalendarLink, Job, JobStatus, User
from app.rate_limit import limiter, user_or_ip_key
from app.schemas import (
    CalendarConflictOut,
    CalendarEventOut,
    CommuteRequest,
    CommuteResponse,
    DayPlanItem,
    DayPlanResponse,
    GmailSyncOut,
    JobOut,
    JobStatusEnum,
    JobUpdate,
    PlanRouteRequest,
    PlanRouteResponse,
    RouteLegOut,
    UserOut,
    UserUpdate,
)
from app.services.calendar import (
    check_job_conflicts,
    create_tentative_event,
    get_calendar_events,
)
from app.services.commute import compute_commute
from app.services.geocode import get_directions, meters_to_miles, seconds_to_minutes
from app.services.gmail import expire_old_jobs, poll_user_gmail
from datetime import datetime, timedelta, timezone

router = APIRouter(tags=["jobs"])


def _job_to_out(job: Job, calendar_conflict: bool | None = None) -> JobOut:
    return JobOut(
        id=job.id,
        category=job.category,
        details=job.details,
        sweepers_requested=job.sweepers_requested,
        street=job.street,
        city_state=job.city_state,
        zip_code=job.zip_code,
        full_address=job.full_address,
        lat=job.lat,
        lng=job.lng,
        start_at=job.start_at,
        duration_minutes=job.duration_minutes,
        flexible_time=job.flexible_time,
        job_url=job.job_url,
        subject=job.subject,
        status=JobStatusEnum(job.status.value),
        pay_amount=job.pay_amount,
        drive_distance_miles=job.drive_distance_miles,
        drive_duration_minutes=job.drive_duration_minutes,
        gas_cost=job.gas_cost,
        worth_it_mood=job.worth_it_mood,
        parsed_at=job.parsed_at,
        expires_at=job.expires_at,
        sweeps_job_id=job.sweeps_job_id,
        has_calendar_event=len(job.calendar_links) > 0,
        calendar_conflict=calendar_conflict,
    )


@router.get("/users/me", response_model=UserOut)
@limiter.limit("120/minute", key_func=user_or_ip_key)
async def get_profile(request: Request, user: User = Depends(get_current_user)):
    return user


@router.patch("/users/me", response_model=UserOut)
@limiter.limit("120/minute", key_func=user_or_ip_key)
async def update_profile(
    request: Request,
    body: UserUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if body.default_job_pay is not None:
        user.default_job_pay = body.default_job_pay
    if body.travel_buffer_minutes is not None:
        user.travel_buffer_minutes = body.travel_buffer_minutes
    if body.cost_settings is not None:
        user.cost_settings = body.cost_settings
    await db.commit()
    await db.refresh(user)
    return user


@router.get("/jobs", response_model=list[JobOut])
@limiter.limit("120/minute", key_func=user_or_ip_key)
async def list_jobs(
    request: Request,
    status: JobStatusEnum | None = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = (
        select(Job)
        .options(selectinload(Job.calendar_links))
        .where(Job.user_id == user.id)
        .order_by(Job.start_at.desc().nullslast())
    )
    if status:
        q = q.where(Job.status == JobStatus(status.value))
    else:
        q = q.where(Job.status.notin_([JobStatus.DISMISSED, JobStatus.EXPIRED]))
    result = await db.execute(q)
    jobs = result.scalars().all()

    events = []
    if jobs:
        now = datetime.now(timezone.utc)
        events = await get_calendar_events(user, now - timedelta(days=1), now + timedelta(days=30))

    out = []
    for job in jobs:
        conflict = None
        if job.start_at and events:
            conflict = check_job_conflicts(job, events, user.travel_buffer_minutes)["has_conflict"]
        out.append(_job_to_out(job, conflict))
    return out


@router.post("/jobs/sync", response_model=GmailSyncOut)
@limiter.limit("10/minute", key_func=user_or_ip_key)
async def sync_gmail(
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await expire_old_jobs(db)
    result = await poll_user_gmail(db, user)
    return GmailSyncOut(
        ingested=result.ingested,
        label_found=result.label_found,
        needs_reauth=result.needs_reauth,
    )


@router.get("/jobs/{job_id}", response_model=JobOut)
@limiter.limit("120/minute", key_func=user_or_ip_key)
async def get_job(
    request: Request,
    job_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    job = await _get_user_job(db, user, job_id)
    events = []
    if job.start_at:
        events = await get_calendar_events(
            user,
            job.start_at - timedelta(days=1),
            job.start_at + timedelta(days=1),
        )
    conflict = (
        check_job_conflicts(job, events, user.travel_buffer_minutes)["has_conflict"]
        if events
        else None
    )
    return _job_to_out(job, conflict)


@router.patch("/jobs/{job_id}", response_model=JobOut)
@limiter.limit("120/minute", key_func=user_or_ip_key)
async def update_job(
    request: Request,
    job_id: UUID,
    body: JobUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    job = await _get_user_job(db, user, job_id)
    if body.status is not None:
        job.status = JobStatus(body.status.value)
    if body.pay_amount is not None:
        job.pay_amount = body.pay_amount
    await db.commit()
    await db.refresh(job)
    return _job_to_out(job)


@router.post("/jobs/{job_id}/commute", response_model=CommuteResponse)
@limiter.limit("30/hour", key_func=user_or_ip_key)
async def compute_job_commute(
    request: Request,
    job_id: UUID,
    body: CommuteRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    job = await _get_user_job(db, user, job_id)
    if job.lat is None or job.lng is None:
        raise HTTPException(status_code=400, detail="Job location not geocoded")

    pay = job.pay_amount or user.default_job_pay
    result = await compute_commute(
        body.origin_lat,
        body.origin_lng,
        job.lat,
        job.lng,
        user.cost_settings,
        pay,
        body.round_trip,
    )

    job.drive_distance_miles = result["distance_miles"]
    job.drive_duration_minutes = result["duration_minutes"]
    job.gas_cost = result["gas_cost"]
    job.worth_it_mood = result["worth_it_mood"]
    await db.commit()

    return CommuteResponse(
        distance_miles=result["distance_miles"],
        duration_minutes=result["duration_minutes"],
        gas_cost=result["gas_cost"],
        trip_cost=result["trip_cost"],
        worth_it_mood=result["worth_it_mood"],
        worth_it_headline=result["worth_it_headline"],
        worth_it_subline=result["worth_it_subline"],
        net_profit=result["net_profit"],
        geometry=result.get("geometry"),
    )


@router.get("/jobs/{job_id}/calendar/conflicts", response_model=CalendarConflictOut)
@limiter.limit("60/hour", key_func=user_or_ip_key)
async def get_job_conflicts(
    request: Request,
    job_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    job = await _get_user_job(db, user, job_id)
    if not job.start_at:
        raise HTTPException(status_code=400, detail="Job has no scheduled time")
    events = await get_calendar_events(
        user,
        job.start_at - timedelta(days=1),
        job.start_at + timedelta(days=1),
    )
    raw = check_job_conflicts(job, events, user.travel_buffer_minutes)
    return CalendarConflictOut(
        has_conflict=raw["has_conflict"],
        conflicting_events=[
            CalendarEventOut(
                id=e["id"],
                summary=e["summary"],
                start=e["start"],
                end=e["end"],
                status=e.get("status"),
            )
            for e in raw["conflicting_events"]
        ],
        job_window_start=raw["job_window_start"],
        job_window_end=raw["job_window_end"],
        travel_buffer_minutes=raw["travel_buffer_minutes"],
    )


@router.post("/jobs/{job_id}/calendar/tentative")
@limiter.limit("60/hour", key_func=user_or_ip_key)
async def add_tentative_calendar_event(
    request: Request,
    job_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.models import CalendarEventStatus

    job = await _get_user_job(db, user, job_id)
    if job.calendar_links:
        raise HTTPException(status_code=400, detail="Calendar event already exists")
    event_id = await create_tentative_event(user, job)
    link = CalendarLink(
        job_id=job.id,
        google_event_id=event_id,
        event_status=CalendarEventStatus.TENTATIVE,
    )
    db.add(link)
    if job.status == JobStatus.NEW:
        job.status = JobStatus.CONSIDERING
    await db.commit()
    return {"google_event_id": event_id}


@router.post("/jobs/plan-route", response_model=PlanRouteResponse)
@limiter.limit("20/hour", key_func=user_or_ip_key)
async def plan_route(
    request: Request,
    body: PlanRouteRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if len(body.job_ids) < 1:
        raise HTTPException(status_code=400, detail="Select at least one job")

    jobs = []
    for jid in body.job_ids:
        job = await _get_user_job(db, user, jid)
        if job.lat is None or job.lng is None:
            raise HTTPException(status_code=400, detail=f"Job {jid} not geocoded")
        jobs.append(job)

    coords = [(body.origin_lng, body.origin_lat)]
    for job in jobs:
        coords.append((job.lng, job.lat))
    if body.return_to_origin:
        coords.append((body.origin_lng, body.origin_lat))

    route = await get_directions(coords)
    segments = route.get("segments") or []
    legs = []
    job_legs = segments[: len(jobs)] if segments else []

    for i, job in enumerate(jobs):
        if i < len(job_legs):
            seg = job_legs[i]
            legs.append(
                RouteLegOut(
                    job_id=job.id,
                    label=job.category or job.street or "Job",
                    distance_miles=meters_to_miles(seg["distance"]),
                    duration_minutes=seconds_to_minutes(seg["duration"]),
                )
            )
        else:
            legs.append(
                RouteLegOut(
                    job_id=job.id,
                    label=job.category or job.street or "Job",
                    distance_miles=0,
                    duration_minutes=0,
                )
            )

    return PlanRouteResponse(
        total_distance_miles=meters_to_miles(route["distance_meters"]),
        total_duration_minutes=seconds_to_minutes(route["duration_seconds"]),
        legs=legs,
        geometry=route.get("geometry"),
        ordered_job_ids=body.job_ids,
    )


@router.get("/calendar/events", response_model=list[CalendarEventOut])
@limiter.limit("60/hour", key_func=user_or_ip_key)
async def list_calendar_events(
    request: Request,
    start: datetime = Query(...),
    end: datetime = Query(...),
    user: User = Depends(get_current_user),
):
    events = await get_calendar_events(user, start, end)
    out = []
    for e in events:
        if e.get("status") == "cancelled":
            continue
        from app.services.calendar import _parse_event_datetime

        ev_start, ev_end = _parse_event_datetime(e)
        out.append(
            CalendarEventOut(
                id=e["id"],
                summary=e.get("summary", "(No title)"),
                start=ev_start,
                end=ev_end,
                status=e.get("status"),
            )
        )
    return out


@router.get("/day-plan", response_model=DayPlanResponse)
@limiter.limit("120/minute", key_func=user_or_ip_key)
async def get_day_plan(
    request: Request,
    date: str = Query(..., description="YYYY-MM-DD"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    day = datetime.strptime(date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    day_end = day + timedelta(days=1)

    result = await db.execute(
        select(Job).where(
            Job.user_id == user.id,
            Job.status.in_([JobStatus.NEW, JobStatus.CONSIDERING]),
            Job.start_at >= day,
            Job.start_at < day_end,
        )
    )
    jobs = result.scalars().all()
    events = await get_calendar_events(user, day, day_end)

    items: list[DayPlanItem] = []
    for job in jobs:
        end = None
        if job.start_at and job.duration_minutes:
            end = job.start_at + timedelta(minutes=job.duration_minutes)
        items.append(
            DayPlanItem(
                type="job",
                id=str(job.id),
                title=f"{job.category or 'Sweeps'} — {job.street or ''}",
                start=job.start_at,
                end=end,
                lat=job.lat,
                lng=job.lng,
            )
        )
    for e in events:
        if e.get("status") == "cancelled":
            continue
        from app.services.calendar import _parse_event_datetime

        ev_start, ev_end = _parse_event_datetime(e)
        items.append(
            DayPlanItem(
                type="calendar",
                id=e["id"],
                title=e.get("summary", "(No title)"),
                start=ev_start,
                end=ev_end,
            )
        )

    items.sort(key=lambda x: x.start or datetime.max.replace(tzinfo=timezone.utc))
    return DayPlanResponse(date=date, items=items)


async def _get_user_job(db: AsyncSession, user: User, job_id: UUID) -> Job:
    result = await db.execute(
        select(Job)
        .options(selectinload(Job.calendar_links))
        .where(Job.id == job_id, Job.user_id == user.id)
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job
