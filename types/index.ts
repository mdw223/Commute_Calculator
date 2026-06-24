export type Coordinates = [number, number]; // [lng, lat]

export interface Stop {
  id: string;
  label: string;
  coordinates: Coordinates | null;
}

export type FrequencyUnit = "day" | "week" | "month";

export interface FrequencySettings {
  count: number;
  unit: FrequencyUnit;
}

export interface CostSettings {
  gasPricePerGallon: number;
  mpg: number;
  includeMaintenance: boolean;
  maintenancePerMile: number;
  includeTimeValue: boolean;
  hourlyRate: number;
  includeHourlySalary: boolean;
  hourlySalary: number;
  includeSideHustle: boolean;
  sideHustleRate: number;
  roundTrip: boolean;
  frequency: FrequencySettings;
}

export interface RouteLeg {
  distanceMiles: number;
  durationMinutes: number;
}

export interface RouteResult {
  totalMiles: number;
  totalMinutes: number;
  legs: RouteLeg[];
}

export interface CostBreakdown {
  gasCost: number;
  maintenanceCost: number;
  potentialMaintenanceCost: number;
  timeCost: number;
  tripCost: number;
  periodCost: number;
  frequencyMultiplier: number;
  totalMiles: number;
  totalMinutes: number;
}

export type VerdictMood = "good" | "meh" | "bad";

export interface WorthItAnalysis {
  mood: VerdictMood;
  headline: string;
  subline: string;
  breakEvenHourly: number | null;
  paycheckPercent: number | null;
  workHoursToCoverTrip: number | null;
  workHoursToCoverPeriod: number | null;
  sideHustleHoursTrip: number | null;
  sideHustleHoursPeriod: number | null;
}

export interface GeocodeSuggestion {
  label: string;
  coordinates: Coordinates;
}

export interface PoiSuggestion {
  label: string;
  coordinates: Coordinates;
  category?: string;
  distanceMeters?: number;
}

export interface RouteGeometry {
  coordinates: Coordinates[];
}

export interface SavedPreferences {
  stops: Stop[];
  costSettings: CostSettings;
}

export interface SavedRouteResults {
  breakdown: CostBreakdown;
  worthIt: WorthItAnalysis;
  calculatedAt: string;
}

export interface SavedRoute {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  stops: Stop[];
  costSettings: CostSettings;
  lastResults?: SavedRouteResults;
}

export type SalaryField = "hourly" | "weekly" | "monthly" | "yearly";

export interface SalaryCalculatorState {
  hoursPerWeek: number;
  weeksPerYear: number;
  showTakeHome: boolean;
  taxRate: number;
  taxRateManuallySet: boolean;
  values: Record<SalaryField, string>;
  lastEditedField: SalaryField | null;
}
