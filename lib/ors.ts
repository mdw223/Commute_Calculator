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
  query: string,
  focus?: Coordinates
): Promise<{ label: string; coordinates: Coordinates }[]> {
  const apiKey = getApiKey();
  const url = new URL(`${ORS_BASE}/geocode/autocomplete`);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("text", query);
  url.searchParams.set("size", "5");

  if (focus) {
    const [lng, lat] = focus;
    url.searchParams.set("focus.point.lon", String(lng));
    url.searchParams.set("focus.point.lat", String(lat));
  }

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
  geometry?: Coordinates[];
}

export interface OrsPoiSearchParams {
  center: Coordinates;
  bufferMeters?: number;
  name?: string;
  categoryIds?: number[];
  limit?: number;
}

export interface OrsPoiResult {
  label: string;
  coordinates: Coordinates;
  category?: string;
  distanceMeters?: number;
}

const metersToMiles = (m: number) => m * 0.000621371;
const secondsToMinutes = (s: number) => s / 60;

function parseDirectionsSummary(data: {
  routes?: {
    summary: { distance: number; duration: number };
    segments?: { distance: number; duration: number }[];
  }[];
  features?: {
    properties: {
      summary: { distance: number; duration: number };
      segments?: { distance: number; duration: number }[];
    };
    geometry: { coordinates: Coordinates[] };
  }[];
}): OrsDirectionsResult {
  const route =
    data.routes?.[0] ??
    (data.features?.[0]
      ? {
          summary: data.features[0].properties.summary,
          segments: data.features[0].properties.segments,
        }
      : undefined);

  if (!route) {
    throw new Error("No route found between these stops");
  }

  const geometry =
    data.features?.[0]?.geometry?.coordinates ??
    undefined;

  return {
    totalMiles: metersToMiles(route.summary.distance),
    totalMinutes: secondsToMinutes(route.summary.duration),
    legs: (route.segments ?? []).map((seg) => ({
      distanceMiles: metersToMiles(seg.distance),
      durationMinutes: secondsToMinutes(seg.duration),
    })),
    geometry,
  };
}

export async function getDirections(
  coordinates: Coordinates[]
): Promise<OrsDirectionsResult> {
  const apiKey = getApiKey();
  const res = await fetch(
    `${ORS_BASE}/v2/directions/driving-car/geojson?api_key=${apiKey}`,
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
    features?: {
      properties: {
        summary: { distance: number; duration: number };
        segments?: { distance: number; duration: number }[];
      };
      geometry: { coordinates: Coordinates[] };
    }[];
  };

  return parseDirectionsSummary(data);
}

export async function searchPois(
  params: OrsPoiSearchParams
): Promise<OrsPoiResult[]> {
  const apiKey = getApiKey();
  const filters: { name?: string[]; category_ids?: number[] } = {};
  if (params.name?.trim()) {
    filters.name = [params.name.trim()];
  }
  if (params.categoryIds?.length) {
    filters.category_ids = params.categoryIds;
  }

  const body: Record<string, unknown> = {
    request: "pois",
    geometry: {
      geojson: {
        type: "Point",
        coordinates: params.center,
      },
      buffer: params.bufferMeters ?? 2000,
    },
    limit: params.limit ?? 20,
    sortby: "distance",
  };

  if (Object.keys(filters).length > 0) {
    body.filters = filters;
  }

  const res = await fetch(`${ORS_BASE}/pois?api_key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`POI search failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as {
    features?: {
      properties: {
        name?: string;
        label?: string;
        category?: string;
        distance?: number;
        osm_tags?: { name?: string };
        category_ids?: Record<string, { category_name?: string }>;
      };
      geometry: { coordinates: Coordinates };
    }[];
  };

  return (data.features ?? []).map((f) => {
    const categoryName = f.properties.category_ids
      ? Object.values(f.properties.category_ids)[0]?.category_name
      : undefined;
    return {
      label:
        f.properties.osm_tags?.name ??
        f.properties.label ??
        f.properties.name ??
        "Unknown place",
      coordinates: f.geometry.coordinates,
      category: f.properties.category ?? categoryName,
      distanceMeters: f.properties.distance,
    };
  });
}
