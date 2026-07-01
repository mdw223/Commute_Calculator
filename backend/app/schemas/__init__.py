from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, Field


class JobStatusEnum(str, Enum):
    NEW = "new"
    CONSIDERING = "considering"
    DISMISSED = "dismissed"
    EXPIRED = "expired"


class CostSettingsSchema(BaseModel):
    gasPricePerGallon: float = 3.5
    mpg: float = 25.0
    includeMaintenance: bool = False
    maintenancePerMile: float = 0.1
    includeTimeValue: bool = False
    hourlyRate: float = 20.0
    includeHourlySalary: bool = False
    hourlySalary: float = 25.0
    includeSideHustle: bool = True
    sideHustleRate: float = 20.0
    roundTrip: bool = True
    frequency: dict = Field(default_factory=lambda: {"count": 1, "unit": "day"})


class UserOut(BaseModel):
    id: UUID
    email: str
    name: str | None
    default_job_pay: float
    travel_buffer_minutes: int
    cost_settings: dict

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    default_job_pay: float | None = None
    travel_buffer_minutes: int | None = None
    cost_settings: dict | None = None


class JobOut(BaseModel):
    id: UUID
    category: str | None
    details: str | None
    sweepers_requested: int | None
    street: str | None
    city_state: str | None
    zip_code: str | None
    full_address: str | None
    lat: float | None
    lng: float | None
    start_at: datetime | None
    duration_minutes: int | None
    flexible_time: bool
    job_url: str | None
    subject: str | None
    status: JobStatusEnum
    pay_amount: float | None
    drive_distance_miles: float | None
    drive_duration_minutes: float | None
    gas_cost: float | None
    worth_it_mood: str | None
    parsed_at: datetime
    expires_at: datetime | None
    sweeps_job_id: str | None
    has_calendar_event: bool = False
    calendar_conflict: bool | None = None

    model_config = {"from_attributes": True}


class JobUpdate(BaseModel):
    status: JobStatusEnum | None = None
    pay_amount: float | None = None


class CommuteRequest(BaseModel):
    origin_lat: float
    origin_lng: float
    round_trip: bool = True


class CommuteResponse(BaseModel):
    distance_miles: float
    duration_minutes: float
    gas_cost: float
    trip_cost: float
    worth_it_mood: str
    worth_it_headline: str
    worth_it_subline: str
    net_profit: float
    geometry: list[list[float]] | None = None


class CalendarEventOut(BaseModel):
    id: str
    summary: str
    start: datetime
    end: datetime
    status: str | None = None


class CalendarConflictOut(BaseModel):
    has_conflict: bool
    conflicting_events: list[CalendarEventOut]
    job_window_start: datetime | None
    job_window_end: datetime | None
    travel_buffer_minutes: int


class PlanRouteRequest(BaseModel):
    origin_lat: float
    origin_lng: float
    job_ids: list[UUID]
    return_to_origin: bool = True


class RouteLegOut(BaseModel):
    job_id: UUID
    label: str
    distance_miles: float
    duration_minutes: float


class PlanRouteResponse(BaseModel):
    total_distance_miles: float
    total_duration_minutes: float
    legs: list[RouteLegOut]
    geometry: list[list[float]] | None = None
    ordered_job_ids: list[UUID]


class DayPlanItem(BaseModel):
    type: str  # "job" | "calendar" | "travel"
    id: str
    title: str
    start: datetime | None
    end: datetime | None
    lat: float | None = None
    lng: float | None = None


class DayPlanResponse(BaseModel):
    date: str
    items: list[DayPlanItem]
