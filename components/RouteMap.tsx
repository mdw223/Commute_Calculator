"use client";

import { useEffect, useRef, useState } from "react";
import {
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  useMap,
} from "react-leaflet";
import {
  createNumberedIcon,
  fixLeafletIcons,
  OSM_ATTRIBUTION,
  OSM_TILE_URL,
} from "@/lib/leaflet";
import type { Coordinates, Stop } from "@/types";

interface RouteMapProps {
  stops: Stop[];
}

function toLatLng(coords: Coordinates): [number, number] {
  return [coords[1], coords[0]];
}

function FitBounds({
  positions,
}: {
  positions: [number, number][];
}) {
  const map = useMap();
  const prevKey = useRef("");

  useEffect(() => {
    if (positions.length === 0) return;
    const key = positions.map((p) => p.join(",")).join("|");
    if (key === prevKey.current) return;
    prevKey.current = key;
    map.fitBounds(positions, { padding: [40, 40] });
  }, [positions, map]);

  return null;
}

function RouteMapInner({
  resolvedStops,
}: {
  resolvedStops: (Stop & { coordinates: Coordinates })[];
}) {
  const [geometry, setGeometry] = useState<Coordinates[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const coordsKey = resolvedStops
    .map((s) => s.coordinates.join(","))
    .join("|");

  useEffect(() => {
    fixLeafletIcons();
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const coords = resolvedStops.map((s) => s.coordinates);
        const res = await fetch("/api/route", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ coordinates: coords }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error ?? "Route preview failed");
        }
        setGeometry(data.geometry ?? null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Route preview failed");
        setGeometry(null);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [coordsKey, resolvedStops]);

  const markerPositions = resolvedStops.map((s) => toLatLng(s.coordinates));
  const routePositions = geometry?.map((c) => toLatLng(c)) ?? [];
  const fitPositions = [...markerPositions, ...routePositions];

  return (
    <div className="space-y-2">
      <p className="font-mono text-xs uppercase tracking-widest text-headline">
        ★ Route preview ★
      </p>
      {loading && (
        <p className="text-sm text-muted font-mono">Loading route…</p>
      )}
      {error && (
        <p className="text-sm text-headline font-mono">{error}</p>
      )}
      <div className="border-3 border-ink shadow-brutal h-[280px] sm:h-[320px]">
        <MapContainer
          center={markerPositions[0]}
          zoom={12}
          className="h-full w-full"
          scrollWheelZoom={false}
        >
          <TileLayer url={OSM_TILE_URL} attribution={OSM_ATTRIBUTION} />
          <FitBounds positions={fitPositions} />
          {routePositions.length > 0 && (
            <Polyline
              positions={routePositions}
              pathOptions={{ color: "#dc2626", weight: 5, opacity: 0.9 }}
            />
          )}
          {resolvedStops.map((stop, i) => (
            <Marker
              key={stop.id}
              position={toLatLng(stop.coordinates)}
              icon={createNumberedIcon(i + 1)}
            />
          ))}
        </MapContainer>
      </div>
    </div>
  );
}

export default function RouteMap({ stops }: RouteMapProps) {
  const resolvedStops = stops.filter(
    (s): s is Stop & { coordinates: Coordinates } => s.coordinates !== null
  );

  if (resolvedStops.length < 2) return null;

  const coordsKey = resolvedStops
    .map((s) => s.coordinates.join(","))
    .join("|");

  return <RouteMapInner key={coordsKey} resolvedStops={resolvedStops} />;
}
