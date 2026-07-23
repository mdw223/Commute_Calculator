"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import SweepsSubnav from "@/components/sweeps/SweepsSubnav";
import { useSweeps } from "@/components/sweeps/SweepsProvider";
import { updateProfile } from "@/lib/sweepsApi";
import { formatSalaryInput, parseSalaryInput } from "@/lib/salary";

export default function SweepsSettingsPage() {
  const { user, setUser, loading } = useSweeps();
  const [defaultPay, setDefaultPay] = useState("20");
  const [buffer, setBuffer] = useState("30");
  const [mpg, setMpg] = useState("25");
  const [gasPrice, setGasPrice] = useState("3.5");
  const [includeSideHustle, setIncludeSideHustle] = useState(true);
  const [sideHustleRate, setSideHustleRate] = useState("20.00");
  const [includeHourlySalary, setIncludeHourlySalary] = useState(false);
  const [hourlySalary, setHourlySalary] = useState("25.00");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    setDefaultPay(String(user.default_job_pay));
    setBuffer(String(user.travel_buffer_minutes));
    const cs = user.cost_settings as Record<string, number | boolean>;
    if (cs.mpg) setMpg(String(cs.mpg));
    if (cs.gasPricePerGallon) setGasPrice(String(cs.gasPricePerGallon));
    if (typeof cs.includeSideHustle === "boolean") {
      setIncludeSideHustle(cs.includeSideHustle);
    }
    if (cs.sideHustleRate) setSideHustleRate(formatSalaryInput(cs.sideHustleRate as number));
    if (typeof cs.includeHourlySalary === "boolean") {
      setIncludeHourlySalary(cs.includeHourlySalary);
    }
    if (cs.hourlySalary) setHourlySalary(formatSalaryInput(cs.hourlySalary as number));
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    const parsedDefaultPay = parseSalaryInput(defaultPay) ?? 20;
    const updated = await updateProfile({
      default_job_pay: parsedDefaultPay,
      travel_buffer_minutes: Math.round(parseSalaryInput(buffer) ?? 30),
      cost_settings: {
        ...user.cost_settings,
        mpg: parseSalaryInput(mpg) ?? 25,
        gasPricePerGallon: parseSalaryInput(gasPrice) ?? 3.5,
        roundTrip: true,
        includeSideHustle,
        sideHustleRate: parseSalaryInput(sideHustleRate) ?? 20,
        includeHourlySalary,
        hourlySalary: parseSalaryInput(hourlySalary) ?? 25,
      },
    });
    setUser(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />
      <main className="flex-1 max-w-2xl mx-auto w-full p-4 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/sweeps" className="font-mono text-xs uppercase hover:underline">
            ← Back to jobs
          </Link>
          <SweepsSubnav />
        </div>

        <h1 className="font-display text-2xl font-bold">Settings</h1>

        <section className="border-3 border-ink p-6 shadow-brutal space-y-4">
          <h2 className="font-mono text-xs uppercase">Gmail setup</h2>
          <ol className="text-sm space-y-2 list-decimal list-inside">
            <li>Open Gmail → Settings → Filters and Blocked Addresses</li>
            <li>Create filter: <strong>from:newjob@sweeps.jobs</strong></li>
            <li>Apply label: <strong>Sweeps</strong> (create if needed)</li>
            <li>Save — new job emails will appear in your dashboard within a few minutes</li>
          </ol>
        </section>

        <section className="border-3 border-ink p-6 shadow-brutal space-y-4">
          <h2 className="font-mono text-xs uppercase">Job &amp; drive defaults</h2>
          <label className="block text-sm">
            Default Sweeps pay ($)
            <input
              type="text"
              inputMode="decimal"
              value={defaultPay}
              onChange={(e) => setDefaultPay(e.target.value)}
              placeholder="20"
              className="mt-1 w-full border-2 border-ink px-3 py-2 font-mono"
            />
          </label>
          <label className="block text-sm">
            Travel buffer before jobs (minutes)
            <input
              type="text"
              inputMode="numeric"
              value={buffer}
              onChange={(e) => setBuffer(e.target.value)}
              placeholder="30"
              className="mt-1 w-full border-2 border-ink px-3 py-2 font-mono"
            />
          </label>
          <label className="block text-sm">
            MPG
            <input
              type="text"
              inputMode="decimal"
              value={mpg}
              onChange={(e) => setMpg(e.target.value)}
              placeholder="25"
              className="mt-1 w-full border-2 border-ink px-3 py-2 font-mono"
            />
          </label>
          <label className="block text-sm">
            Gas price ($/gal)
            <input
              type="text"
              inputMode="decimal"
              value={gasPrice}
              onChange={(e) => setGasPrice(e.target.value)}
              placeholder="3.50"
              className="mt-1 w-full border-2 border-ink px-3 py-2 font-mono"
            />
          </label>
          <button
            type="button"
            onClick={handleSave}
            className="border-2 border-ink bg-cta px-4 py-2 font-mono text-xs uppercase"
          >
            Save
          </button>
          {saved && <p className="font-mono text-xs text-muted">Saved!</p>}
        </section>

        <section className="border-3 border-ink p-6 shadow-brutal space-y-4">
          <h2 className="font-mono text-xs uppercase">Side hustle opportunity cost</h2>
          <p className="text-sm text-muted">
            While you&apos;re driving to a job, you could be earning money another
            way instead. If a job&apos;s pay doesn&apos;t cover that opportunity
            cost plus gas, we&apos;ll flag it as not worth it. Same setting as the{" "}
            <Link href="/" className="underline">
              commute calculator
            </Link>
            &apos;s hustle rate.
          </p>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includeSideHustle}
              onChange={(e) => setIncludeSideHustle(e.target.checked)}
              className="border-2 border-ink"
            />
            Factor in side hustle opportunity cost
          </label>
          <label className="block text-sm">
            Your hustle rate ($/hr)
            <input
              type="text"
              inputMode="decimal"
              value={sideHustleRate}
              onChange={(e) => setSideHustleRate(e.target.value)}
              disabled={!includeSideHustle}
              placeholder="20.00"
              className="mt-1 w-full border-2 border-ink px-3 py-2 font-mono disabled:opacity-50"
            />
          </label>
          <button
            type="button"
            onClick={handleSave}
            className="border-2 border-ink bg-cta px-4 py-2 font-mono text-xs uppercase"
          >
            Save
          </button>
          {saved && <p className="font-mono text-xs text-muted">Saved!</p>}
        </section>

        <section className="border-3 border-ink p-6 shadow-brutal space-y-4">
          <h2 className="font-mono text-xs uppercase">Compare to your current job</h2>
          <p className="text-sm text-muted">
            If a job&apos;s pay divided by shift + drive time works out to less than
            your current job&apos;s hourly wage, we&apos;ll flag it as not worth it.
          </p>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includeHourlySalary}
              onChange={(e) => setIncludeHourlySalary(e.target.checked)}
              className="border-2 border-ink"
            />
            Compare Sweeps jobs to my current job
          </label>
          <label className="block text-sm">
            Your current job&apos;s hourly wage ($/hr)
            <input
              type="text"
              inputMode="decimal"
              value={hourlySalary}
              onChange={(e) => setHourlySalary(e.target.value)}
              disabled={!includeHourlySalary}
              placeholder="25.00"
              className="mt-1 w-full border-2 border-ink px-3 py-2 font-mono disabled:opacity-50"
            />
          </label>
          <button
            type="button"
            onClick={handleSave}
            className="border-2 border-ink bg-cta px-4 py-2 font-mono text-xs uppercase"
          >
            Save
          </button>
          {saved && <p className="font-mono text-xs text-muted">Saved!</p>}
        </section>
        {loading && <p className="font-mono text-xs text-muted">Loading…</p>}
      </main>
      <SiteFooter />
    </div>
  );
}
