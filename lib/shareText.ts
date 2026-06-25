import {
  formatCurrency,
  formatDuration,
  formatMiles,
  getPeriodLabel,
} from "@/lib/calculations";
import {
  amountsFromField,
  parseSalaryInput,
  takeHomeAmount,
} from "@/lib/salary";
import type {
  CostBreakdown,
  CostSettings,
  SalaryCalculatorState,
  Stop,
  WorthItAnalysis,
} from "@/types";

const ROUTE_LINE_MAX_LENGTH = 80;

export function getSiteOrigin(): string {
  if (typeof window === "undefined") return "";
  return window.location.origin;
}

export function getCommutePageUrl(): string {
  return getSiteOrigin();
}

export function getSalaryPageUrl(): string {
  return `${getSiteOrigin()}/calculator`;
}

export function formatRouteLine(stops: Stop[], maxLength = ROUTE_LINE_MAX_LENGTH): string {
  const labels = stops
    .map((stop) => stop.label.trim())
    .filter((label) => label.length > 0);

  if (labels.length === 0) return "";

  const line = labels.join(" → ");
  if (line.length <= maxLength) return line;
  return `${line.slice(0, maxLength - 1).trimEnd()}…`;
}

export function buildCommuteShareText(options: {
  breakdown: CostBreakdown;
  worthIt: WorthItAnalysis;
  settings: CostSettings;
  stops: Stop[];
  includeAddresses: boolean;
}): string {
  const { breakdown, worthIt, settings, stops, includeAddresses } = options;
  const periodLabel = getPeriodLabel(
    settings.frequency.unit,
    settings.frequency.count
  );

  const lead =
    breakdown.frequencyMultiplier > 0
      ? `MY COMMUTE RUNS ${formatCurrency(breakdown.periodCost).toUpperCase()} ${periodLabel.toUpperCase()}. THE VERDICT: ${worthIt.headline.toUpperCase()}`
      : `MY COMMUTE COSTS ${formatCurrency(breakdown.tripCost).toUpperCase()} PER TRIP. THE VERDICT: ${worthIt.headline.toUpperCase()}`;

  const stats = [
    formatMiles(breakdown.totalMiles),
    formatDuration(breakdown.totalMinutes),
    `${formatCurrency(breakdown.tripCost)}/trip`,
  ].join(" · ");

  const lines = [lead, "", stats];

  if (includeAddresses) {
    const routeLine = formatRouteLine(stops);
    if (routeLine) {
      lines.push(routeLine);
    }
  }

  lines.push(
    "",
    `Ran the numbers at ${getCommutePageUrl()}`,
    "",
    "#commute #gasprices #worthit"
  );

  return lines.join("\n");
}

function getSalaryAmountsFromState(state: SalaryCalculatorState) {
  const parsedYearly = parseSalaryInput(state.values.yearly);
  if (parsedYearly != null) {
    return amountsFromField("yearly", parsedYearly, {
      hoursPerWeek: state.hoursPerWeek,
      weeksPerYear: state.weeksPerYear,
    });
  }

  if (!state.lastEditedField) return null;

  const source = parseSalaryInput(state.values[state.lastEditedField]);
  if (source == null) return null;

  return amountsFromField(state.lastEditedField, source, {
    hoursPerWeek: state.hoursPerWeek,
    weeksPerYear: state.weeksPerYear,
  });
}

export function hasShareableSalaryData(state: SalaryCalculatorState): boolean {
  return getSalaryAmountsFromState(state) != null;
}

export function buildSalaryShareText(state: SalaryCalculatorState): string {
  const amounts = getSalaryAmountsFromState(state);
  if (!amounts) return "";

  const yearlyFormatted = formatCurrency(amounts.yearly).toUpperCase();
  const hourlyFormatted = formatCurrency(amounts.hourly).toUpperCase();

  const lead = `${yearlyFormatted}/YR. THAT'S ${hourlyFormatted}/HR IF YOU'RE COUNTING.`;

  const conversionLine = [
    `Hourly ${formatCurrency(amounts.hourly)}`,
    `Weekly ${formatCurrency(amounts.weekly)}`,
    `Monthly ${formatCurrency(amounts.monthly)}`,
    `Yearly ${formatCurrency(amounts.yearly)}`,
  ].join(" · ");

  const lines = [lead, "", conversionLine];

  if (state.showTakeHome) {
    const takeHomeYearly = takeHomeAmount(amounts.yearly, state.taxRate);
    lines.push(`Take-home ~${formatCurrency(takeHomeYearly)}/yr`);
  }

  lines.push(
    "",
    `Salary decoder at ${getSalaryPageUrl()}`,
    "",
    "#salary #paycheck #takehome"
  );

  return lines.join("\n");
}

export function formatSalaryDisplay(value: number): string {
  return formatCurrency(value);
}

export { getSalaryAmountsFromState };
