import type { CostSettings, SavedPreferences, Stop } from "@/types";

const STORAGE_KEY = "gas-in-this-economy-prefs";

export const DEFAULT_COST_SETTINGS: CostSettings = {
  gasPricePerGallon: 3.5,
  mpg: 25,
  includeTimeValue: false,
  hourlyRate: 25,
  hourlySalary: 0,
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

export function loadPreferences(): SavedPreferences | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SavedPreferences;
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
