import type {
  CostBreakdown,
  CostSettings,
  FrequencyUnit,
  RouteResult,
  VerdictMood,
  WorthItAnalysis,
} from "@/types";

export function getFrequencyMultiplier(
  count: number,
  unit: FrequencyUnit
): number {
  const safeCount = Math.max(0, count);
  switch (unit) {
    case "day":
      return safeCount;
    case "week":
      return safeCount;
    case "month":
      return safeCount;
    default:
      return safeCount;
  }
}

export function getPeriodLabel(unit: FrequencyUnit, count: number): string {
  if (count === 1) {
    switch (unit) {
      case "day":
        return "per day";
      case "week":
        return "per week";
      case "month":
        return "per month";
    }
  }
  return `per ${unit} (×${count})`;
}

export function applyRoundTrip(route: RouteResult, roundTrip: boolean): RouteResult {
  if (!roundTrip) return route;
  return {
    totalMiles: route.totalMiles * 2,
    totalMinutes: route.totalMinutes * 2,
    legs: route.legs,
  };
}

export function calculateCosts(
  route: RouteResult,
  settings: CostSettings
): CostBreakdown {
  const {
    gasPricePerGallon,
    mpg,
    includeMaintenance,
    maintenancePerMile,
    includeTimeValue,
    hourlyRate,
    frequency,
  } = settings;

  const totalMiles = route.totalMiles;
  const totalMinutes = route.totalMinutes;

  const gasCost = mpg > 0 ? (totalMiles / mpg) * gasPricePerGallon : 0;
  const potentialMaintenanceCost = totalMiles * maintenancePerMile;
  const maintenanceCost = includeMaintenance ? potentialMaintenanceCost : 0;
  const timeCost = includeTimeValue
    ? (totalMinutes / 60) * hourlyRate
    : 0;
  const tripCost = gasCost + maintenanceCost + timeCost;
  const frequencyMultiplier = getFrequencyMultiplier(
    frequency.count,
    frequency.unit
  );
  const periodCost = tripCost * frequencyMultiplier;

  return {
    gasCost,
    maintenanceCost,
    potentialMaintenanceCost,
    timeCost,
    tripCost,
    periodCost,
    frequencyMultiplier,
    totalMiles,
    totalMinutes,
  };
}

function getHoursPerPeriod(unit: FrequencyUnit): number {
  switch (unit) {
    case "day":
      return 8;
    case "week":
      return 40;
    case "month":
      return 173;
  }
}

export function analyzeWorthIt(
  breakdown: CostBreakdown,
  settings: CostSettings
): WorthItAnalysis {
  const { hourlySalary, sideHustleRate, frequency } = settings;
  const driveHours = breakdown.totalMinutes / 60;

  const breakEvenHourly =
    driveHours > 0 ? breakdown.tripCost / driveHours : null;

  const workHoursToCoverTrip =
    hourlySalary > 0 ? breakdown.tripCost / hourlySalary : null;

  const periodWorkHours = getHoursPerPeriod(frequency.unit) * frequency.count;
  const paycheckPercent =
    hourlySalary > 0 && periodWorkHours > 0
      ? (breakdown.periodCost / (hourlySalary * periodWorkHours)) * 100
      : null;

  const workHoursToCoverPeriod =
    hourlySalary > 0 ? breakdown.periodCost / hourlySalary : null;

  const sideHustleHoursTrip =
    sideHustleRate > 0 ? breakdown.tripCost / sideHustleRate : null;

  const sideHustleHoursPeriod =
    sideHustleRate > 0 ? breakdown.periodCost / sideHustleRate : null;

  let mood: VerdictMood = "meh";
  let headline = "THE MATH IS… MID";
  let subline = "Not terrible, not great. Very on brand for this economy.";

  if (hourlySalary > 0 && driveHours > 0) {
    const earningsIfWorking = hourlySalary * driveHours;
    const ratio = breakdown.tripCost / earningsIfWorking;

    if (ratio > 1.2) {
      mood = "bad";
      headline = "NOT WORTH IT — KEEP YOUR GAS";
      subline =
        "Bestie, you're paying more to drive than you'd earn sitting at your desk. No cap.";
    } else if (ratio < 0.5) {
      mood = "good";
      headline = "LOWKEY A STEAL";
      subline = "The drive costs less than your time is worth. Send it.";
    } else {
      mood = "meh";
      headline = "IT'S GIVING… COMPLICATED";
      subline = "Borderline. Your call — we don't judge (we do a little).";
    }
  } else if (breakdown.tripCost > 50) {
    mood = "bad";
    headline = "NOT WORTH IT — KEEP YOUR GAS";
    subline = "That's a lot of bread for one trip in this economy.";
  } else if (breakdown.tripCost < 15) {
    mood = "good";
    headline = "LOWKEY A STEAL";
    subline = "Cheap enough that your wallet might not cry.";
  }

  return {
    mood,
    headline,
    subline,
    breakEvenHourly,
    paycheckPercent,
    workHoursToCoverTrip,
    workHoursToCoverPeriod,
    sideHustleHoursTrip,
    sideHustleHoursPeriod,
  };
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatMiles(value: number): string {
  return `${value.toFixed(1)} mi`;
}

export function formatDuration(minutes: number): string {
  const hrs = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hrs === 0) return `${mins} min`;
  if (mins === 0) return `${hrs} hr`;
  return `${hrs} hr ${mins} min`;
}

export function formatHours(value: number): string {
  if (value < 1) return `${Math.round(value * 60)} min`;
  return `${value.toFixed(1)} hr`;
}
