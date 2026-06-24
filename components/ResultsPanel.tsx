"use client";

import {
  formatCurrency,
  formatDuration,
  formatHours,
  formatMiles,
  getPeriodLabel,
} from "@/lib/calculations";
import type { CostBreakdown, CostSettings, WorthItAnalysis } from "@/types";

interface ResultsPanelProps {
  breakdown: CostBreakdown;
  worthIt: WorthItAnalysis;
  settings: CostSettings;
}

function moodStyles(mood: WorthItAnalysis["mood"]) {
  switch (mood) {
    case "good":
      return "bg-cta text-ink border-ink";
    case "bad":
      return "bg-headline text-newsprint border-ink";
    default:
      return "bg-yellow-300 text-ink border-ink";
  }
}

export default function ResultsPanel({
  breakdown,
  worthIt,
  settings,
}: ResultsPanelProps) {
  const periodLabel = getPeriodLabel(
    settings.frequency.unit,
    settings.frequency.count
  );

  return (
    <div className="space-y-6">
      <p className="font-mono text-xs uppercase tracking-widest text-headline text-center">
        ★ The Verdict ★
      </p>

      <div
        className={`border-4 p-6 text-center shadow-brutal ${moodStyles(worthIt.mood)}`}
      >
        <h2 className="font-display text-2xl md:text-3xl font-black uppercase leading-tight">
          {worthIt.headline}
        </h2>
        <p className="mt-2 text-sm md:text-base opacity-90">{worthIt.subline}</p>
      </div>

      <div className="border-3 border-ink bg-surface p-4 shadow-brutal space-y-3">
        <h3 className="font-mono text-xs uppercase tracking-widest text-headline">
          Trip breakdown
        </h3>
        <Row label="Total distance" value={formatMiles(breakdown.totalMiles)} />
        <Row
          label="Drive time"
          value={formatDuration(breakdown.totalMinutes)}
        />
        <Row label="Gas" value={formatCurrency(breakdown.gasCost)} />
        <Row
          label="Maintenance ($0.10/mi)"
          value={formatCurrency(breakdown.maintenanceCost)}
        />
        {settings.includeTimeValue && (
          <Row label="Time cost" value={formatCurrency(breakdown.timeCost)} />
        )}
        <hr className="border-ink border-t-2" />
        <Row
          label="Cost per trip"
          value={formatCurrency(breakdown.tripCost)}
          bold
        />
        {breakdown.frequencyMultiplier > 0 && (
          <Row
            label={`Total ${periodLabel}`}
            value={formatCurrency(breakdown.periodCost)}
            bold
            highlight
          />
        )}
      </div>

      <div className="border-3 border-ink bg-surface p-4 shadow-brutal space-y-3">
        <h3 className="font-mono text-xs uppercase tracking-widest text-headline">
          Break-even math (no cap)
        </h3>
        {worthIt.breakEvenHourly != null && (
          <Row
            label="Break-even hourly rate"
            value={`${formatCurrency(worthIt.breakEvenHourly)}/hr`}
          />
        )}
        {worthIt.workHoursToCoverTrip != null && (
          <Row
            label="Work hours to cover one trip"
            value={formatHours(worthIt.workHoursToCoverTrip)}
          />
        )}
        {worthIt.workHoursToCoverPeriod != null && (
          <Row
            label={`Work hours to cover ${periodLabel}`}
            value={formatHours(worthIt.workHoursToCoverPeriod)}
          />
        )}
        {worthIt.paycheckPercent != null && (
          <Row
            label="Share of period earnings"
            value={`${worthIt.paycheckPercent.toFixed(1)}%`}
            bold
          />
        )}
        {!worthIt.breakEvenHourly &&
          !worthIt.workHoursToCoverTrip &&
          !worthIt.paycheckPercent && (
            <p className="text-sm text-muted">
              Add your hourly salary so we can roast you properly.
            </p>
          )}
      </div>

      <div className="border-3 border-ink bg-surface p-4 shadow-brutal space-y-3">
        <h3 className="font-mono text-xs uppercase tracking-widest text-headline">
          Side hustle comparator
        </h3>
        {worthIt.sideHustleHoursTrip != null && (
          <Row
            label="Side hustle hours (one trip)"
            value={formatHours(worthIt.sideHustleHoursTrip)}
          />
        )}
        {worthIt.sideHustleHoursPeriod != null && (
          <Row
            label={`Side hustle hours (${periodLabel})`}
            value={formatHours(worthIt.sideHustleHoursPeriod)}
            bold
          />
        )}
        {worthIt.sideHustleHoursTrip == null && (
          <p className="text-sm text-muted">
            Drop your side hustle $/hr — Etsy, DoorDash, whatever keeps the lights
            on.
          </p>
        )}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
  highlight,
}: {
  label: string;
  value: string;
  bold?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between items-baseline gap-4">
      <span className={`text-sm ${bold ? "font-bold" : "text-muted"}`}>
        {label}
      </span>
      <span
        className={`font-mono ${bold ? "font-bold text-headline" : ""} ${highlight ? "text-lg" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
