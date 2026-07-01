export type JobStatus = "new" | "considering" | "dismissed" | "expired";

export interface SweepsOrigin {
  lat: number;
  lng: number;
  label: string;
}

export interface SweepsUser {
  id: string;
  email: string;
  name: string | null;
  default_job_pay: number;
  travel_buffer_minutes: number;
  cost_settings: Record<string, unknown>;
}

export interface SweepsJob {
  id: string;
  category: string | null;
  details: string | null;
  sweepers_requested: number | null;
  street: string | null;
  city_state: string | null;
  zip_code: string | null;
  full_address: string | null;
  lat: number | null;
  lng: number | null;
  start_at: string | null;
  duration_minutes: number | null;
  flexible_time: boolean;
  job_url: string | null;
  subject: string | null;
  status: JobStatus;
  pay_amount: number | null;
  drive_distance_miles: number | null;
  drive_duration_minutes: number | null;
  gas_cost: number | null;
  worth_it_mood: string | null;
  parsed_at: string;
  expires_at: string | null;
  sweeps_job_id: string | null;
  has_calendar_event: boolean;
  calendar_conflict: boolean | null;
}

export interface CommuteResult {
  distance_miles: number;
  duration_minutes: number;
  gas_cost: number;
  trip_cost: number;
  worth_it_mood: string;
  worth_it_headline: string;
  worth_it_subline: string;
  net_profit: number;
  geometry?: [number, number][] | null;
}

export interface CalendarConflict {
  has_conflict: boolean;
  conflicting_events: {
    id: string;
    summary: string;
    start: string;
    end: string;
    status: string | null;
  }[];
  job_window_start: string | null;
  job_window_end: string | null;
  travel_buffer_minutes: number;
}

export interface PlanRouteResult {
  total_distance_miles: number;
  total_duration_minutes: number;
  legs: {
    job_id: string;
    label: string;
    distance_miles: number;
    duration_minutes: number;
  }[];
  geometry?: [number, number][] | null;
  ordered_job_ids: string[];
}

export interface DayPlanItem {
  type: "job" | "calendar" | "travel";
  id: string;
  title: string;
  start: string | null;
  end: string | null;
  lat?: number | null;
  lng?: number | null;
}

export interface DayPlan {
  date: string;
  items: DayPlanItem[];
}

export interface GmailSyncResult {
  ingested: number;
  label_found: boolean;
  needs_reauth?: boolean;
}
