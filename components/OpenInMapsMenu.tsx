"use client";

import { useEffect, useRef, useState } from "react";
import {
  appleMapsDirectionsUrl,
  googleMapsDirectionsUrl,
  type ResolvedStop,
  wazeDirectionsUrl,
} from "@/lib/externalMaps";
import type { Stop } from "@/types";

interface OpenInMapsMenuProps {
  stops: Stop[];
  roundTrip: boolean;
}

const MAP_OPTIONS = [
  {
    id: "google",
    label: "Google Maps",
    getUrl: googleMapsDirectionsUrl,
  },
  {
    id: "apple",
    label: "Apple Maps",
    getUrl: appleMapsDirectionsUrl,
  },
  {
    id: "waze",
    label: "Waze (final stop only)",
    getUrl: wazeDirectionsUrl,
  },
] as const;

export default function OpenInMapsMenu({ stops, roundTrip }: OpenInMapsMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const resolvedStops = stops.filter(
    (s): s is ResolvedStop => s.coordinates !== null
  );

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  if (resolvedStops.length < 2) return null;

  function openProvider(getUrl: typeof googleMapsDirectionsUrl) {
    const url = getUrl(resolvedStops, roundTrip);
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="w-full border-3 border-ink bg-surface px-4 py-2 font-mono text-xs uppercase hover:bg-cta/20 transition-colors shadow-brutal-sm"
      >
        Open in Maps ▾
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 right-0 z-20 mt-2 border-3 border-ink bg-surface shadow-brutal"
        >
          {MAP_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              role="menuitem"
              onClick={() => openProvider(option.getUrl)}
              className="block w-full text-left px-4 py-3 font-mono text-xs uppercase border-b border-ink/10 last:border-b-0 hover:bg-cta/20 transition-colors"
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
