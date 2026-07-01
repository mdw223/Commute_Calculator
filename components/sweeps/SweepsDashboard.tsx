"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import JobCard from "@/components/sweeps/JobCard";
import {
  clearAuthToken,
  computeCommute,
  getGoogleLoginUrl,
  getMe,
  listJobs,
  setAuthToken,
  updateJob,
  useGeolocation,
} from "@/lib/sweepsApi";
import type { CommuteResult, SweepsJob, SweepsUser } from "@/types/sweeps";

const JobsMap = dynamic(() => import("@/components/sweeps/JobsMap"), { ssr: false });

export default function SweepsDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<SweepsUser | null>(null);
  const [jobs, setJobs] = useState<SweepsJob[]>([]);
  const [commutes, setCommutes] = useState<Record<string, CommuteResult>>({});
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const me = await getMe();
      setUser(me);
      const jobList = await listJobs();
      setJobs(jobList);
      setError(null);
    } catch {
      setUser(null);
      setError("Not signed in");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      setAuthToken(token);
      router.replace("/sweeps");
    }
    loadData();
  }, [searchParams, router, loadData]);

  useEffect(() => {
    useGeolocation()
      .then(setOrigin)
      .catch(() => setGeoError("Enable location for drive-time estimates"));
  }, []);

  useEffect(() => {
    if (!origin || jobs.length === 0) return;
    jobs.forEach(async (job) => {
      if (job.lat == null || job.lng == null) return;
      try {
        const result = await computeCommute(job.id, origin);
        setCommutes((prev) => ({ ...prev, [job.id]: result }));
      } catch {
        // ignore per-job failures
      }
    });
  }, [origin, jobs]);

  const handleDismiss = async (id: string) => {
    await updateJob(id, { status: "dismissed" });
    setJobs((prev) => prev.filter((j) => j.id !== id));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteNav />
        <main className="flex-1 p-8 font-mono text-sm">Loading…</main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteNav />
        <main className="flex-1 flex flex-col items-center justify-center p-8 gap-6">
          <h1 className="font-display text-3xl font-bold text-center">
            Sweeps Job Dashboard
          </h1>
          <p className="text-center max-w-md text-muted">
            Sign in with Google to sync your labeled Sweeps emails, see jobs on a
            map, and check if the drive is worth it.
          </p>
          <a
            href={getGoogleLoginUrl()}
            className="border-3 border-ink bg-cta px-6 py-3 font-mono text-sm uppercase shadow-brutal hover:translate-x-0.5 hover:translate-y-0.5 transition-transform"
          >
            Sign in with Google
          </a>
          {error && <p className="text-headline font-mono text-sm">{error}</p>}
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />
      <header className="border-b-3 border-ink bg-surface px-4 py-4">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold">Sweeps Jobs</h1>
            <p className="font-mono text-xs text-muted">{user.email}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <a
              href="/sweeps/planner"
              className="border-2 border-ink px-3 py-1 font-mono text-xs uppercase bg-surface hover:bg-cta/20"
            >
              Day Planner
            </a>
            <a
              href="/sweeps/route"
              className="border-2 border-ink px-3 py-1 font-mono text-xs uppercase bg-surface hover:bg-cta/20"
            >
              Plan Route
            </a>
            <a
              href="/sweeps/settings"
              className="border-2 border-ink px-3 py-1 font-mono text-xs uppercase bg-surface hover:bg-cta/20"
            >
              Settings
            </a>
            <button
              type="button"
              onClick={() => {
                clearAuthToken();
                setUser(null);
              }}
              className="border-2 border-ink px-3 py-1 font-mono text-xs uppercase text-muted"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full p-4 grid lg:grid-cols-2 gap-6">
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-mono text-xs uppercase tracking-widest">
              Active jobs ({jobs.length})
            </h2>
            {geoError && (
              <span className="font-mono text-[10px] text-headline">{geoError}</span>
            )}
          </div>
          {jobs.length === 0 ? (
            <div className="border-3 border-ink border-dashed p-8 text-center">
              <p className="font-mono text-sm">No jobs yet.</p>
              <p className="text-sm text-muted mt-2">
                Create a Gmail filter: from <code>newjob@sweeps.jobs</code> → label{" "}
                <code>Sweeps</code>
              </p>
              <a href="/sweeps/settings" className="text-sm underline mt-2 inline-block">
                Setup guide
              </a>
            </div>
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  commute={commutes[job.id]}
                  selected={selectedId === job.id}
                  onSelect={() => setSelectedId(job.id)}
                  onDismiss={() => handleDismiss(job.id)}
                />
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="font-mono text-xs uppercase tracking-widest">Map</h2>
          <JobsMap
            jobs={jobs}
            origin={origin}
            selectedJobId={selectedId}
            onSelectJob={setSelectedId}
            routeGeometry={
              selectedId && commutes[selectedId]?.geometry
                ? commutes[selectedId].geometry!
                : null
            }
            height="min(70vh, 520px)"
          />
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
