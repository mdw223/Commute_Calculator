"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import ConfirmDialog from "@/components/ConfirmDialog";
import {
  createTentativeEvent,
  getCalendarConflicts,
  getJob,
  updateJob,
} from "@/lib/sweepsApi";
import { useJobCommute } from "@/lib/useJobCommutes";
import { useSweeps } from "@/components/sweeps/SweepsProvider";
import { formatCurrency, formatDuration, formatHours, formatMiles } from "@/lib/calculations";
import { formatSalaryInput, parseSalaryInput } from "@/lib/salary";
import type { CalendarConflict, SweepsJob } from "@/types/sweeps";

const JobsMap = dynamic(() => import("@/components/sweeps/JobsMap"), { ssr: false });

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [job, setJob] = useState<SweepsJob | null>(null);
  const [conflicts, setConflicts] = useState<CalendarConflict | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [confirmDismiss, setConfirmDismiss] = useState(false);
  const [durationInput, setDurationInput] = useState("");
  const [savingDuration, setSavingDuration] = useState(false);
  const [commuteRefreshKey, setCommuteRefreshKey] = useState(0);
  const { origin: sweepsOrigin } = useSweeps();

  const originLat = sweepsOrigin?.lat ?? null;
  const originLng = sweepsOrigin?.lng ?? null;
  const originCoords =
    originLat != null && originLng != null
      ? { lat: originLat, lng: originLng }
      : null;
  // Use the URL id directly (not job?.id) so the commute request fires in
  // parallel with getJob instead of waiting for it to resolve first.
  const commute = useJobCommute(id, originLat, originLng, commuteRefreshKey);

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
    setDurationInput(job?.duration_minutes ? formatSalaryInput(job.duration_minutes / 60) : "");
  }, [job?.id]);

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

  const handleDurationSave = async () => {
    const hours = parseSalaryInput(durationInput);
    const minutes = hours != null ? Math.round(hours * 60) : 0;
    setSavingDuration(true);
    try {
      const updated = await updateJob(id, { duration_minutes: minutes });
      setJob(updated);
      setDurationInput(
        updated.duration_minutes ? formatSalaryInput(updated.duration_minutes / 60) : ""
      );
      setCommuteRefreshKey((k) => k + 1);
      setActionMsg(minutes > 0 ? "Estimated job time saved" : "Estimated job time cleared");
    } finally {
      setSavingDuration(false);
    }
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
            Pay: {formatCurrency(job.pay_amount ?? 20)}/hr
            {commute?.total_job_pay != null && (
              <>
                {" "}
                · Total for {formatHours((job.duration_minutes ?? 60) / 60)}:{" "}
                {formatCurrency(commute.total_job_pay)}
              </>
            )}
          </p>

          <div className="mt-4 border-t-2 border-ink pt-3">
            <label
              htmlFor="job-duration-input"
              className="block font-mono text-xs uppercase mb-1"
            >
              Estimated job time (hours)
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              <input
                id="job-duration-input"
                type="text"
                inputMode="decimal"
                value={durationInput}
                onChange={(e) => setDurationInput(e.target.value)}
                placeholder="e.g. 2.5"
                className="w-28 border-2 border-ink px-3 py-2 font-mono text-sm"
              />
              <button
                type="button"
                onClick={handleDurationSave}
                disabled={savingDuration}
                className="border-2 border-ink px-3 py-2 font-mono text-xs uppercase bg-cta hover:bg-cta/80 disabled:opacity-50"
              >
                {savingDuration ? "Saving…" : "Save"}
              </button>
              {job.duration_minutes != null && (
                <span className="font-mono text-xs text-muted">
                  Currently ~{formatHours(job.duration_minutes / 60)}
                </span>
              )}
            </div>
            <p className="text-xs text-muted mt-2">
              {job.duration_minutes != null
                ? "Parsed from the job email — edit if it looks off."
                : "Not included in the job email — assumed 1 hour until you set it."}{" "}
              Pay is per hour, so total pay, net, and the effective $/hr below all scale
              with this.
            </p>
          </div>
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
              {commute.effective_hourly_rate != null && (
                <>
                  <div>
                    Effective: {formatCurrency(commute.effective_hourly_rate)}/hr
                  </div>
                  <div>
                    Total time:{" "}
                    {formatDuration(
                      (job.duration_minutes ?? 60) + commute.duration_minutes
                    )}{" "}
                    (job + drive)
                  </div>
                </>
              )}
            </div>
            {commute.current_job_earnings != null && commute.total_time_hours != null && (
              <div className="sm:col-span-2 border-t-2 border-ink pt-3 font-mono text-sm">
                In that same {formatHours(commute.total_time_hours)} (job + drive), your
                current job would pay{" "}
                <strong>{formatCurrency(commute.current_job_earnings)}</strong> — this
                Sweeps job nets{" "}
                <strong>{formatCurrency(commute.net_profit)}</strong>.
              </div>
            )}
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
          {job.job_url && (
            <a
              href={job.job_url}
              target="_blank"
              rel="noopener noreferrer"
              className="border-2 border-ink px-4 py-2 font-mono text-xs uppercase bg-surface hover:bg-cta/20"
            >
              View Job
            </a>
          )}
          <button
            type="button"
            onClick={() => setConfirmDismiss(true)}
            className="border-2 border-ink px-4 py-2 font-mono text-xs uppercase text-muted"
          >
            Dismiss
          </button>
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
