import type { Coordinates } from "@/types";

const ORS_BASE = "https://api.openrouteservice.org";

function getApiKey(): string {
  const key = process.env.ORS_API_KEY;
  if (!key) {
    throw new Error("ORS_API_KEY is not configured");
  }
  return key;
}

export interface OrsGeocodeFeature {
  properties: {
    label?: string;
    name?: string;
  };
  geometry: {
    coordinates: Coordinates;
  };
}

export async function geocodeAutocomplete(
  query: string
): Promise<{ label: string; coordinates: Coordinates }[]> {
  const apiKey = getApiKey();
  const url = new URL(`${ORS_BASE}/geocode/autocomplete`);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("text", query);
  url.searchParams.set("size", "5");

  const res = await fetch(url.toString());
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Geocoding failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as { features?: OrsGeocodeFeature[] };
  return (data.features ?? []).map((f) => ({
    label: f.properties.label ?? f.properties.name ?? "Unknown location",
    coordinates: f.geometry.coordinates,
  }));
}

export interface OrsDirectionsResult {
  totalMiles: number;
  totalMinutes: number;
  legs: { distanceMiles: number; durationMinutes: number }[];
}

export async function getDirections(
  coordinates: Coordinates[]
): Promise<OrsDirectionsResult> {
  const apiKey = getApiKey();
  const res = await fetch(
    `${ORS_BASE}/v2/directions/driving-car?api_key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ coordinates }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Directions failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as {
    routes?: {
      summary: { distance: number; duration: number };
      segments?: { distance: number; duration: number }[];
    }[];
  };

  const route = data.routes?.[0];
  if (!route) {
    throw new Error("No route found between these stops");
  }

  const metersToMiles = (m: number) => m * 0.000621371;
  const secondsToMinutes = (s: number) => s / 60;

  return {
    totalMiles: metersToMiles(route.summary.distance),
    totalMinutes: secondsToMinutes(route.summary.duration),
    legs: (route.segments ?? []).map((seg) => ({
      distanceMiles: metersToMiles(seg.distance),
      durationMinutes: secondsToMinutes(seg.duration),
    })),
  };
}
