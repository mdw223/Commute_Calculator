"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/calculations";
import {
  createSavedRouteSnapshot,
  defaultRouteName,
  deleteRoute,
  loadSavedRoutes,
  renameRoute,
  saveRoute,
} from "@/lib/savedRoutes";
import type {
  CostBreakdown,
  CostSettings,
  SavedRoute,
  Stop,
  WorthItAnalysis,
} from "@/types";

interface SavedRoutesModalProps {
  open: boolean;
  stops: Stop[];
  costSettings: CostSettings;
  breakdown: CostBreakdown | null;
  worthIt: WorthItAnalysis | null;
  onClose: () => void;
  onLoadRoute: (route: SavedRoute) => void;
}

function formatSavedDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function stopSummary(stops: Stop[]): string {
  const labels = stops
    .map((stop) => stop.label.trim())
    .filter(Boolean);
  if (labels.length === 0) return "No addresses yet";
  if (labels.length <= 3) return labels.join(" → ");
  return `${labels[0]} → … → ${labels[labels.length - 1]} (${labels.length} stops)`;
}

export default function SavedRoutesModal({
  open,
  stops,
  costSettings,
  breakdown,
  worthIt,
  onClose,
  onLoadRoute,
}: SavedRoutesModalProps) {
  const [routes, setRoutes] = useState<SavedRoute[]>([]);
  const [saveName, setSaveName] = useState("");
  const [showSaveForm, setShowSaveForm] = useState(false);

  useEffect(() => {
    if (!open) return;
    setRoutes(loadSavedRoutes());
    setSaveName(defaultRouteName(stops));
    setShowSaveForm(false);
  }, [open, stops]);

  if (!open) return null;

  function refreshRoutes() {
    setRoutes(loadSavedRoutes());
  }

  function handleSaveCurrent() {
    const trimmed = saveName.trim();
    if (!trimmed) return;

    const lastResults =
      breakdown && worthIt
        ? {
            breakdown,
            worthIt,
            calculatedAt: new Date().toISOString(),
          }
        : undefined;

    const snapshot = createSavedRouteSnapshot(
      trimmed,
      stops,
      costSettings,
      lastResults
    );
    saveRoute(snapshot);
    refreshRoutes();
    setShowSaveForm(false);
    setSaveName(defaultRouteName(stops));
  }

  function handleLoad(route: SavedRoute) {
    onLoadRoute(route);
    onClose();
  }

  function handleRename(route: SavedRoute) {
    const nextName = window.prompt("Rename route", route.name)?.trim();
    if (!nextName || nextName === route.name) return;
    setRoutes(renameRoute(route.id, nextName));
  }

  function handleDelete(route: SavedRoute) {
    const confirmed = window.confirm(`Delete "${route.name}"?`);
    if (!confirmed) return;
    setRoutes(deleteRoute(route.id));
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-ink/60"
      role="dialog"
      aria-modal="true"
      aria-label="My routes"
    >
      <div className="w-full max-w-2xl max-h-[95vh] border-4 border-ink bg-surface shadow-brutal flex flex-col overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b-3 border-ink px-4 py-3">
          <h2 className="font-display font-bold uppercase text-headline text-sm sm:text-base">
            My Routes
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="border-3 border-ink px-3 py-1 font-mono text-xs uppercase hover:bg-headline hover:text-newsprint transition-colors"
          >
            Close
          </button>
        </div>

        <div className="px-4 py-3 border-b-3 border-ink space-y-3">
          {!showSaveForm ? (
            <button
              type="button"
              onClick={() => {
                setSaveName(defaultRouteName(stops));
                setShowSaveForm(true);
              }}
              className="w-full border-3 border-ink bg-cta text-ink py-2 font-mono text-xs uppercase shadow-brutal-sm hover:translate-x-0.5 hover:translate-y-0.5 transition-transform"
            >
              Save current route
            </button>
          ) : (
            <div className="space-y-2">
              <label className="block font-mono text-xs uppercase tracking-wider">
                Route name
              </label>
              <input
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                className="w-full border-3 border-ink bg-surface px-3 py-2 focus:outline-none focus:ring-2 focus:ring-headline"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSaveCurrent}
                  disabled={!saveName.trim()}
                  className="flex-1 border-3 border-ink bg-cta text-ink py-2 font-mono text-xs uppercase disabled:opacity-60"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setShowSaveForm(false)}
                  className="border-3 border-ink px-4 py-2 font-mono text-xs uppercase hover:bg-headline hover:text-newsprint transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          <p className="text-sm text-muted border-l-4 border-headline pl-3">
            Saved routes stay on this device only. We don&apos;t store your
            commute anywhere else.
          </p>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-3">
          {routes.length === 0 ? (
            <p className="text-sm text-muted text-center py-8">
              No saved routes yet. Build a commute and hit save.
            </p>
          ) : (
            routes.map((route) => (
              <div
                key={route.id}
                className="border-3 border-ink bg-newsprint p-4 shadow-brutal-sm space-y-3"
              >
                <div>
                  <h3 className="font-display font-bold uppercase text-headline">
                    {route.name}
                  </h3>
                  <p className="text-sm text-muted mt-1">
                    {stopSummary(route.stops)}
                  </p>
                  <p className="text-xs text-muted font-mono mt-1">
                    Updated {formatSavedDate(route.updatedAt)}
                  </p>
                </div>

                {route.lastResults ? (
                  <p className="text-sm font-mono">
                    Last trip:{" "}
                    <span className="font-bold text-headline">
                      {formatCurrency(route.lastResults.breakdown.tripCost)}
                    </span>
                    <span className="text-muted">
                      {" "}
                      · calculated{" "}
                      {formatSavedDate(route.lastResults.calculatedAt)}
                    </span>
                  </p>
                ) : (
                  <p className="text-sm text-muted font-mono">
                    Not calculated yet
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleLoad(route)}
                    className="border-3 border-ink bg-cta text-ink px-3 py-1 font-mono text-xs uppercase"
                  >
                    Load
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRename(route)}
                    className="border-3 border-ink bg-surface px-3 py-1 font-mono text-xs uppercase hover:bg-cta/20 transition-colors"
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(route)}
                    className="border-3 border-ink bg-surface px-3 py-1 font-mono text-xs uppercase hover:bg-headline hover:text-newsprint transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
