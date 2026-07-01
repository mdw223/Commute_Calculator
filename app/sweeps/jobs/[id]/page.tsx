"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import ConfirmDialog from "@/components/ConfirmDialog";
import {
  computeCommute,
  createTentativeEvent,
  getCalendarConflicts,
  getJob,
  updateJob,
} from "@/lib/sweepsApi";
import { useSweeps } from "@/components/sweeps/SweepsProvider";
import { formatCurrency, formatDuration, formatMiles } from "@/lib/calculations";
import type { CalendarConflict, CommuteResult, SweepsJob } from "@/types/sweeps";

const JobsMap = dynamic(() => import("@/components/sweeps/JobsMap"), { ssr: false });

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [job, setJob] = useState<SweepsJob | null>(null);
  const [commute, setCommute] = useState<CommuteResult | null>(null);
  const [conflicts, setConflicts] = useState<CalendarConflict | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [confirmDismiss, setConfirmDismiss] = useState(false);
  const { origin: sweepsOrigin } = useSweeps();

  const originCoords = sweepsOrigin
    ? { lat: sweepsOrigin.lat, lng: sweepsOrigin.lng }
    : null;

  useEffect(() => {
    getJob(id)
      .then(setJob)
      .catch(() => router.push("/sweeps"))
      .finally(() => setLoading(false));
    getCalendarConflicts(id)
      .then(setConflicts)
      .catch(() => null);
  }, [id, router]);

  useEffect(() => {
    if (!originCoords || !job) return;
    computeCommute(job.id, originCoords).then(setCommute).catch(() => null);
  }, [originCoords, job]);

  const handleStatus = async (status: string) => {
    const updated = await updateJob(id, { status });
    setJob(updated);
    setActionMsg(`Marked as ${status}`);
  };

  const handleCalendar = async () => {
    await createTentativeEvent(id);
    const updated = await getJob(id);
    setJob(updated);
    setActionMsg("Tentative calendar event created");
  };

  if (loading || !job) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteNav />
        <main className="flex-1 p-8 font-mono text-sm">Loading…</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />
      <main className="flex-1 max-w-4xl mx-auto w-full p-4 space-y-6">
        <Link href="/sweeps" className="font-mono text-xs uppercase hover:underline">
          ← Back to jobs
        </Link>

        <header className="border-3 border-ink bg-surface p-6 shadow-brutal">
          <h1 className="font-display text-2xl font-bold">{job.category}</h1>
          <p className="font-mono text-sm text-muted mt-1">
            {job.start_at
              ? new Date(job.start_at).toLocaleString()
              : "No date"}
            {job.flexible_time ? " · Flexible time" : ""}
          </p>
          <p className="mt-2">{job.full_address}</p>
          <p className="mt-3 text-sm">{job.details}</p>
          <p className="mt-2 font-mono text-sm">
            Pay: {formatCurrency(job.pay_amount ?? 20)}
          </p>
        </header>

        {commute && (
          <section className="border-3 border-ink p-4 shadow-brutal-sm grid sm:grid-cols-2 gap-4">
            <div>
              <h2 className="font-mono text-xs uppercase mb-2">{commute.worth_it_headline}</h2>
              <p className="text-sm">{commute.worth_it_subline}</p>
            </div>
            <div className="font-mono text-sm grid grid-cols-2 gap-2">
              <div>Drive: {formatMiles(commute.distance_miles)}</div>
              <div>Time: {formatDuration(commute.duration_minutes)}</div>
              <div>Gas: {formatCurrency(commute.gas_cost)}</div>
              <div>Net: {formatCurrency(commute.net_profit)}</div>
            </div>
          </section>
        )}

        {conflicts?.has_conflict && (
          <section className="border-3 border-headline bg-headline/10 p-4">
            <h2 className="font-mono text-xs uppercase text-headline mb-2">
              Calendar conflict ({conflicts.travel_buffer_minutes} min buffer)
            </h2>
            <ul className="text-sm space-y-1">
              {conflicts.conflicting_events.map((e) => (
                <li key={e.id}>
                  {e.summary} —{" "}
                  {new Date(e.start).toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </li>
              ))}
            </ul>
          </section>
        )}

        {job.lat != null && job.lng != null && (
          <JobsMap jobs={[job]} origin={originCoords} routeGeometry={commute?.geometry ?? null} />
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleStatus("considering")}
            className="border-2 border-ink px-4 py-2 font-mono text-xs uppercase bg-cta hover:bg-cta/80"
          >
            Considering
          </button>
          {!job.has_calendar_event && (
            <button
              type="button"
              onClick={handleCalendar}
              className="border-2 border-ink px-4 py-2 font-mono text-xs uppercase bg-surface hover:bg-cta/20"
            >
              Add to Calendar
            </button>
          )}
          <button
            type="button"
            onClick={() => setConfirmDismiss(true)}
            className="border-2 border-ink px-4 py-2 font-mono text-xs uppercase text-muted"
          >
            Dismiss
          </button>
          {job.job_url && (
            <a
              href={job.job_url}
              target="_blank"
              rel="noopener noreferrer"
              className="border-2 border-ink px-4 py-2 font-mono text-xs uppercase"
            >
              Open on Sweeps
            </a>
          )}
        </div>
        {actionMsg && <p className="font-mono text-xs text-muted">{actionMsg}</p>}
      </main>

      <ConfirmDialog
        open={confirmDismiss}
        title="Dismiss this job?"
        message={`"${job.category ?? "Sweeps Job"}" will be removed from your active list.`}
        confirmLabel="Dismiss"
        onConfirm={() => {
          setConfirmDismiss(false);
          handleStatus("dismissed");
        }}
        onCancel={() => setConfirmDismiss(false)}
      />

      <SiteFooter />
    </div>
  );
}
