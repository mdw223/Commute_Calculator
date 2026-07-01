"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import { formatDuration, formatMiles } from "@/lib/calculations";
import { listJobs, planRoute, useGeolocation } from "@/lib/sweepsApi";
import type { PlanRouteResult, SweepsJob } from "@/types/sweeps";

const JobsMap = dynamic(() => import("@/components/sweeps/JobsMap"), { ssr: false });

export default function RoutePlannerPage() {
  const [jobs, setJobs] = useState<SweepsJob[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(null);
  const [route, setRoute] = useState<PlanRouteResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    listJobs().then(setJobs).catch(() => null);
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
    setLoading(true);
    try {
      const result = await planRoute([...selected], origin);
      setRoute(result);
    } finally {
      setLoading(false);
    }
  };

  const selectedJobs = jobs.filter((j) => selected.has(j.id));

  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />
      <main className="flex-1 max-w-6xl mx-auto w-full p-4 space-y-6">
        <Link href="/sweeps" className="font-mono text-xs uppercase hover:underline">
          ← Back to jobs
        </Link>
        <h1 className="font-display text-2xl font-bold">Multi-Job Route Planner</h1>
        <p className="text-sm text-muted">
          Select jobs to plan a driving route from your current location.
        </p>

        <div className="grid lg:grid-cols-2 gap-6">
          <section className="space-y-2">
            {jobs.map((job) => (
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
              disabled={selected.size === 0 || !origin || loading}
              onClick={handlePlan}
              className="border-2 border-ink bg-cta px-4 py-2 font-mono text-xs uppercase disabled:opacity-50"
            >
              {loading ? "Planning…" : `Plan route (${selected.size} jobs)`}
            </button>
          </section>

          <section className="space-y-3">
            {route && (
              <div className="border-3 border-ink p-4 font-mono text-sm space-y-1">
                <p>Total: {formatMiles(route.total_distance_miles)}</p>
                <p>Time: {formatDuration(route.total_duration_minutes)}</p>
                {route.legs.map((leg) => (
                  <p key={leg.job_id} className="text-muted">
                    {leg.label}: {formatMiles(leg.distance_miles)}
                  </p>
                ))}
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
