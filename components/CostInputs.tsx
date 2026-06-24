"use client";

import type { CostSettings, FrequencyUnit } from "@/types";

interface CostInputsProps {
  settings: CostSettings;
  onChange: (settings: CostSettings) => void;
}

export default function CostInputs({ settings, onChange }: CostInputsProps) {
  function update<K extends keyof CostSettings>(key: K, value: CostSettings[K]) {
    onChange({ ...settings, [key]: value });
  }

  return (
    <div className="space-y-5">
      <p className="font-mono text-xs uppercase tracking-widest text-headline">
        ★ Your Ride, Your Rules ★
      </p>

      <div>
        <div className="flex justify-between items-baseline mb-1">
          <label className="font-mono text-xs uppercase tracking-wider">
            Gas price / gallon
          </label>
          <span className="font-display text-lg font-bold text-headline">
            ${settings.gasPricePerGallon.toFixed(2)}
          </span>
        </div>
        <input
          type="range"
          min={2}
          max={7}
          step={0.1}
          value={settings.gasPricePerGallon}
          onChange={(e) =>
            update("gasPricePerGallon", parseFloat(e.target.value))
          }
          className="w-full accent-headline"
        />
        <div className="flex justify-between text-xs text-muted font-mono mt-1">
          <span>$2.00</span>
          <span>$7.00</span>
        </div>
      </div>

      <div>
        <label className="block font-mono text-xs uppercase tracking-wider mb-1">
          Car MPG
        </label>
        <input
          type="number"
          min={1}
          max={200}
          value={settings.mpg}
          onChange={(e) => update("mpg", parseFloat(e.target.value) || 25)}
          className="w-full border-3 border-ink bg-surface px-3 py-2 focus:outline-none focus:ring-2 focus:ring-headline"
        />
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={settings.includeMaintenance}
          onChange={(e) => update("includeMaintenance", e.target.checked)}
          className="w-4 h-4 accent-headline"
        />
        <span className="font-mono text-xs uppercase">
          Include maintenance wear &amp; tear
        </span>
      </label>

      {settings.includeMaintenance && (
        <div>
          <div className="flex justify-between items-baseline mb-1">
            <label className="font-mono text-xs uppercase tracking-wider">
              Maintenance ($/mile)
            </label>
            <span className="font-display text-lg font-bold text-headline">
              ${settings.maintenancePerMile.toFixed(2)}
            </span>
          </div>
          <input
            type="range"
            min={0.05}
            max={0.25}
            step={0.01}
            value={settings.maintenancePerMile}
            onChange={(e) =>
              update("maintenancePerMile", parseFloat(e.target.value))
            }
            className="w-full accent-headline"
          />
          <div className="flex justify-between text-xs text-muted font-mono mt-1">
            <span>$0.05</span>
            <span>$0.25</span>
          </div>
          <p className="text-sm text-muted mt-2 border-l-4 border-headline pl-3">
            Tires, oil, your car slowly giving up — industry ballpark is ~$0.10/mi.
          </p>
        </div>
      )}

      {!settings.includeMaintenance && (
        <p className="text-sm text-muted border-l-4 border-headline pl-3">
          Maintenance excluded from your total. We&apos;ll still show you what it
          would&apos;ve cost — the math ain&apos;t optional, bestie.
        </p>
      )}

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={settings.includeTimeValue}
          onChange={(e) => update("includeTimeValue", e.target.checked)}
          className="w-4 h-4 accent-headline"
        />
        <span className="font-mono text-xs uppercase">
          Count my time as money
        </span>
      </label>

      {settings.includeTimeValue && (
        <div>
          <label className="block font-mono text-xs uppercase tracking-wider mb-1">
            Your time worth ($/hr)
          </label>
          <input
            type="number"
            min={0}
            step={1}
            value={settings.hourlyRate || ""}
            onChange={(e) =>
              update("hourlyRate", parseFloat(e.target.value) || 0)
            }
            className="w-full border-3 border-ink bg-surface px-3 py-2 focus:outline-none focus:ring-2 focus:ring-headline"
            placeholder="25"
          />
        </div>
      )}

      <div>
        <label className="block font-mono text-xs uppercase tracking-wider mb-1">
          Hourly salary (for break-even math)
        </label>
        <input
          type="number"
          min={0}
          step={1}
          value={settings.hourlySalary || ""}
          onChange={(e) =>
            update("hourlySalary", parseFloat(e.target.value) || 0)
          }
          className="w-full border-3 border-ink bg-surface px-3 py-2 focus:outline-none focus:ring-2 focus:ring-headline"
          placeholder="Optional — we need this for the verdict"
        />
      </div>

      <div>
        <label className="block font-mono text-xs uppercase tracking-wider mb-1">
          Side hustle rate ($/hr)
        </label>
        <input
          type="number"
          min={0}
          step={1}
          value={settings.sideHustleRate || ""}
          onChange={(e) =>
            update("sideHustleRate", parseFloat(e.target.value) || 0)
          }
          className="w-full border-3 border-ink bg-surface px-3 py-2 focus:outline-none focus:ring-2 focus:ring-headline"
          placeholder="Etsy, DoorDash, whatever pays"
        />
      </div>

      <div>
        <label className="block font-mono text-xs uppercase tracking-wider mb-2">
          How often you doing this?
        </label>
        <div className="flex gap-2 flex-wrap">
          <input
            type="number"
            min={1}
            max={999}
            value={settings.frequency.count}
            onChange={(e) =>
              update("frequency", {
                ...settings.frequency,
                count: parseInt(e.target.value, 10) || 1,
              })
            }
            className="w-20 border-3 border-ink bg-surface px-3 py-2 focus:outline-none focus:ring-2 focus:ring-headline"
          />
          <span className="self-center text-sm text-muted">times per</span>
          {(["day", "week", "month"] as FrequencyUnit[]).map((unit) => (
            <button
              key={unit}
              type="button"
              onClick={() =>
                update("frequency", { ...settings.frequency, unit })
              }
              className={`border-3 border-ink px-3 py-2 font-mono text-xs uppercase transition-colors ${
                settings.frequency.unit === unit
                  ? "bg-cta text-ink"
                  : "bg-surface hover:bg-cta/20"
              }`}
            >
              {unit}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
