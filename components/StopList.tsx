"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type { Coordinates, Stop } from "@/types";
import StopInput from "./StopInput";

const RouteMap = dynamic(() => import("./RouteMap"), { ssr: false });
const LocationPickerModal = dynamic(() => import("./LocationPickerModal"), {
  ssr: false,
});

interface StopListProps {
  stops: Stop[];
  roundTrip: boolean;
  onStopsChange: (stops: Stop[]) => void;
  onRoundTripChange: (value: boolean) => void;
}

export default function StopList({
  stops,
  roundTrip,
  onStopsChange,
  onRoundTripChange,
}: StopListProps) {
  const [modalStopId, setModalStopId] = useState<string | null>(null);
  const [modalQuery, setModalQuery] = useState("");

  function updateStop(
    id: string,
    label: string,
    coordinates: Coordinates | null
  ) {
    onStopsChange(
      stops.map((s) => (s.id === id ? { ...s, label, coordinates } : s))
    );
  }

  function addStop() {
    if (stops.length >= 10) return;
    const newStop: Stop = {
      id: crypto.randomUUID(),
      label: "",
      coordinates: null,
    };
    const updated = [...stops];
    updated.splice(stops.length - 1, 0, newStop);
    onStopsChange(updated);
  }

  function removeStop(id: string) {
    if (stops.length <= 2) return;
    onStopsChange(stops.filter((s) => s.id !== id));
  }

  function openMapPicker(stopId: string, initialQuery: string) {
    setModalStopId(stopId);
    setModalQuery(initialQuery);
  }

  function handleMapSelect(label: string, coordinates: Coordinates) {
    if (modalStopId) {
      updateStop(modalStopId, label, coordinates);
    }
    setModalStopId(null);
    setModalQuery("");
  }

  const start = stops[0];
  const end = stops[stops.length - 1];
  const intermediates = stops.slice(1, -1);
  const startCoordinates = start?.coordinates ?? null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="font-mono text-xs uppercase tracking-widest text-headline">
          ★ Classified ★ Route Evidence
        </p>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={roundTrip}
            onChange={(e) => onRoundTripChange(e.target.checked)}
            className="w-4 h-4 accent-headline border-2 border-ink"
          />
          <span className="font-mono text-xs uppercase">Round trip</span>
        </label>
      </div>

      {start && (
        <StopInput
          label="Start"
          value={start.label}
          onChange={(label, coords) => updateStop(start.id, label, coords)}
          onMapPickRequest={(q) => openMapPicker(start.id, q)}
          placeholder="Where you leaving from bestie?"
        />
      )}

      {intermediates.map((stop, i) => (
        <div key={stop.id} className="flex gap-2 items-end">
          <div className="flex-1">
            <StopInput
              label={`Stop ${i + 1}`}
              value={stop.label}
              onChange={(label, coords) => updateStop(stop.id, label, coords)}
              onMapPickRequest={(q) => openMapPicker(stop.id, q)}
              placeholder="Detour? We don't judge."
            />
          </div>
          <button
            type="button"
            onClick={() => removeStop(stop.id)}
            className="shrink-0 border-3 border-ink bg-headline text-newsprint px-3 py-2 font-mono text-xs uppercase hover:bg-ink transition-colors"
            aria-label="Remove stop"
          >
            ✕
          </button>
        </div>
      ))}

      {end && stops.length > 1 && (
        <StopInput
          label="Destination"
          value={end.label}
          onChange={(label, coords) => updateStop(end.id, label, coords)}
          onMapPickRequest={(q) => openMapPicker(end.id, q)}
          placeholder="Where you tryna go?"
        />
      )}

      {stops.length < 10 && (
        <button
          type="button"
          onClick={addStop}
          className="w-full border-3 border-dashed border-ink bg-transparent py-2 font-mono text-xs uppercase text-muted hover:bg-cta/20 transition-colors"
        >
          + Add stop (max 10)
        </button>
      )}

      <RouteMap stops={stops} />

      <LocationPickerModal
        open={modalStopId !== null}
        initialQuery={modalQuery}
        startCoordinates={startCoordinates}
        onClose={() => {
          setModalStopId(null);
          setModalQuery("");
        }}
        onSelect={handleMapSelect}
      />
    </div>
  );
}
