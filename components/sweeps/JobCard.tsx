"use client";

import Link from "next/link";
import { useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";
import { formatCurrency, formatDuration, formatMiles } from "@/lib/calculations";
import { moodColors } from "@/components/share/shareCardStyles";
import type { CommuteResult } from "@/types/sweeps";
import type { SweepsJob } from "@/types/sweeps";

interface JobCardProps {
  job: SweepsJob;
  commute?: CommuteResult | null;
  selected?: boolean;
  onSelect?: () => void;
  onDismiss?: () => void;
  onRestore?: () => void;
  muted?: boolean;
}

function formatJobDate(iso: string | null): string {
  if (!iso) return "TBD";
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function JobCard({
  job,
  commute,
  selected,
  onSelect,
  onDismiss,
  onRestore,
  muted,
}: JobCardProps) {
  const [confirmDismiss, setConfirmDismiss] = useState(false);
  const mood = (commute?.worth_it_mood ?? job.worth_it_mood ?? "meh") as
    | "good"
    | "meh"
    | "bad";
  const moodStyle = moodColors(mood);

  return (
    <article
      className={`border-3 border-ink p-4 shadow-brutal-sm transition-colors ${
        onSelect ? "cursor-pointer" : ""
      } ${
        selected ? "bg-cta/30" : muted ? "bg-newsprint/50 opacity-80" : "bg-surface hover:bg-newsprint"
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-display text-lg font-bold">
            {job.category ?? "Sweeps Job"}
          </h3>
          <p className="font-mono text-xs text-muted mt-1">
            {formatJobDate(job.start_at)}
            {job.duration_minutes ? ` · ~${Math.round(job.duration_minutes / 60)}hr` : ""}
          </p>
          <p className="text-sm mt-1">{job.street ?? job.full_address}</p>
        </div>
        <span
          className="font-mono text-[10px] uppercase px-2 py-1 border-2 border-ink shrink-0"
          style={{ background: moodStyle.background, color: moodStyle.color }}
        >
          {mood}
        </span>
      </div>

      {commute && (
        <div className="mt-3 grid grid-cols-3 gap-2 font-mono text-xs">
          <div>
            <span className="text-muted block">Drive</span>
            {formatMiles(commute.distance_miles)}
          </div>
          <div>
            <span className="text-muted block">Time</span>
            {formatDuration(commute.duration_minutes)}
          </div>
          <div>
            <span className="text-muted block">Net</span>
            {formatCurrency(commute.net_profit)}
          </div>
        </div>
      )}

      {job.calendar_conflict && (
        <p className="mt-2 text-xs font-mono text-headline uppercase">
          ⚠ Calendar conflict
        </p>
      )}

      <div className="mt-3 flex gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
        <Link
          href={`/sweeps/jobs/${job.id}`}
          className="border-2 border-ink px-3 py-1 font-mono text-xs uppercase bg-surface hover:bg-cta/20"
        >
          Details
        </Link>
        {job.job_url && (
          <a
            href={job.job_url}
            target="_blank"
            rel="noopener noreferrer"
            className="border-2 border-ink px-3 py-1 font-mono text-xs uppercase bg-surface hover:bg-cta/20"
          >
            View on Sweeps
          </a>
        )}
        {onRestore && (
          <button
            type="button"
            onClick={onRestore}
            className="border-2 border-ink px-3 py-1 font-mono text-xs uppercase bg-cta hover:bg-cta/80"
          >
            Restore
          </button>
        )}
        {onDismiss && job.status !== "dismissed" && (
          <button
            type="button"
            onClick={() => setConfirmDismiss(true)}
            className="border-2 border-ink px-3 py-1 font-mono text-xs uppercase text-muted hover:bg-headline/10"
          >
            Dismiss
          </button>
        )}
      </div>

      <ConfirmDialog
        open={confirmDismiss}
        title="Dismiss this job?"
        message={`"${job.category ?? "Sweeps Job"}" will move to your Dismissed list. You can restore it anytime.`}
        confirmLabel="Dismiss"
        onConfirm={() => {
          setConfirmDismiss(false);
          onDismiss?.();
        }}
        onCancel={() => setConfirmDismiss(false)}
      />
    </article>
  );
}
