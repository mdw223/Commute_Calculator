"use client";

import { useCallback, useEffect, useState } from "react";
import {
  analyzeWorthIt,
  applyRoundTrip,
  calculateCosts,
} from "@/lib/calculations";
import {
  clearPreferences,
  createDefaultStops,
  DEFAULT_COST_SETTINGS,
  loadPreferences,
  migrateCostSettings,
  savePreferences,
} from "@/lib/localStorage";
import type {
  CostBreakdown,
  CostSettings,
  RouteResult,
  SavedRoute,
  Stop,
  WorthItAnalysis,
} from "@/types";
import CostInputs from "./CostInputs";
import FaqSection from "./FaqSection";
import Hero from "./Hero";
import ResultsPanel from "./ResultsPanel";
import SavedRoutesModal from "./SavedRoutesModal";
import StopList from "./StopList";
import Ticker from "./Ticker";

const FEATURE_BLURBS = [
  {
    title: "Real routes",
    body: "Multi-stop driving directions. Not vibes-based distance.",
  },
  {
    title: "Full receipt",
    body: "Gas + optional maintenance + your time (if you dare).",
  },
  {
    title: "Zero storage",
    body: "Prefs in localStorage only. We don't know your commute.",
  },
];

export default function Calculator() {
  const [stops, setStops] = useState<Stop[]>(createDefaultStops);
  const [costSettings, setCostSettings] =
    useState<CostSettings>(DEFAULT_COST_SETTINGS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [breakdown, setBreakdown] = useState<CostBreakdown | null>(null);
  const [worthIt, setWorthIt] = useState<WorthItAnalysis | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [savedRoutesOpen, setSavedRoutesOpen] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect -- hydrate preferences from localStorage once on mount */
  useEffect(() => {
    const saved = loadPreferences();
    if (saved) {
      if (saved.stops?.length >= 2) setStops(saved.stops);
      if (saved.costSettings)
        setCostSettings(migrateCostSettings(saved.costSettings));
    }
    setHydrated(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!hydrated) return;
    savePreferences({ stops, costSettings });
  }, [stops, costSettings, hydrated]);

  const handleCalculate = useCallback(async () => {
    setError(null);
    setBreakdown(null);
    setWorthIt(null);

    const coords = stops
      .map((s) => s.coordinates)
      .filter((c): c is [number, number] => c !== null);

    if (coords.length < 2) {
      setError(
        "Pick addresses from the dropdown bestie — we need real coordinates."
      );
      return;
    }

    if (coords.length !== stops.length) {
      setError("Every stop needs a selected address from the suggestions.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coordinates: coords }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Route failed");
      }

      const route: RouteResult = {
        totalMiles: data.totalMiles,
        totalMinutes: data.totalMinutes,
        legs: data.legs ?? [],
      };

      const adjusted = applyRoundTrip(route, costSettings.roundTrip);
      const result = calculateCosts(adjusted, costSettings);
      const analysis = analyzeWorthIt(result, costSettings);

      setBreakdown(result);
      setWorthIt(analysis);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Route failed. Even Google Maps is confused."
      );
    } finally {
      setLoading(false);
    }
  }, [stops, costSettings]);

  function handleClear() {
    clearPreferences();
    setStops(createDefaultStops());
    setCostSettings(DEFAULT_COST_SETTINGS);
    setBreakdown(null);
    setWorthIt(null);
    setError(null);
  }

  function handleLoadRoute(route: SavedRoute) {
    setStops(route.stops);
    setCostSettings(migrateCostSettings(route.costSettings));
    setBreakdown(route.lastResults?.breakdown ?? null);
    setWorthIt(route.lastResults?.worthIt ?? null);
    setError(null);
  }

  return (
    <>
      <Ticker />
      <Hero />

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          {FEATURE_BLURBS.map((f) => (
            <div
              key={f.title}
              className="border-3 border-ink bg-surface p-4 shadow-brutal-sm"
            >
              <h3 className="font-display font-bold uppercase text-headline text-sm">
                {f.title}
              </h3>
              <p className="text-sm text-muted mt-1">{f.body}</p>
            </div>
          ))}
        </div>

        <div className="border-4 border-ink bg-surface p-6 shadow-brutal space-y-8">
          <StopList
            stops={stops}
            roundTrip={costSettings.roundTrip}
            onStopsChange={setStops}
            onRoundTripChange={(roundTrip) =>
              setCostSettings((s) => ({ ...s, roundTrip }))
            }
            onOpenMyRoutes={() => setSavedRoutesOpen(true)}
          />

          <hr className="border-ink border-t-2 border-dashed" />

          <CostInputs settings={costSettings} onChange={setCostSettings} />

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={handleCalculate}
              disabled={loading}
              className="flex-1 border-4 border-ink bg-cta text-ink py-4 font-display text-lg font-black uppercase tracking-wide shadow-brutal hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-brutal-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "The math is mathing…" : "Do the math bestie"}
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="border-3 border-ink bg-surface px-6 py-4 font-mono text-xs uppercase hover:bg-headline hover:text-newsprint transition-colors"
            >
              Clear all
            </button>
          </div>

          {error && (
            <p className="border-3 border-headline bg-headline/10 text-headline px-4 py-3 text-sm font-mono">
              {error}
            </p>
          )}
        </div>

        {breakdown && worthIt && (
          <div className="mt-8 border-4 border-ink bg-newsprint p-6 shadow-brutal">
            <ResultsPanel
              breakdown={breakdown}
              worthIt={worthIt}
              settings={costSettings}
            />
          </div>
        )}
      </main>

      <FaqSection />

      <SavedRoutesModal
        open={savedRoutesOpen}
        stops={stops}
        costSettings={costSettings}
        breakdown={breakdown}
        worthIt={worthIt}
        onClose={() => setSavedRoutesOpen(false)}
        onLoadRoute={handleLoadRoute}
      />

      <footer className="border-t-4 border-ink py-6 text-center">
        <p className="font-mono text-xs text-muted uppercase tracking-widest">
          Gas In This Economy · No cap · © {new Date().getFullYear()}
        </p>
      </footer>
    </>
  );
}
