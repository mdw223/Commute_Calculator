"use client";

import { useEffect, useRef, useState } from "react";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { googleMapsEmbedUrl } from "@/lib/externalMaps";
import {
  fixLeafletIcons,
  OSM_ATTRIBUTION,
  OSM_TILE_URL,
} from "@/lib/leaflet";
import type { Coordinates, PoiSuggestion } from "@/types";

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

interface MapPanelToggleProps {
  googlePreviewOpen: boolean;
  onGooglePreviewChange: (open: boolean) => void;
  activeQuery: string;
  hasActiveSearch: boolean;
  searchCenter: Coordinates;
  mapZoom: number;
  results: PoiSuggestion[];
  highlighted: number | null;
  onHighlight: (index: number | null) => void;
  onSelect: (poi: PoiSuggestion) => void;
  onPan: (center: Coordinates) => void;
}

export default function MapPanelToggle({
  googlePreviewOpen,
  onGooglePreviewChange,
  activeQuery,
  hasActiveSearch,
  searchCenter,
  mapZoom,
  results,
  highlighted,
  onHighlight,
  onSelect,
  onPan,
}: MapPanelToggleProps) {
  const [failedQuery, setFailedQuery] = useState<string | null>(null);

  useEffect(() => {
    fixLeafletIcons();
  }, []);

  const embedFailed =
    googlePreviewOpen && failedQuery === activeQuery && activeQuery.length > 0;

  return (
    <div className="relative h-full w-full min-h-[250px] md:min-h-[400px]">
      <div className="absolute top-2 right-2 z-[1000] flex flex-col items-end gap-1">
        {googlePreviewOpen ? (
          <button
            type="button"
            onClick={() => onGooglePreviewChange(false)}
            className="border-3 border-ink bg-surface px-3 py-1 font-mono text-xs uppercase shadow-brutal-sm hover:bg-cta/30 transition-colors"
          >
            Back to our map
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onGooglePreviewChange(true)}
            disabled={!hasActiveSearch}
            className="border-3 border-ink bg-surface px-3 py-1 font-mono text-xs uppercase shadow-brutal-sm hover:bg-cta/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Preview in Google Maps
          </button>
        )}
      </div>

      {googlePreviewOpen && hasActiveSearch ? (
        <div className="h-full w-full flex flex-col">
          {embedFailed ? (
            <p className="p-4 text-sm text-headline font-mono">
              Preview blocked — use Open in Google Maps instead.
            </p>
          ) : (
            <iframe
              title="Google Maps preview"
              src={googleMapsEmbedUrl(activeQuery)}
              className="flex-1 w-full border-0 min-h-[250px] md:min-h-[400px]"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              onError={() => setFailedQuery(activeQuery)}
            />
          )}
        </div>
      ) : (
        <MapContainer
          center={toLatLng(searchCenter)}
          zoom={mapZoom}
          className="h-full w-full"
          scrollWheelZoom
        >
          <TileLayer url={OSM_TILE_URL} attribution={OSM_ATTRIBUTION} />
          <MapViewSync center={searchCenter} zoom={mapZoom} />
          <MapEvents onPan={onPan} />
          {results.map((poi, i) => (
            <Marker
              key={`${poi.coordinates[0]}-${poi.coordinates[1]}-${i}`}
              position={toLatLng(poi.coordinates)}
              eventHandlers={{
                click: () => onSelect(poi),
                mouseover: () => onHighlight(i),
                mouseout: () => onHighlight(null),
              }}
              opacity={highlighted === null || highlighted === i ? 1 : 0.5}
            />
          ))}
        </MapContainer>
      )}
    </div>
  );
}
