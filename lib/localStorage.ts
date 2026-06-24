import type { CostSettings, SavedPreferences, Stop } from "@/types";

const STORAGE_KEY = "gas-in-this-economy-prefs";

export const DEFAULT_COST_SETTINGS: CostSettings = {
  gasPricePerGallon: 3.5,
  mpg: 25,
  includeMaintenance: true,
  maintenancePerMile: 0.1,
  includeTimeValue: false,
  hourlyRate: 25,
  includeHourlySalary: false,
  hourlySalary: 0,
  includeSideHustle: false,
  sideHustleRate: 0,
  roundTrip: true,
  frequency: { count: 1, unit: "week" },
};

function createStop(label = ""): Stop {
  return {
    id: crypto.randomUUID(),
    label,
    coordinates: null,
  };
}

export function createDefaultStops(): Stop[] {
  return [createStop(), createStop()];
}

export function migrateCostSettings(
  saved: Partial<CostSettings>
): CostSettings {
  const merged = { ...DEFAULT_COST_SETTINGS, ...saved };
  if (saved.includeHourlySalary === undefined) {
    merged.includeHourlySalary = merged.hourlySalary > 0;
  }
  if (saved.includeSideHustle === undefined) {
    merged.includeSideHustle = merged.sideHustleRate > 0;
  }
  return merged;
}

export function loadPreferences(): SavedPreferences | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedPreferences;
    if (parsed.costSettings) {
      parsed.costSettings = migrateCostSettings(parsed.costSettings);
    }
    return parsed;
  } catch {
    return null;
  }
}

export function savePreferences(prefs: SavedPreferences): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

export function clearPreferences(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
