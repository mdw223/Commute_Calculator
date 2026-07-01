"use client";

import { useEffect, useState } from "react";
import StopInput from "@/components/StopInput";
import { useSweepsOptional } from "@/components/sweeps/SweepsProvider";
import type { Coordinates } from "@/types";

export default function SweepsNavLocation() {
  const sweeps = useSweepsOptional();
  const [value, setValue] = useState("");

  const origin = sweeps?.origin ?? null;
  const originError = sweeps?.originError ?? null;
  const setOriginFromAddress = sweeps?.setOriginFromAddress;
  const refreshOriginFromGps = sweeps?.refreshOriginFromGps;

  useEffect(() => {
    if (origin) setValue(origin.label);
  }, [origin]);

  if (!sweeps?.user || sweeps.loading) return null;

  const geocodeFocus: Coordinates | null = origin
    ? [origin.lng, origin.lat]
    : null;

  return (
    <div className="flex items-center gap-2 flex-1 min-w-[12rem] max-w-md">
      <span className="font-mono text-[10px] uppercase tracking-wider shrink-0 hidden sm:inline">
        From
      </span>
      <div className="flex-1 min-w-0">
        <StopInput
          compact
          label="Starting from"
          value={value}
          onChange={(label, coords) => {
            setValue(label);
            if (coords) setOriginFromAddress?.(label, coords);
          }}
          geocodeFocus={geocodeFocus}
          placeholder="Your address…"
        />
      </div>
      <button
        type="button"
        onClick={() => refreshOriginFromGps?.()}
        className="shrink-0 border-2 border-ink bg-surface px-2 py-1.5 font-mono text-[10px] uppercase hover:bg-cta/20"
        title="Use GPS location"
      >
        GPS
      </button>
      {originError && (
        <span className="font-mono text-[10px] text-headline hidden lg:inline max-w-[8rem] truncate" title={originError}>
          {originError}
        </span>
      )}
    </div>
  );
}
