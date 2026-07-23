"use client";

import { useEffect, useRef, useState } from "react";
import { computeCommute } from "@/lib/sweepsApi";
import type { CommuteResult } from "@/types/sweeps";

function originJobCacheKey(
  originLat: number,
  originLng: number,
  jobKey: string,
): string {
  return `${originLat.toFixed(5)},${originLng.toFixed(5)}|${jobKey}`;
}

export function useJobCommutes(
  jobIds: string[],
  originLat: number | null,
  originLng: number | null,
): Record<string, CommuteResult> {
  const [commutes, setCommutes] = useState<Record<string, CommuteResult>>({});
  const fetchedKeyRef = useRef<string | null>(null);
  const jobKey = jobIds.join(",");

  useEffect(() => {
    if (originLat == null || originLng == null || !jobKey) return;

    const cacheKey = originJobCacheKey(originLat, originLng, jobKey);
    if (fetchedKeyRef.current === cacheKey) return;
    fetchedKeyRef.current = cacheKey;

    let cancelled = false;
    const origin = { lat: originLat, lng: originLng };
    const ids = jobKey.split(",");

    void (async () => {
      const next: Record<string, CommuteResult> = {};
      for (const jobId of ids) {
        if (cancelled) return;
        try {
          next[jobId] = await computeCommute(jobId, origin);
        } catch {
          // rate limit, missing geocode, etc.
        }
      }
      if (cancelled) return;
      setCommutes(next);
      if (Object.keys(next).length === 0) {
        fetchedKeyRef.current = null;
      }
    })();

    return () => {
      cancelled = true;
      fetchedKeyRef.current = null;
    };
  }, [originLat, originLng, jobKey]);

  return commutes;
}

export function useJobCommute(
  jobId: string | null,
  originLat: number | null,
  originLng: number | null,
  refreshKey: number = 0,
): CommuteResult | null {
  const [commute, setCommute] = useState<CommuteResult | null>(null);
  const fetchedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!jobId || originLat == null || originLng == null) return;

    const cacheKey = `${originJobCacheKey(originLat, originLng, jobId)}|${refreshKey}`;
    if (fetchedKeyRef.current === cacheKey) return;
    fetchedKeyRef.current = cacheKey;

    let cancelled = false;
    void computeCommute(jobId, { lat: originLat, lng: originLng })
      .then((result) => {
        if (!cancelled) setCommute(result);
      })
      .catch(() => {
        fetchedKeyRef.current = null;
      });

    return () => {
      cancelled = true;
      fetchedKeyRef.current = null;
    };
  }, [jobId, originLat, originLng, refreshKey]);

  return commute;
}
