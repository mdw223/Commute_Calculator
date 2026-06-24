"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { getStopLabel, getStopPlaceholder } from "@/lib/stops";
import type { Coordinates, Stop } from "@/types";
import StopInput from "./StopInput";

interface StopRowProps {
  stop: Stop;
  index: number;
  total: number;
  canReorder: boolean;
  canRemove: boolean;
  geocodeFocus?: Coordinates | null;
  onChange: (label: string, coordinates: Coordinates | null) => void;
  onMapPickRequest: (initialQuery: string) => void;
  onRemove: () => void;
}

export function StopRowStatic({
  stop,
  index,
  total,
  canReorder,
  canRemove,
  geocodeFocus,
  onChange,
  onMapPickRequest,
  onRemove,
}: StopRowProps) {
  return (
    <div className="flex gap-2 items-end">
      {canReorder && (
        <div
          className="shrink-0 border-3 border-ink bg-surface px-2 py-2 font-mono text-sm text-muted self-end mb-2"
          aria-hidden
        >
          ⋮⋮
        </div>
      )}

      <div className="flex-1 min-w-0">
        <StopInput
          label={getStopLabel(index, total)}
          value={stop.label}
          onChange={onChange}
          onMapPickRequest={onMapPickRequest}
          geocodeFocus={geocodeFocus}
          placeholder={getStopPlaceholder(index, total)}
        />
      </div>

      {canRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 border-3 border-ink bg-headline text-newsprint px-3 py-2 font-mono text-xs uppercase hover:bg-ink transition-colors"
          aria-label="Remove stop"
        >
          ✕
        </button>
      )}
    </div>
  );
}

export default function StopRow({
  stop,
  index,
  total,
  canReorder,
  canRemove,
  geocodeFocus,
  onChange,
  onMapPickRequest,
  onRemove,
}: StopRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stop.id, disabled: !canReorder });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex gap-2 items-end ${isDragging ? "opacity-60 z-10" : ""}`}
    >
      {canReorder && (
        <button
          type="button"
          ref={setActivatorNodeRef}
          className="shrink-0 border-3 border-ink bg-surface px-2 py-2 font-mono text-sm cursor-grab active:cursor-grabbing hover:bg-cta/20 transition-colors touch-none self-end mb-2"
          aria-label="Drag to reorder"
          {...attributes}
          {...listeners}
        >
          ⋮⋮
        </button>
      )}

      <div className="flex-1 min-w-0">
        <StopInput
          label={getStopLabel(index, total)}
          value={stop.label}
          onChange={onChange}
          onMapPickRequest={onMapPickRequest}
          geocodeFocus={geocodeFocus}
          placeholder={getStopPlaceholder(index, total)}
        />
      </div>

      {canRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 border-3 border-ink bg-headline text-newsprint px-3 py-2 font-mono text-xs uppercase hover:bg-ink transition-colors"
          aria-label="Remove stop"
        >
          ✕
        </button>
      )}
    </div>
  );
}
