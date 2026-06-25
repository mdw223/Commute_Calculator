import { formatCurrency } from "@/lib/calculations";
import { takeHomeAmount } from "@/lib/salary";
import {
  formatSalaryDisplay,
  getSalaryAmountsFromState,
  getSalaryPageUrl,
} from "@/lib/shareText";
import type { SalaryCalculatorState, SalaryField } from "@/types";
import { SHARE_CARD } from "./shareCardStyles";

interface SalaryShareCardProps {
  state: SalaryCalculatorState;
}

const FIELD_LABELS: Record<SalaryField, string> = {
  hourly: "Hourly",
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
};

const FIELDS: SalaryField[] = ["hourly", "weekly", "monthly", "yearly"];

export default function SalaryShareCard({ state }: SalaryShareCardProps) {
  const amounts = getSalaryAmountsFromState(state);
  if (!amounts) return null;

  const takeHomeYearly = state.showTakeHome
    ? takeHomeAmount(amounts.yearly, state.taxRate)
    : null;

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
        Your Paycheck, Decoded
      </p>

      <div
        style={{
          marginTop: 20,
          padding: 20,
          textAlign: "center",
          backgroundColor: SHARE_CARD.cta,
          border: `4px solid ${SHARE_CARD.ink}`,
          boxShadow: SHARE_CARD.shadowBrutal,
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
          {formatCurrency(amounts.yearly).toUpperCase()}/yr
        </h2>
        <p
          style={{
            marginTop: 8,
            fontFamily: SHARE_CARD.fontMono,
            fontSize: 14,
            textTransform: "uppercase",
          }}
        >
          That&apos;s {formatCurrency(amounts.hourly)}/hr if you&apos;re counting
        </p>
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
          Full Breakdown
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
          }}
        >
          {FIELDS.map((field) => (
            <Stat
              key={field}
              label={FIELD_LABELS[field]}
              value={formatSalaryDisplay(amounts[field])}
              highlight={field === "yearly"}
            />
          ))}
        </div>
        {takeHomeYearly != null && (
          <>
            <hr
              style={{
                margin: "12px 0",
                border: "none",
                borderTop: `2px solid ${SHARE_CARD.ink}`,
              }}
            />
            <Stat
              label="Take-home (est.)"
              value={`${formatSalaryDisplay(takeHomeYearly)}/yr`}
              bold
            />
          </>
        )}
      </div>

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
        {getSalaryPageUrl()}
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
          fontSize: highlight ? 18 : 14,
          color: highlight ? SHARE_CARD.headline : SHARE_CARD.ink,
        }}
      >
        {value}
      </p>
    </div>
  );
}
