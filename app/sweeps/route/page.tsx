"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import SweepsSubnav from "@/components/sweeps/SweepsSubnav";
import { useSweeps } from "@/components/sweeps/SweepsProvider";
import { formatDuration, formatMiles } from "@/lib/calculations";
import { googleMapsDirectionsUrl, type ResolvedStop } from "@/lib/externalMaps";
import { planRoute, useGeolocation } from "@/lib/sweepsApi";
import type { PlanRouteResult } from "@/types/sweeps";
import type { Stop } from "@/types";

const JobsMap = dynamic(() => import("@/components/sweeps/JobsMap"), { ssr: false });

function jobAddress(job: {
  full_address: string | null;
  street: string | null;
  city_state: string | null;
  zip_code: string | null;
  lat: number | null;
  lng: number | null;
}): string {
  if (job.full_address?.trim()) return job.full_address.trim();
  const parts = [job.street, job.city_state, job.zip_code].filter(Boolean);
  if (parts.length > 0) return parts.join(", ");
  if (job.lat != null && job.lng != null) return `${job.lat},${job.lng}`;
  return "";
}

function buildRouteStops(
  origin: { lat: number; lng: number },
  orderedJobIds: string[],
  jobs: {
    id: string;
    full_address: string | null;
    street: string | null;
    city_state: string | null;
    zip_code: string | null;
    lat: number | null;
    lng: number | null;
  }[]
): Stop[] {
  const jobById = new Map(jobs.map((j) => [j.id, j]));
  const stops: Stop[] = [
    {
      id: "origin",
      label: "",
      coordinates: [origin.lng, origin.lat],
    },
  ];
  for (const id of orderedJobIds) {
    const job = jobById.get(id);
    if (!job || job.lat == null || job.lng == null) continue;
    const address = jobAddress(job);
    if (!address) continue;
    stops.push({
      id: job.id,
      label: address,
      coordinates: [job.lng, job.lat],
    });
  }
  return stops;
}

export default function RoutePlannerPage() {
  const { activeJobs, loading } = useSweeps();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(null);
  const [route, setRoute] = useState<PlanRouteResult | null>(null);
  const [planning, setPlanning] = useState(false);

  useEffect(() => {
    useGeolocation().then(setOrigin).catch(() => null);
  }, []);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setRoute(null);
  };

  const handlePlan = async () => {
    if (!origin || selected.size === 0) return;
    setPlanning(true);
    try {
      const result = await planRoute([...selected], origin);
      setRoute(result);
    } finally {
      setPlanning(false);
    }
  };

  const selectedJobs = activeJobs.filter((j) => selected.has(j.id));
  const mapStops =
    route && origin ? buildRouteStops(origin, route.ordered_job_ids, activeJobs) : [];
  const resolvedStops = mapStops.filter(
    (s): s is ResolvedStop => s.coordinates !== null
  );
  const googleMapsUrl = googleMapsDirectionsUrl(resolvedStops, true);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteNav />
        <main className="flex-1 p-8 font-mono text-sm">Loading…</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />
      <main className="flex-1 max-w-6xl mx-auto w-full p-4 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/sweeps" className="font-mono text-xs uppercase hover:underline">
            ← Back to jobs
          </Link>
          <SweepsSubnav />
        </div>
        <h1 className="font-display text-2xl font-bold">Multi-Job Route Planner</h1>
        <p className="text-sm text-muted">
          Select jobs to plan a driving route from your current location.
        </p>

        <div className="grid lg:grid-cols-2 gap-6">
          <section className="space-y-2">
            {activeJobs.map((job) => (
              <label
                key={job.id}
                className={`flex items-center gap-3 border-2 border-ink p-3 cursor-pointer ${
                  selected.has(job.id) ? "bg-cta/20" : "bg-surface"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected.has(job.id)}
                  onChange={() => toggle(job.id)}
                />
                <span className="text-sm">
                  <strong>{job.category}</strong> — {job.street}
                </span>
              </label>
            ))}
            <button
              type="button"
              disabled={selected.size === 0 || !origin || planning}
              onClick={handlePlan}
              className="border-2 border-ink bg-cta px-4 py-2 font-mono text-xs uppercase disabled:opacity-50"
            >
              {planning ? "Planning…" : `Plan route (${selected.size} jobs)`}
            </button>
          </section>

          <section className="space-y-3">
            {route && (
              <div className="border-3 border-ink p-4 font-mono text-sm space-y-3">
                <div className="space-y-1">
                  <p>Total: {formatMiles(route.total_distance_miles)}</p>
                  <p>Time: {formatDuration(route.total_duration_minutes)}</p>
                  {route.legs.map((leg) => (
                    <p key={leg.job_id} className="text-muted">
                      {leg.label}: {formatMiles(leg.distance_miles)}
                    </p>
                  ))}
                </div>
                {googleMapsUrl && (
                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block border-2 border-ink bg-cta px-4 py-2 font-mono text-xs uppercase hover:translate-x-0.5 hover:translate-y-0.5 transition-transform"
                  >
                    Open in Google Maps
                  </a>
                )}
              </div>
            )}
            <JobsMap
              jobs={selectedJobs}
              origin={origin}
              routeGeometry={route?.geometry ?? null}
              height="400px"
            />
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
