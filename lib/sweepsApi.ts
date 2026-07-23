import type {
  CalendarConflict,
  CommuteResult,
  DayPlan,
  GmailSyncResult,
  PlanRouteResult,
  SweepsJob,
  SweepsUser,
} from "@/types/sweeps";

const API_URL = process.env.NEXT_PUBLIC_SWEEPS_API_URL || "http://localhost:8000";

const TOKEN_KEY = "sweeps_auth_token";

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAuthToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (res.status === 401) {
    clearAuthToken();
    throw new Error("Unauthorized");
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `API error ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export function getGoogleLoginUrl(): string {
  return `${API_URL}/auth/google/login`;
}

export async function getMe(): Promise<SweepsUser> {
  return apiFetch<SweepsUser>("/auth/me");
}

export async function updateProfile(data: Partial<SweepsUser>): Promise<SweepsUser> {
  return apiFetch<SweepsUser>("/users/me", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function listJobs(status?: string): Promise<SweepsJob[]> {
  const q = status ? `?status=${status}` : "";
  return apiFetch<SweepsJob[]>(`/jobs${q}`);
}

export async function syncGmail(): Promise<GmailSyncResult> {
  return apiFetch<GmailSyncResult>("/jobs/sync", { method: "POST" });
}

export async function getJob(id: string): Promise<SweepsJob> {
  return apiFetch<SweepsJob>(`/jobs/${id}`);
}

export async function updateJob(
  id: string,
  data: { status?: string; pay_amount?: number; duration_minutes?: number }
): Promise<SweepsJob> {
  return apiFetch<SweepsJob>(`/jobs/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function computeCommute(
  jobId: string,
  origin: { lat: number; lng: number },
  roundTrip = true
): Promise<CommuteResult> {
  return apiFetch<CommuteResult>(`/jobs/${jobId}/commute`, {
    method: "POST",
    body: JSON.stringify({
      origin_lat: origin.lat,
      origin_lng: origin.lng,
      round_trip: roundTrip,
    }),
  });
}

export async function getCalendarConflicts(jobId: string): Promise<CalendarConflict> {
  return apiFetch<CalendarConflict>(`/jobs/${jobId}/calendar/conflicts`);
}

export async function createTentativeEvent(jobId: string): Promise<{ google_event_id: string }> {
  return apiFetch(`/jobs/${jobId}/calendar/tentative`, { method: "POST" });
}

export async function planRoute(
  jobIds: string[],
  origin: { lat: number; lng: number },
  returnToOrigin = true
): Promise<PlanRouteResult> {
  return apiFetch<PlanRouteResult>("/jobs/plan-route", {
    method: "POST",
    body: JSON.stringify({
      job_ids: jobIds,
      origin_lat: origin.lat,
      origin_lng: origin.lng,
      return_to_origin: returnToOrigin,
    }),
  });
}

export async function getDayPlan(date: string): Promise<DayPlan> {
  return apiFetch<DayPlan>(`/day-plan?date=${date}`);
}

export function useGeolocation(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}
