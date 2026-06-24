import { POI_CATEGORIES } from "@/lib/poiCategories";

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
