"use client";

import { useCallback, useEffect, useState } from "react";
import { formatCurrency } from "@/lib/calculations";
import {
  amountsFromField,
  amountsToStrings,
  estimateEffectiveTaxRate,
  parseSalaryInput,
  takeHomeAmount,
} from "@/lib/salary";
import {
  clearSalaryState,
  DEFAULT_SALARY_STATE,
  loadSalaryState,
  saveSalaryState,
} from "@/lib/salaryStorage";
import type { SalaryCalculatorState, SalaryField } from "@/types";

const FIELD_LABELS: Record<SalaryField, string> = {
  hourly: "Hourly rate",
  weekly: "Weekly salary",
  monthly: "Monthly salary",
  yearly: "Yearly salary",
};

const FIELDS: SalaryField[] = ["hourly", "weekly", "monthly", "yearly"];

function getYearlyFromState(state: SalaryCalculatorState): number | null {
  const parsed = parseSalaryInput(state.values.yearly);
  if (parsed != null) return parsed;

  if (!state.lastEditedField) return null;
  const source = parseSalaryInput(state.values[state.lastEditedField]);
  if (source == null) return null;

  const amounts = amountsFromField(state.lastEditedField, source, {
    hoursPerWeek: state.hoursPerWeek,
    weeksPerYear: state.weeksPerYear,
  });
  return amounts?.yearly ?? null;
}

export default function SalaryCalculator() {
  const [state, setState] = useState<SalaryCalculatorState>(DEFAULT_SALARY_STATE);
  const [hydrated, setHydrated] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect -- hydrate salary state from localStorage once on mount */
  useEffect(() => {
    setState(loadSalaryState());
    setHydrated(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!hydrated) return;
    saveSalaryState(state);
  }, [state, hydrated]);

  const recomputeFromField = useCallback(
    (
      prev: SalaryCalculatorState,
      field: SalaryField,
      rawValue: string
    ): SalaryCalculatorState => {
      const nextValues = { ...prev.values, [field]: rawValue };
      const parsed = parseSalaryInput(rawValue);

      if (parsed == null) {
        return {
          ...prev,
          values: { ...nextValues, [field]: rawValue },
          lastEditedField: field,
        };
      }

      const amounts = amountsFromField(field, parsed, {
        hoursPerWeek: prev.hoursPerWeek,
        weeksPerYear: prev.weeksPerYear,
      });

      if (!amounts) {
        return { ...prev, values: nextValues, lastEditedField: field };
      }

      const values = amountsToStrings(amounts);
      values[field] = rawValue;

      let taxRate = prev.taxRate;
      let taxRateManuallySet = prev.taxRateManuallySet;
      if (!taxRateManuallySet) {
        taxRate = estimateEffectiveTaxRate(amounts.yearly);
      }

      return {
        ...prev,
        values,
        lastEditedField: field,
        taxRate,
        taxRateManuallySet,
      };
    },
    []
  );

  const recomputeFromSettings = useCallback((prev: SalaryCalculatorState): SalaryCalculatorState => {
    const anchorField = prev.lastEditedField ?? "hourly";
    const raw = prev.values[anchorField];
    return recomputeFromField(prev, anchorField, raw);
  }, [recomputeFromField]);

  function handleFieldChange(field: SalaryField, rawValue: string) {
    setState((prev) => recomputeFromField(prev, field, rawValue));
  }

  function handleHoursPerWeekChange(raw: string) {
    const value = parseFloat(raw);
    setState((prev) => {
      const hoursPerWeek = Number.isFinite(value) && value > 0 ? value : prev.hoursPerWeek;
      return recomputeFromSettings({ ...prev, hoursPerWeek });
    });
  }

  function handleWeeksPerYearChange(raw: string) {
    const value = parseFloat(raw);
    setState((prev) => {
      const weeksPerYear = Number.isFinite(value) && value > 0 ? value : prev.weeksPerYear;
      return recomputeFromSettings({ ...prev, weeksPerYear });
    });
  }

  function handleTakeHomeToggle(checked: boolean) {
    setState((prev) => {
      if (!checked) {
        return { ...prev, showTakeHome: false };
      }

      const yearly = getYearlyFromState(prev);
      const taxRate =
        prev.taxRateManuallySet || prev.taxRate > 0
          ? prev.taxRate
          : yearly != null
            ? estimateEffectiveTaxRate(yearly)
            : 0;

      return { ...prev, showTakeHome: true, taxRate };
    });
  }

  function handleTaxRateChange(raw: string) {
    const value = parseFloat(raw);
    setState((prev) => ({
      ...prev,
      taxRate: Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0,
      taxRateManuallySet: true,
    }));
  }

  function handleResetTaxRate() {
    setState((prev) => {
      const yearly = getYearlyFromState(prev);
      return {
        ...prev,
        taxRate: yearly != null ? estimateEffectiveTaxRate(yearly) : 0,
        taxRateManuallySet: false,
      };
    });
  }

  function handleClear() {
    clearSalaryState();
    setState(DEFAULT_SALARY_STATE);
  }

  return (
    <div className="border-4 border-ink bg-surface p-6 shadow-brutal space-y-6 min-w-0 max-w-full overflow-hidden">
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-xs uppercase tracking-widest text-headline">
          ★ Your Paycheck, Decoded ★
        </p>
        <button
          type="button"
          onClick={handleClear}
          className="border-3 border-ink bg-surface px-3 py-1 font-mono text-xs uppercase hover:bg-headline hover:text-newsprint transition-colors shrink-0"
        >
          Clear all
        </button>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 min-w-0">
        <div className="min-w-0">
          <label className="block font-mono text-xs uppercase tracking-wider mb-1">
            Hours / week
          </label>
          <input
            type="number"
            min={0.5}
            step={0.5}
            value={state.hoursPerWeek}
            onChange={(e) => handleHoursPerWeekChange(e.target.value)}
            className="w-full border-3 border-ink bg-surface px-3 py-2 focus:outline-none focus:ring-2 focus:ring-headline"
          />
        </div>
        <div className="min-w-0">
          <label className="block font-mono text-xs uppercase tracking-wider mb-1">
            Weeks / year
          </label>
          <input
            type="number"
            min={1}
            step={1}
            value={state.weeksPerYear}
            onChange={(e) => handleWeeksPerYearChange(e.target.value)}
            className="w-full border-3 border-ink bg-surface px-3 py-2 focus:outline-none focus:ring-2 focus:ring-headline"
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 min-w-0">
        {FIELDS.map((field) => {
          const gross = parseSalaryInput(state.values[field]);
          const net =
            gross != null && state.showTakeHome
              ? takeHomeAmount(gross, state.taxRate)
              : null;

          return (
            <div key={field} className="min-w-0">
              <label className="block font-mono text-xs uppercase tracking-wider mb-1">
                {FIELD_LABELS[field]}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted font-mono text-sm">
                  $
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={state.values[field]}
                  onChange={(e) => handleFieldChange(field, e.target.value)}
                  placeholder="0.00"
                  className="w-full border-3 border-ink bg-surface pl-7 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-headline"
                />
              </div>
              {net != null && (
                <p className="mt-1 text-xs text-muted font-mono">
                  Take-home: {formatCurrency(net)}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={state.showTakeHome}
          onChange={(e) => handleTakeHomeToggle(e.target.checked)}
          className="w-4 h-4 accent-headline"
        />
        <span className="font-mono text-xs uppercase">
          Show take-home estimate
        </span>
      </label>

      {state.showTakeHome && (
        <div className="space-y-3 border-l-4 border-headline pl-3 min-w-0 max-w-full">
          <div>
            <label className="block font-mono text-xs uppercase tracking-wider mb-1">
              Estimated tax rate (%)
            </label>
            <input
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={state.taxRate}
              onChange={(e) => handleTaxRateChange(e.target.value)}
              className="w-full max-w-xs border-3 border-ink bg-surface px-3 py-2 focus:outline-none focus:ring-2 focus:ring-headline"
            />
          </div>
          <button
            type="button"
            onClick={handleResetTaxRate}
            className="border-3 border-ink bg-surface px-3 py-1 font-mono text-xs uppercase hover:bg-cta/20 transition-colors"
          >
            Reset to bracket estimate
          </button>
          <p className="text-sm text-muted break-words">
            Rough US federal single-filer estimate from your yearly gross. Not
            tax advice — adjust for your real situation.
          </p>
        </div>
      )}
    </div>
  );
}
