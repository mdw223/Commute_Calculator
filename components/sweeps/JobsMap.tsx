"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import {
  fixLeafletIcons,
  OSM_ATTRIBUTION,
  OSM_TILE_URL,
} from "@/lib/leaflet";
import type { SweepsJob } from "@/types/sweeps";

interface JobsMapProps {
  jobs: SweepsJob[];
  origin?: { lat: number; lng: number } | null;
  routeGeometry?: [number, number][] | null;
  selectedJobId?: string | null;
  onSelectJob?: (id: string) => void;
  height?: string;
}

function toLatLng(lng: number, lat: number): [number, number] {
  return [lat, lng];
}

function FitBounds({ positions }: { positions: [number, number][] }) {
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

function MapResizeHandler() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    const observer = new ResizeObserver(() => {
      map.invalidateSize();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [map]);

  return null;
}

const jobIcon = L.divIcon({
  className: "",
  html: `<div style="background:#dc2626;color:#fff;border:2px solid #000;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:12px;">J</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const selectedIcon = L.divIcon({
  className: "",
  html: `<div style="background:#f59e0b;color:#000;border:3px solid #000;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:14px;">★</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const originIcon = L.divIcon({
  className: "",
  html: `<div style="background:#2563eb;color:#fff;border:2px solid #000;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:10px;">You</div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

export default function JobsMap({
  jobs,
  origin,
  routeGeometry,
  selectedJobId,
  onSelectJob,
  height = "320px",
}: JobsMapProps) {
  useEffect(() => {
    fixLeafletIcons();
  }, []);

  const mappedJobs = useMemo(
    () => jobs.filter((j) => j.lat != null && j.lng != null),
    [jobs],
  );
  const fitPositions = useMemo(() => {
    const markerPositions: [number, number][] = mappedJobs.map((j) =>
      toLatLng(j.lng!, j.lat!)
    );
    if (origin) markerPositions.push(toLatLng(origin.lng, origin.lat));
    const routePositions =
      routeGeometry?.map(([lng, lat]) => toLatLng(lng, lat)) ?? [];
    return [...markerPositions, ...routePositions];
  }, [mappedJobs, origin?.lat, origin?.lng, routeGeometry]);

  const center: [number, number] =
    origin ? toLatLng(origin.lng, origin.lat) : fitPositions[0] ?? [35.7796, -78.6382];

  const routePositions =
    routeGeometry?.map(([lng, lat]) => toLatLng(lng, lat)) ?? [];

  return (
    <div
      className="border-3 border-ink shadow-brutal overflow-hidden"
      style={{ height }}
    >
      <MapContainer center={center} zoom={11} className="h-full w-full" scrollWheelZoom>
        <TileLayer url={OSM_TILE_URL} attribution={OSM_ATTRIBUTION} />
        <MapResizeHandler />
        {fitPositions.length > 0 && <FitBounds positions={fitPositions} />}
        {routePositions.length > 0 && (
          <Polyline
            positions={routePositions}
            pathOptions={{ color: "#dc2626", weight: 5, opacity: 0.9 }}
          />
        )}
        {origin && (
          <Marker position={toLatLng(origin.lng, origin.lat)} icon={originIcon} />
        )}
        {mappedJobs.map((job) => (
          <Marker
            key={job.id}
            position={toLatLng(job.lng!, job.lat!)}
            icon={job.id === selectedJobId ? selectedIcon : jobIcon}
            eventHandlers={{
              click: () => onSelectJob?.(job.id),
            }}
          />
        ))}
      </MapContainer>
    </div>
  );
}
