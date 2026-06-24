import type { SalaryCalculatorState } from "@/types";

const STORAGE_KEY = "gas-in-this-economy-salary";

export const DEFAULT_SALARY_STATE: SalaryCalculatorState = {
  hoursPerWeek: 40,
  weeksPerYear: 52,
  showTakeHome: false,
  taxRate: 0,
  taxRateManuallySet: false,
  values: {
    hourly: "",
    weekly: "",
    monthly: "",
    yearly: "",
  },
  lastEditedField: null,
};

const SALARY_FIELDS = ["hourly", "weekly", "monthly", "yearly"] as const;

function isSalaryField(value: unknown): value is (typeof SALARY_FIELDS)[number] {
  return typeof value === "string" && SALARY_FIELDS.includes(value as never);
}

export function loadSalaryState(): SalaryCalculatorState {
  if (typeof window === "undefined") return DEFAULT_SALARY_STATE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SALARY_STATE;
    const parsed = JSON.parse(raw) as Partial<SalaryCalculatorState>;
    return {
      ...DEFAULT_SALARY_STATE,
      ...parsed,
      values: {
        ...DEFAULT_SALARY_STATE.values,
        ...(parsed.values ?? {}),
      },
      lastEditedField: isSalaryField(parsed.lastEditedField)
        ? parsed.lastEditedField
        : null,
    };
  } catch {
    return DEFAULT_SALARY_STATE;
  }
}

export function saveSalaryState(state: SalaryCalculatorState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearSalaryState(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
