"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import JobCard from "@/components/sweeps/JobCard";
import SweepsSubnav from "@/components/sweeps/SweepsSubnav";
import { useSweeps } from "@/components/sweeps/SweepsProvider";
import { computeCommute, getGoogleLoginUrl } from "@/lib/sweepsApi";
import type { CommuteResult } from "@/types/sweeps";

const JobsMap = dynamic(() => import("@/components/sweeps/JobsMap"), { ssr: false });

export default function SweepsDashboard() {
  const {
    user,
    activeJobs,
    dismissedJobs,
    expiredJobs,
    loading,
    error,
    syncGmailLabel,
    dismissJob,
    restoreJob,
    signOut,
    origin,
  } = useSweeps();

  const [commutes, setCommutes] = useState<Record<string, CommuteResult>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [dismissedOpen, setDismissedOpen] = useState(true);
  const [expiredOpen, setExpiredOpen] = useState(false);

  const originCoords = origin ? { lat: origin.lat, lng: origin.lng } : null;

  useEffect(() => {
    if (!originCoords || activeJobs.length === 0) return;
    activeJobs.forEach(async (job) => {
      if (job.lat == null || job.lng == null) return;
      try {
        const result = await computeCommute(job.id, originCoords);
        setCommutes((prev) => ({ ...prev, [job.id]: result }));
      } catch {
        // ignore per-job failures
      }
    });
  }, [originCoords, activeJobs]);

  const handleDismiss = async (id: string) => {
    await dismissJob(id);
    if (selectedId === id) setSelectedId(null);
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const result = await syncGmailLabel();
      if (result.needs_reauth) {
        setSyncMessage("Google sign-in expired. Sign out and sign in again.");
      } else if (!result.label_found) {
        setSyncMessage('No "Sweeps" label found in Gmail. Create it via Settings → setup guide.');
      } else if (result.ingested > 0) {
        setSyncMessage(
          `Imported ${result.ingested} new job${result.ingested === 1 ? "" : "s"}.`
        );
      } else {
        setSyncMessage("Checked Sweeps label — no new emails.");
      }
    } catch {
      setSyncMessage("Sync failed. Try signing in again.");
    } finally {
      setSyncing(false);
    }
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
          <div className="flex gap-2 flex-wrap items-center">
            <SweepsSubnav />
            <button
              type="button"
              onClick={signOut}
              className="border-2 border-ink px-3 py-1 font-mono text-xs uppercase text-muted"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full p-4 grid lg:grid-cols-2 gap-6">
        <section className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h2 className="font-mono text-xs uppercase tracking-widest">
                Active jobs ({activeJobs.length})
              </h2>
              <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                disabled={syncing}
                onClick={handleSync}
                className="border-2 border-ink bg-cta px-3 py-1 font-mono text-xs uppercase disabled:opacity-50 hover:translate-x-0.5 hover:translate-y-0.5 transition-transform"
              >
                {syncing ? "Checking…" : "Check Sweeps label"}
              </button>
            </div>
          </div>
            {syncMessage && (
              <p className="font-mono text-xs text-muted">{syncMessage}</p>
            )}
            {activeJobs.length === 0 ? (
              <div className="border-3 border-ink border-dashed p-8 text-center">
                <p className="font-mono text-sm">No active jobs.</p>
                <p className="text-sm text-muted mt-2">
                  Create a Gmail filter: from <code>newjob@sweeps.jobs</code> → label{" "}
                  <code>Sweeps</code>, then click <strong>Check Sweeps label</strong> above.
                </p>
                <a href="/sweeps/settings" className="text-sm underline mt-2 inline-block">
                  Setup guide
                </a>
              </div>
            ) : (
              <div className="space-y-3">
                {activeJobs.map((job) => (
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
          </div>

          <div className="space-y-3 border-t-3 border-ink pt-6">
            <button
              type="button"
              onClick={() => setDismissedOpen((open) => !open)}
              className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest w-full text-left"
            >
              <span className="inline-block w-4">{dismissedOpen ? "▾" : "▸"}</span>
              Dismissed ({dismissedJobs.length})
            </button>
            {dismissedOpen &&
              (dismissedJobs.length === 0 ? (
                <p className="font-mono text-xs text-muted pl-6">No dismissed jobs.</p>
              ) : (
                <div className="space-y-3">
                  {dismissedJobs.map((job) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      muted
                      onRestore={() => restoreJob(job.id)}
                    />
                  ))}
                </div>
              ))}
          </div>

          <div className="space-y-3 border-t-3 border-ink pt-6">
            <button
              type="button"
              onClick={() => setExpiredOpen((open) => !open)}
              className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest w-full text-left"
            >
              <span className="inline-block w-4">{expiredOpen ? "▾" : "▸"}</span>
              Expired ({expiredJobs.length})
            </button>
            {expiredOpen &&
              (expiredJobs.length === 0 ? (
                <p className="font-mono text-xs text-muted pl-6">No expired jobs.</p>
              ) : (
                <div className="space-y-3">
                  {expiredJobs.map((job) => (
                    <JobCard key={job.id} job={job} muted />
                  ))}
                </div>
              ))}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="font-mono text-xs uppercase tracking-widest">Map</h2>
          <JobsMap
            jobs={activeJobs}
            origin={originCoords}
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
