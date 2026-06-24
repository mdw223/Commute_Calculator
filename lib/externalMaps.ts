import { POI_CATEGORIES } from "@/lib/poiCategories";
import type { Coordinates, Stop } from "@/types";

export type ResolvedStop = Stop & { coordinates: Coordinates };

function stopLocationString(stop: ResolvedStop): string {
  if (stop.label.trim()) return stop.label.trim();
  const [lng, lat] = stop.coordinates;
  return `${lat},${lng}`;
}

export function buildDirectionsSequence(
  stops: ResolvedStop[],
  roundTrip: boolean
): string[] {
  if (stops.length === 0) return [];

  const locations = stops.map(stopLocationString);
  if (
    roundTrip &&
    locations.length >= 2 &&
    locations[0] !== locations[locations.length - 1]
  ) {
    locations.push(locations[0]);
  }
  return locations;
}

export function googleMapsDirectionsUrl(
  stops: ResolvedStop[],
  roundTrip: boolean
): string | null {
  const sequence = buildDirectionsSequence(stops, roundTrip);
  if (sequence.length < 2) return null;

  const origin = sequence[0];
  const destination = sequence[sequence.length - 1];
  const waypoints = sequence.slice(1, -1);

  const params = new URLSearchParams({
    api: "1",
    origin,
    destination,
    travelmode: "driving",
  });
  if (waypoints.length > 0) {
    params.set("waypoints", waypoints.join("|"));
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function appleMapsDirectionsUrl(
  stops: ResolvedStop[],
  roundTrip: boolean
): string | null {
  const sequence = buildDirectionsSequence(stops, roundTrip);
  if (sequence.length < 2) return null;

  const params = new URLSearchParams({ saddr: sequence[0] });
  for (const stop of sequence.slice(1)) {
    params.append("daddr", stop);
  }

  return `https://maps.apple.com/?${params.toString()}`;
}

export function wazeDirectionsUrl(
  stops: ResolvedStop[],
  roundTrip: boolean
): string | null {
  if (stops.length === 0) return null;

  const finalStop =
    roundTrip && stops.length >= 2 ? stops[0] : stops[stops.length - 1];
  const [lng, lat] = finalStop.coordinates;
  const params = new URLSearchParams({
    ll: `${lat},${lng}`,
    navigate: "yes",
  });

  const label = finalStop.label.trim();
  if (label) {
    params.set("q", label);
  }

  return `https://www.waze.com/ul?${params.toString()}`;
}

export function googleMapsSearchUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function appleMapsSearchUrl(query: string): string {
  return `https://maps.apple.com/?q=${encodeURIComponent(query)}`;
}

export function googleMapsEmbedUrl(query: string): string {
  return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
}

export function buildActiveSearchQuery(
  textQuery: string,
  selectedCategoryIds: string[]
): string {
  const trimmed = textQuery.trim();
  if (trimmed) return trimmed;

  return POI_CATEGORIES.filter((c) => selectedCategoryIds.includes(c.id))
    .map((c) => c.label)
    .join(" ");
}
