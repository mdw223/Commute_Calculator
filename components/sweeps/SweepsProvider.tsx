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
import { usePathname } from "next/navigation";
import {
  clearAuthToken,
  getAuthToken,
  getMe,
  listJobs,
  syncGmail,
  updateJob,
} from "@/lib/sweepsApi";
import type { GmailSyncResult, SweepsJob, SweepsUser } from "@/types/sweeps";

interface SweepsContextValue {
  user: SweepsUser | null;
  activeJobs: SweepsJob[];
  dismissedJobs: SweepsJob[];
  expiredJobs: SweepsJob[];
  loading: boolean;
  error: string | null;
  refreshJobs: () => Promise<void>;
  syncGmailLabel: () => Promise<GmailSyncResult>;
  dismissJob: (id: string) => Promise<void>;
  restoreJob: (id: string) => Promise<void>;
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

export function SweepsProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const initializedRef = useRef(false);
  const [user, setUser] = useState<SweepsUser | null>(null);
  const [activeJobs, setActiveJobs] = useState<SweepsJob[]>([]);
  const [dismissedJobs, setDismissedJobs] = useState<SweepsJob[]>([]);
  const [expiredJobs, setExpiredJobs] = useState<SweepsJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
  }, [pathname, refreshJobs]);

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
        loading,
        error,
        refreshJobs,
        syncGmailLabel,
        dismissJob,
        restoreJob,
        signOut,
        setUser,
      }}
    >
      {children}
    </SweepsContext.Provider>
  );
}
