"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import { getMe, updateProfile } from "@/lib/sweepsApi";
import type { SweepsUser } from "@/types/sweeps";

export default function SweepsSettingsPage() {
  const [user, setUser] = useState<SweepsUser | null>(null);
  const [defaultPay, setDefaultPay] = useState(20);
  const [buffer, setBuffer] = useState(30);
  const [mpg, setMpg] = useState(25);
  const [gasPrice, setGasPrice] = useState(3.5);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getMe()
      .then((u) => {
        setUser(u);
        setDefaultPay(u.default_job_pay);
        setBuffer(u.travel_buffer_minutes);
        const cs = u.cost_settings as Record<string, number>;
        if (cs.mpg) setMpg(cs.mpg);
        if (cs.gasPricePerGallon) setGasPrice(cs.gasPricePerGallon);
      })
      .catch(() => null);
  }, []);

  const handleSave = async () => {
    if (!user) return;
    const updated = await updateProfile({
      default_job_pay: defaultPay,
      travel_buffer_minutes: buffer,
      cost_settings: {
        ...user.cost_settings,
        mpg,
        gasPricePerGallon: gasPrice,
        roundTrip: true,
        includeSideHustle: true,
        sideHustleRate: defaultPay,
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
        <Link href="/sweeps" className="font-mono text-xs uppercase hover:underline">
          ← Back to jobs
        </Link>

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
              type="number"
              value={defaultPay}
              onChange={(e) => setDefaultPay(Number(e.target.value))}
              className="mt-1 w-full border-2 border-ink px-3 py-2 font-mono"
            />
          </label>
          <label className="block text-sm">
            Travel buffer before jobs (minutes)
            <input
              type="number"
              value={buffer}
              onChange={(e) => setBuffer(Number(e.target.value))}
              className="mt-1 w-full border-2 border-ink px-3 py-2 font-mono"
            />
          </label>
          <label className="block text-sm">
            MPG
            <input
              type="number"
              value={mpg}
              onChange={(e) => setMpg(Number(e.target.value))}
              className="mt-1 w-full border-2 border-ink px-3 py-2 font-mono"
            />
          </label>
          <label className="block text-sm">
            Gas price ($/gal)
            <input
              type="number"
              step="0.01"
              value={gasPrice}
              onChange={(e) => setGasPrice(Number(e.target.value))}
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
      </main>
      <SiteFooter />
    </div>
  );
}
