"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { POI_CATEGORIES } from "@/lib/poiCategories";
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  fixLeafletIcons,
  formatDistanceMeters,
  OSM_ATTRIBUTION,
  OSM_TILE_URL,
} from "@/lib/leaflet";
import type { Coordinates, PoiSuggestion } from "@/types";

interface LocationPickerModalProps {
  open: boolean;
  initialQuery: string;
  startCoordinates: Coordinates | null;
  onClose: () => void;
  onSelect: (label: string, coordinates: Coordinates) => void;
}

function toLatLng(coords: Coordinates): [number, number] {
  return [coords[1], coords[0]];
}

function MapEvents({
  onPan,
}: {
  onPan: (center: Coordinates) => void;
}) {
  useMapEvents({
    moveend(e) {
      const c = e.target.getCenter();
      onPan([c.lng, c.lat]);
    },
  });
  return null;
}

function MapViewSync({
  center,
  zoom,
}: {
  center: Coordinates;
  zoom: number;
}) {
  const map = useMap();
  const prev = useRef<string>("");

  useEffect(() => {
    const key = `${center[0]},${center[1]},${zoom}`;
    if (prev.current === key) return;
    prev.current = key;
    map.setView(toLatLng(center), zoom);
  }, [center, zoom, map]);

  return null;
}

function LocationPickerModalContent({
  initialQuery,
  startCoordinates,
  onClose,
  onSelect,
}: Omit<LocationPickerModalProps, "open">) {
  const hasGeolocation =
    typeof navigator !== "undefined" && !!navigator.geolocation;

  const [query, setQuery] = useState(initialQuery);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [results, setResults] = useState<PoiSuggestion[]>([]);
  const [highlighted, setHighlighted] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geoDenied, setGeoDenied] = useState(
    () => !startCoordinates && !hasGeolocation
  );
  const [userPanned, setUserPanned] = useState(false);
  const [searchCenter, setSearchCenter] = useState<Coordinates>(() =>
    startCoordinates ?? DEFAULT_MAP_CENTER
  );
  const [mapZoom, setMapZoom] = useState(() =>
    startCoordinates ? 13 : DEFAULT_MAP_ZOOM
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fixLeafletIcons();
  }, []);

  useEffect(() => {
    if (startCoordinates || !hasGeolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setSearchCenter([pos.coords.longitude, pos.coords.latitude]);
        setMapZoom(13);
      },
      () => {
        setGeoDenied(true);
      },
      { enableHighAccuracy: false, timeout: 8000 }
    );
  }, [startCoordinates, hasGeolocation]);

  const canSearch =
    !geoDenied || startCoordinates != null || userPanned;

  const fetchPois = useCallback(async () => {
    if (!canSearch) return;

    const hasQuery = query.trim().length > 0;
    const categoryIds = POI_CATEGORIES.filter((c) =>
      selectedCategories.includes(c.id)
    ).flatMap((c) => c.categoryIds);

    if (!hasQuery && categoryIds.length === 0) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      if (hasQuery && categoryIds.length === 0) {
        const res = await fetch("/api/geocode", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: query.trim() }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error ?? "Search failed");
        }
        setResults(
          (data.suggestions ?? []).map(
            (s: { label: string; coordinates: Coordinates }) => ({
              label: s.label,
              coordinates: s.coordinates,
            })
          )
        );
        setHighlighted(null);
        return;
      }

      const res = await fetch("/api/pois", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          center: searchCenter,
          name: hasQuery ? query.trim() : undefined,
          categoryIds: categoryIds.length ? categoryIds : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Search failed");
      }
      let found: PoiSuggestion[] = data.results ?? [];
      if (hasQuery) {
        const needle = query.trim().toLowerCase();
        found = found.filter((p) => p.label.toLowerCase().includes(needle));
      }
      setResults(found);
      setHighlighted(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [canSearch, searchCenter, query, selectedCategories]);

  useEffect(() => {
    if (!canSearch) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchPois(), 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [canSearch, fetchPois]);

  function toggleCategory(id: string) {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }

  function handlePan(center: Coordinates) {
    setUserPanned(true);
    setSearchCenter(center);
  }

  function handleSelect(poi: PoiSuggestion) {
    onSelect(poi.label, poi.coordinates);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-ink/60"
      role="dialog"
      aria-modal="true"
      aria-label="Search places on map"
    >
      <div className="w-full max-w-5xl max-h-[95vh] border-4 border-ink bg-surface shadow-brutal flex flex-col overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b-3 border-ink px-4 py-3">
          <h2 className="font-display font-bold uppercase text-headline text-sm sm:text-base">
            Search on map
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="border-3 border-ink px-3 py-1 font-mono text-xs uppercase hover:bg-headline hover:text-newsprint transition-colors"
          >
            Close
          </button>
        </div>

        <div className="px-4 py-3 border-b-3 border-ink space-y-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Coffee shop, Target, CVS…"
            className="w-full border-3 border-ink bg-surface px-3 py-2 text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-headline"
            autoFocus
          />
          <div className="flex flex-wrap gap-2">
            {POI_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => toggleCategory(cat.id)}
                className={`border-3 border-ink px-3 py-1 font-mono text-xs uppercase transition-colors ${
                  selectedCategories.includes(cat.id)
                    ? "bg-cta text-ink"
                    : "bg-surface hover:bg-cta/20"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
          {geoDenied && !startCoordinates && !userPanned && (
            <p className="text-sm text-headline border-l-4 border-headline pl-3">
              Can&apos;t get your location — pan the map to where you&apos;re
              searching, then try again.
            </p>
          )}
        </div>

        <div className="flex flex-col md:flex-row flex-1 min-h-0">
          <div className="md:w-[40%] flex flex-col border-b-3 md:border-b-0 md:border-r-3 border-ink min-h-[180px] md:min-h-[400px] max-h-[40vh] md:max-h-none">
            {loading && (
              <p className="px-4 py-3 text-sm text-muted font-mono">Searching…</p>
            )}
            {error && (
              <p className="px-4 py-3 text-sm text-headline font-mono">{error}</p>
            )}
            {!loading && !error && results.length === 0 && canSearch && (
              <p className="px-4 py-3 text-sm text-muted">
                {query.trim() || selectedCategories.length
                  ? "No places found. Try a different search or pan the map."
                  : "Type a name or pick a category to search nearby."}
              </p>
            )}
            <ul className="overflow-y-auto flex-1">
              {results.map((poi, i) => (
                <li key={`${poi.label}-${i}`}>
                  <button
                    type="button"
                    onClick={() => handleSelect(poi)}
                    onMouseEnter={() => setHighlighted(i)}
                    onMouseLeave={() => setHighlighted(null)}
                    className={`w-full text-left px-4 py-3 border-b border-ink/10 transition-colors ${
                      highlighted === i ? "bg-cta/40" : "hover:bg-cta/20"
                    }`}
                  >
                    <span className="block text-sm font-medium">{poi.label}</span>
                    {poi.distanceMeters != null && (
                      <span className="block text-xs text-muted font-mono mt-0.5">
                        {formatDistanceMeters(poi.distanceMeters)} away
                        {poi.category ? ` · ${poi.category}` : ""}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:w-[60%] min-h-[250px] md:min-h-[400px] flex-1">
            <MapContainer
              center={toLatLng(searchCenter)}
              zoom={mapZoom}
              className="h-full w-full"
              scrollWheelZoom
            >
              <TileLayer url={OSM_TILE_URL} attribution={OSM_ATTRIBUTION} />
              <MapViewSync center={searchCenter} zoom={mapZoom} />
              <MapEvents onPan={handlePan} />
              {results.map((poi, i) => (
                <Marker
                  key={`${poi.coordinates[0]}-${poi.coordinates[1]}-${i}`}
                  position={toLatLng(poi.coordinates)}
                  eventHandlers={{
                    click: () => handleSelect(poi),
                    mouseover: () => setHighlighted(i),
                    mouseout: () => setHighlighted(null),
                  }}
                  opacity={highlighted === null || highlighted === i ? 1 : 0.5}
                />
              ))}
            </MapContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LocationPickerModal({
  open,
  initialQuery,
  startCoordinates,
  onClose,
  onSelect,
}: LocationPickerModalProps) {
  if (!open) return null;

  return (
    <LocationPickerModalContent
      key={`${initialQuery}-${startCoordinates?.join(",") ?? "no-start"}`}
      initialQuery={initialQuery}
      startCoordinates={startCoordinates}
      onClose={onClose}
      onSelect={onSelect}
    />
  );
}
