import type { SalaryField } from "@/types";

export interface SalaryAmounts {
  hourly: number;
  weekly: number;
  monthly: number;
  yearly: number;
}

export interface SalarySettings {
  hoursPerWeek: number;
  weeksPerYear: number;
}

// 2024 US federal income tax brackets — single filer (approximate estimate only)
const FEDERAL_BRACKETS_SINGLE_2024: { upTo: number; rate: number }[] = [
  { upTo: 11_600, rate: 0.1 },
  { upTo: 47_150, rate: 0.12 },
  { upTo: 100_525, rate: 0.22 },
  { upTo: 191_950, rate: 0.24 },
  { upTo: 243_725, rate: 0.32 },
  { upTo: 609_350, rate: 0.35 },
  { upTo: Infinity, rate: 0.37 },
];

export function isValidSalaryAmount(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

export function parseSalaryInput(raw: string | number): number | null {
  const trimmed = String(raw).trim().replace(/,/g, "");
  if (!trimmed) return null;
  const value = parseFloat(trimmed);
  if (!isValidSalaryAmount(value)) return null;
  return value;
}

export function formatSalaryInput(value: number): string {
  if (!isValidSalaryAmount(value)) return "";
  return value.toFixed(2);
}

export function annualHours(settings: SalarySettings): number {
  return settings.hoursPerWeek * settings.weeksPerYear;
}

export function amountsFromHourly(
  hourly: number,
  settings: SalarySettings
): SalaryAmounts {
  const weekly = hourly * settings.hoursPerWeek;
  const yearly = hourly * annualHours(settings);
  const monthly = yearly / 12;
  return { hourly, weekly, monthly, yearly };
}

export function amountsFromWeekly(
  weekly: number,
  settings: SalarySettings
): SalaryAmounts | null {
  if (settings.hoursPerWeek <= 0) return null;
  return amountsFromHourly(weekly / settings.hoursPerWeek, settings);
}

export function amountsFromMonthly(
  monthly: number,
  settings: SalarySettings
): SalaryAmounts | null {
  return amountsFromYearly(monthly * 12, settings);
}

export function amountsFromYearly(
  yearly: number,
  settings: SalarySettings
): SalaryAmounts | null {
  const hours = annualHours(settings);
  if (hours <= 0) return null;
  return amountsFromHourly(yearly / hours, settings);
}

export function amountsFromField(
  field: SalaryField,
  value: number,
  settings: SalarySettings
): SalaryAmounts | null {
  switch (field) {
    case "hourly":
      return amountsFromHourly(value, settings);
    case "weekly":
      return amountsFromWeekly(value, settings);
    case "monthly":
      return amountsFromMonthly(value, settings);
    case "yearly":
      return amountsFromYearly(value, settings);
  }
}

export function amountsToStrings(amounts: SalaryAmounts): Record<SalaryField, string> {
  return {
    hourly: formatSalaryInput(amounts.hourly),
    weekly: formatSalaryInput(amounts.weekly),
    monthly: formatSalaryInput(amounts.monthly),
    yearly: formatSalaryInput(amounts.yearly),
  };
}

export function federalIncomeTax(yearlyGross: number): number {
  if (!isValidSalaryAmount(yearlyGross)) return 0;

  let tax = 0;
  let previousLimit = 0;

  for (const bracket of FEDERAL_BRACKETS_SINGLE_2024) {
    const taxableInBracket = Math.min(yearlyGross, bracket.upTo) - previousLimit;
    if (taxableInBracket <= 0) break;
    tax += taxableInBracket * bracket.rate;
    previousLimit = bracket.upTo;
    if (yearlyGross <= bracket.upTo) break;
  }

  return tax;
}

export function estimateEffectiveTaxRate(yearlyGross: number): number {
  if (!isValidSalaryAmount(yearlyGross)) return 0;
  const tax = federalIncomeTax(yearlyGross);
  return Math.round((tax / yearlyGross) * 1000) / 10;
}

export function takeHomeAmount(gross: number, taxRate: number): number {
  if (!isValidSalaryAmount(gross)) return 0;
  const clampedRate = Math.min(100, Math.max(0, taxRate));
  return gross * (1 - clampedRate / 100);
}
