import L from "leaflet";

export const OSM_TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
export const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

export const DEFAULT_MAP_CENTER: [number, number] = [39.8283, -98.5795];
export const DEFAULT_MAP_ZOOM = 4;

let iconsFixed = false;

export function fixLeafletIcons(): void {
  if (iconsFixed || typeof window === "undefined") return;
  iconsFixed = true;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "/leaflet/marker-icon-2x.png",
    iconUrl: "/leaflet/marker-icon.png",
    shadowUrl: "/leaflet/marker-shadow.png",
  });
}

export function createNumberedIcon(number: number): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<div style="
      background: #dc2626;
      color: #fffbeb;
      border: 2px solid #1a1a1a;
      border-radius: 50%;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: monospace;
      font-size: 12px;
      font-weight: bold;
      box-shadow: 2px 2px 0 0 #1a1a1a;
    ">${number}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

export function formatDistanceMeters(meters?: number): string {
  if (meters == null) return "";
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}
