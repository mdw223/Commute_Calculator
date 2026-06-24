import { migrateCostSettings } from "@/lib/localStorage";
import type { SavedRoute } from "@/types";

const STORAGE_KEY = "gas-in-this-economy-saved-routes";

function isSavedRoute(value: unknown): value is SavedRoute {
  if (!value || typeof value !== "object") return false;
  const route = value as SavedRoute;
  return (
    typeof route.id === "string" &&
    typeof route.name === "string" &&
    typeof route.createdAt === "string" &&
    typeof route.updatedAt === "string" &&
    Array.isArray(route.stops) &&
    route.costSettings != null
  );
}

export function loadSavedRoutes(): SavedRoute[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(isSavedRoute)
      .map((route) => ({
        ...route,
        costSettings: migrateCostSettings(route.costSettings),
      }))
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
  } catch {
    return [];
  }
}

function persistRoutes(routes: SavedRoute[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(routes));
}

export function saveRoute(route: SavedRoute): SavedRoute[] {
  const routes = loadSavedRoutes();
  const index = routes.findIndex((r) => r.id === route.id);
  if (index === -1) {
    routes.push(route);
  } else {
    routes[index] = route;
  }
  persistRoutes(routes);
  return loadSavedRoutes();
}

export function deleteRoute(id: string): SavedRoute[] {
  const routes = loadSavedRoutes().filter((r) => r.id !== id);
  persistRoutes(routes);
  return routes;
}

export function renameRoute(id: string, name: string): SavedRoute[] {
  const routes = loadSavedRoutes().map((r) =>
    r.id === id ? { ...r, name, updatedAt: new Date().toISOString() } : r
  );
  persistRoutes(routes);
  return loadSavedRoutes();
}

export function defaultRouteName(stops: SavedRoute["stops"]): string {
  const resolved = stops.filter((s) => s.label.trim());
  if (resolved.length === 0) return "Untitled route";
  if (resolved.length === 1) return resolved[0].label;
  return `${resolved[0].label} → ${resolved[resolved.length - 1].label}`;
}

export function createSavedRouteSnapshot(
  name: string,
  stops: SavedRoute["stops"],
  costSettings: SavedRoute["costSettings"],
  lastResults?: SavedRoute["lastResults"]
): SavedRoute {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name,
    createdAt: now,
    updatedAt: now,
    stops,
    costSettings,
    lastResults,
  };
}
