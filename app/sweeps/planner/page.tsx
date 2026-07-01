"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import SweepsSubnav from "@/components/sweeps/SweepsSubnav";
import { useSweeps } from "@/components/sweeps/SweepsProvider";
import { getDayPlan } from "@/lib/sweepsApi";
import type { DayPlan } from "@/types/sweeps";

const JobsMap = dynamic(() => import("@/components/sweeps/JobsMap"), { ssr: false });

export default function DayPlannerPage() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [plan, setPlan] = useState<DayPlan | null>(null);

  useEffect(() => {
    getDayPlan(date).then(setPlan).catch(() => setPlan(null));
  }, [date]);

  const jobItems = plan?.items.filter((i) => i.type === "job") ?? [];
  const mapJobs = jobItems
    .filter((i) => i.lat != null && i.lng != null)
    .map((i) => ({
      id: i.id,
      category: i.title,
      details: null,
      sweepers_requested: null,
      street: null,
      city_state: null,
      zip_code: null,
      full_address: null,
      lat: i.lat!,
      lng: i.lng!,
      start_at: i.start,
      duration_minutes: null,
      flexible_time: false,
      job_url: null,
      subject: null,
      status: "new" as const,
      pay_amount: null,
      drive_distance_miles: null,
      drive_duration_minutes: null,
      gas_cost: null,
      worth_it_mood: null,
      parsed_at: "",
      expires_at: null,
      sweeps_job_id: null,
      has_calendar_event: false,
      calendar_conflict: null,
    }));

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
        <h1 className="font-display text-2xl font-bold">Day Planner</h1>

        <label className="font-mono text-sm">
          Date{" "}
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border-2 border-ink px-2 py-1 ml-2"
          />
        </label>

        <div className="grid lg:grid-cols-2 gap-6">
          <section className="space-y-2">
            {!plan || plan.items.length === 0 ? (
              <p className="font-mono text-sm text-muted">Nothing scheduled this day.</p>
            ) : (
              plan.items.map((item) => (
                <div
                  key={`${item.type}-${item.id}`}
                  className={`border-2 border-ink p-3 ${
                    item.type === "job" ? "bg-cta/10" : "bg-surface"
                  }`}
                >
                  <span className="font-mono text-[10px] uppercase text-muted">
                    {item.type}
                  </span>
                  <p className="font-bold">{item.title}</p>
                  {item.start && (
                    <p className="font-mono text-xs">
                      {new Date(item.start).toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                      {item.end &&
                        ` – ${new Date(item.end).toLocaleTimeString([], {
                          hour: "numeric",
                          minute: "2-digit",
                        })}`}
                    </p>
                  )}
                  {item.type === "job" && (
                    <Link
                      href={`/sweeps/jobs/${item.id}`}
                      className="text-xs underline mt-1 inline-block"
                    >
                      View job
                    </Link>
                  )}
                </div>
              ))
            )}
          </section>

          <JobsMap jobs={mapJobs} height="400px" />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
