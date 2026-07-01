"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  clearAuthToken,
  getAuthToken,
  getMe,
  listJobs,
  syncGmail,
  updateJob,
  useGeolocation,
} from "@/lib/sweepsApi";
import type { Coordinates } from "@/types";
import type { GmailSyncResult, SweepsJob, SweepsOrigin, SweepsUser } from "@/types/sweeps";

const ORIGIN_STORAGE_KEY = "sweeps_origin";

function readStoredOrigin(): SweepsOrigin | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ORIGIN_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SweepsOrigin;
    if (
      typeof parsed.lat === "number" &&
      typeof parsed.lng === "number" &&
      typeof parsed.label === "string"
    ) {
      return parsed;
    }
  } catch {
    // ignore corrupt storage
  }
  return null;
}

function persistOrigin(origin: SweepsOrigin) {
  localStorage.setItem(ORIGIN_STORAGE_KEY, JSON.stringify(origin));
}

interface SweepsContextValue {
  user: SweepsUser | null;
  activeJobs: SweepsJob[];
  dismissedJobs: SweepsJob[];
  expiredJobs: SweepsJob[];
  origin: SweepsOrigin | null;
  originError: string | null;
  loading: boolean;
  error: string | null;
  refreshJobs: () => Promise<void>;
  syncGmailLabel: () => Promise<GmailSyncResult>;
  dismissJob: (id: string) => Promise<void>;
  restoreJob: (id: string) => Promise<void>;
  setOriginFromAddress: (label: string, coordinates: Coordinates) => void;
  refreshOriginFromGps: () => Promise<void>;
  signOut: () => void;
  setUser: (user: SweepsUser) => void;
}

const SweepsContext = createContext<SweepsContextValue | null>(null);

export function useSweeps(): SweepsContextValue {
  const ctx = useContext(SweepsContext);
  if (!ctx) {
    throw new Error("useSweeps must be used within SweepsProvider");
  }
  return ctx;
}

export function useSweepsOptional(): SweepsContextValue | null {
  return useContext(SweepsContext);
}

export function SweepsProvider({ children }: { children: ReactNode }) {
  const initializedRef = useRef(false);
  const originInitializedRef = useRef(false);
  const [user, setUser] = useState<SweepsUser | null>(null);
  const [activeJobs, setActiveJobs] = useState<SweepsJob[]>([]);
  const [dismissedJobs, setDismissedJobs] = useState<SweepsJob[]>([]);
  const [expiredJobs, setExpiredJobs] = useState<SweepsJob[]>([]);
  const [origin, setOrigin] = useState<SweepsOrigin | null>(null);
  const [originError, setOriginError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const setOriginFromAddress = useCallback((label: string, coordinates: Coordinates) => {
    const next: SweepsOrigin = {
      lat: coordinates[1],
      lng: coordinates[0],
      label,
    };
    setOrigin(next);
    persistOrigin(next);
    setOriginError(null);
  }, []);

  const refreshOriginFromGps = useCallback(async () => {
    try {
      const { lat, lng } = await useGeolocation();
      const next: SweepsOrigin = {
        lat,
        lng,
        label: `${lat.toFixed(5)}, ${lng.toFixed(5)} (GPS)`,
      };
      setOrigin(next);
      persistOrigin(next);
      setOriginError(null);
    } catch {
      setOriginError("GPS unavailable — type your address above");
    }
  }, []);

  const refreshJobs = useCallback(async () => {
    const [active, dismissed, expired] = await Promise.all([
      listJobs(),
      listJobs("dismissed"),
      listJobs("expired"),
    ]);
    setActiveJobs(active);
    setDismissedJobs(dismissed);
    setExpiredJobs(expired);
  }, []);

  const signOut = useCallback(() => {
    clearAuthToken();
    initializedRef.current = false;
    setUser(null);
    setActiveJobs([]);
    setDismissedJobs([]);
    setExpiredJobs([]);
    setError("Not signed in");
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!getAuthToken()) {
        setUser(null);
        setError("Not signed in");
        setLoading(false);
        return;
      }
      if (initializedRef.current) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const me = await getMe();
        if (cancelled) return;
        setUser(me);
        await refreshJobs();
        if (cancelled) return;
        setError(null);
        initializedRef.current = true;
      } catch {
        if (cancelled) return;
        setUser(null);
        setError("Not signed in");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [refreshJobs]);

  useEffect(() => {
    if (originInitializedRef.current) return;
    originInitializedRef.current = true;

    const stored = readStoredOrigin();
    if (stored) {
      setOrigin(stored);
      return;
    }
    refreshOriginFromGps();
  }, [refreshOriginFromGps]);

  const syncGmailLabel = useCallback(async () => {
    const result = await syncGmail();
    if (!result.needs_reauth) {
      await refreshJobs();
    }
    return result;
  }, [refreshJobs]);

  const dismissJob = useCallback(async (id: string) => {
    const updated = await updateJob(id, { status: "dismissed" });
    setActiveJobs((prev) => prev.filter((j) => j.id !== id));
    setDismissedJobs((prev) => [updated, ...prev]);
  }, []);

  const restoreJob = useCallback(async (id: string) => {
    const updated = await updateJob(id, { status: "new" });
    setDismissedJobs((prev) => prev.filter((j) => j.id !== id));
    setActiveJobs((prev) => [updated, ...prev]);
  }, []);

  return (
    <SweepsContext.Provider
      value={{
        user,
        activeJobs,
        dismissedJobs,
        expiredJobs,
        origin,
        originError,
        loading,
        error,
        refreshJobs,
        syncGmailLabel,
        dismissJob,
        restoreJob,
        setOriginFromAddress,
        refreshOriginFromGps,
        signOut,
        setUser,
      }}
    >
      {children}
    </SweepsContext.Provider>
  );
}
