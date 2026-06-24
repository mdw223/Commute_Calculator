"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import dynamic from "next/dynamic";
import { useSyncExternalStore, useState } from "react";
import type { Coordinates, Stop } from "@/types";
import StopRow, { StopRowStatic } from "./StopRow";

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

const subscribe = () => () => {};

export default function StopList({
  stops,
  roundTrip,
  onStopsChange,
  onRoundTripChange,
}: StopListProps) {
  const [modalStopId, setModalStopId] = useState<string | null>(null);
  const [modalQuery, setModalQuery] = useState("");
  const dndReady = useSyncExternalStore(subscribe, () => true, () => false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = stops.findIndex((s) => s.id === active.id);
    const newIndex = stops.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    onStopsChange(arrayMove(stops, oldIndex, newIndex));
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

  const startCoordinates = stops[0]?.coordinates ?? null;
  const canReorder = stops.length >= 2;
  const canRemove = stops.length > 2;

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

      {dndReady ? (
        <DndContext
          id="route-stops"
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={stops.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-4">
              {stops.map((stop, index) => (
                <StopRow
                  key={stop.id}
                  stop={stop}
                  index={index}
                  total={stops.length}
                  canReorder={canReorder}
                  canRemove={canRemove}
                  geocodeFocus={startCoordinates}
                  onChange={(label, coords) =>
                    updateStop(stop.id, label, coords)
                  }
                  onMapPickRequest={(q) => openMapPicker(stop.id, q)}
                  onRemove={() => removeStop(stop.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="space-y-4">
          {stops.map((stop, index) => (
            <StopRowStatic
              key={stop.id}
              stop={stop}
              index={index}
              total={stops.length}
              canReorder={canReorder}
              canRemove={canRemove}
              geocodeFocus={startCoordinates}
              onChange={(label, coords) =>
                updateStop(stop.id, label, coords)
              }
              onMapPickRequest={(q) => openMapPicker(stop.id, q)}
              onRemove={() => removeStop(stop.id)}
            />
          ))}
        </div>
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
