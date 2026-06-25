import {
  formatCurrency,
  formatDuration,
  formatMiles,
  getPeriodLabel,
} from "@/lib/calculations";
import { formatRouteLine, getCommutePageUrl } from "@/lib/shareText";
import type { CostBreakdown, CostSettings, Stop, WorthItAnalysis } from "@/types";
import { moodColors, SHARE_CARD } from "./shareCardStyles";

interface CommuteShareCardProps {
  breakdown: CostBreakdown;
  worthIt: WorthItAnalysis;
  settings: CostSettings;
  stops: Stop[];
  includeAddresses: boolean;
}

export default function CommuteShareCard({
  breakdown,
  worthIt,
  settings,
  stops,
  includeAddresses,
}: CommuteShareCardProps) {
  const periodLabel = getPeriodLabel(
    settings.frequency.unit,
    settings.frequency.count
  );
  const verdictStyle = moodColors(worthIt.mood);
  const routeLine = includeAddresses ? formatRouteLine(stops, 120) : "";

  return (
    <div
      style={{
        width: 600,
        padding: 24,
        backgroundColor: SHARE_CARD.newsprint,
        color: SHARE_CARD.ink,
        border: `4px solid ${SHARE_CARD.ink}`,
        boxShadow: SHARE_CARD.shadowBrutal,
        fontFamily: SHARE_CARD.fontSans,
      }}
    >
      <p
        style={{
          fontFamily: SHARE_CARD.fontMono,
          fontSize: 12,
          letterSpacing: "0.3em",
          color: SHARE_CARD.headline,
          textAlign: "center",
          marginBottom: 8,
          textTransform: "uppercase",
        }}
      >
        ★ Front Page Exclusive ★
      </p>
      <h1
        style={{
          fontFamily: SHARE_CARD.fontDisplay,
          fontSize: 30,
          fontWeight: 900,
          lineHeight: 1.1,
          color: SHARE_CARD.headline,
          textAlign: "center",
          textTransform: "uppercase",
        }}
      >
        Gas In
        <br />
        This Economy
      </h1>
      <p
        style={{
          marginTop: 8,
          fontFamily: SHARE_CARD.fontDisplay,
          fontSize: 14,
          fontWeight: 700,
          textAlign: "center",
          textTransform: "uppercase",
        }}
      >
        Commute Cost Verdict
      </p>

      <div
        style={{
          marginTop: 20,
          padding: 20,
          textAlign: "center",
          border: `4px solid ${SHARE_CARD.ink}`,
          boxShadow: SHARE_CARD.shadowBrutal,
          background: verdictStyle.background,
          color: verdictStyle.color,
        }}
      >
        <h2
          style={{
            fontFamily: SHARE_CARD.fontDisplay,
            fontSize: 24,
            fontWeight: 900,
            lineHeight: 1.2,
            textTransform: "uppercase",
          }}
        >
          {worthIt.headline}
        </h2>
        <p style={{ marginTop: 8, fontSize: 14, opacity: 0.9 }}>{worthIt.subline}</p>
      </div>

      <div
        style={{
          marginTop: 20,
          padding: 16,
          backgroundColor: SHARE_CARD.surface,
          border: `3px solid ${SHARE_CARD.ink}`,
          boxShadow: SHARE_CARD.shadowBrutalSm,
        }}
      >
        <p
          style={{
            fontFamily: SHARE_CARD.fontMono,
            fontSize: 12,
            letterSpacing: "0.15em",
            color: SHARE_CARD.headline,
            textTransform: "uppercase",
            marginBottom: 12,
          }}
        >
          The Numbers
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
          }}
        >
          <Stat label="Distance" value={formatMiles(breakdown.totalMiles)} />
          <Stat label="Drive time" value={formatDuration(breakdown.totalMinutes)} />
          <Stat label="Per trip" value={formatCurrency(breakdown.tripCost)} bold />
          {breakdown.frequencyMultiplier > 0 && (
            <Stat
              label={periodLabel}
              value={formatCurrency(breakdown.periodCost)}
              bold
              highlight
            />
          )}
        </div>
      </div>

      {routeLine && (
        <p
          style={{
            marginTop: 16,
            fontFamily: SHARE_CARD.fontMono,
            fontSize: 12,
            color: SHARE_CARD.muted,
            textAlign: "center",
            textTransform: "uppercase",
            wordBreak: "break-word",
          }}
        >
          {routeLine}
        </p>
      )}

      <p
        style={{
          marginTop: 20,
          paddingTop: 12,
          borderTop: `2px solid ${SHARE_CARD.ink}`,
          fontFamily: SHARE_CARD.fontMono,
          fontSize: 12,
          color: SHARE_CARD.muted,
          textAlign: "center",
          textTransform: "uppercase",
        }}
      >
        {getCommutePageUrl()}
      </p>
    </div>
  );
}

function Stat({
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
    <div>
      <p
        style={{
          fontSize: 12,
          color: SHARE_CARD.muted,
          textTransform: "uppercase",
          fontFamily: SHARE_CARD.fontMono,
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontFamily: SHARE_CARD.fontMono,
          fontWeight: bold || highlight ? 700 : 400,
          fontSize: highlight ? 20 : 14,
          color: highlight ? SHARE_CARD.headline : SHARE_CARD.ink,
        }}
      >
        {value}
      </p>
    </div>
  );
}
