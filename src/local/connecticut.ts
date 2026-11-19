import ctHigh from "@amcharts/amcharts5-geodata/region/usa/ctHigh";
import type { Place } from "../types";

/** A retreat a club logged by dropping a pin. Nothing here is preloaded. */
export type RetreatPin = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  note: string;
  /** County name from the Connecticut geodata, when the pin falls in one. */
  area: string;
};

type Ring = number[][];
type Geom = { type: string; coordinates: number[][][] | number[][][][] };
type Feature = { properties?: { name?: string }; geometry?: Geom };

const features = ((ctHigh as { features?: Feature[] }).features ?? []).filter((feature) => feature.geometry);

function ringsOf(geometry: Geom): Ring[] {
  if (geometry.type === "Polygon") return geometry.coordinates as Ring[];
  if (geometry.type === "MultiPolygon") return (geometry.coordinates as Ring[][]).flat();
  return [];
}

function contains(ring: Ring, lng: number, lat: number): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i]?.[0];
    const yi = ring[i]?.[1];
    const xj = ring[j]?.[0];
    const yj = ring[j]?.[1];
    if (xi === undefined || yi === undefined || xj === undefined || yj === undefined) continue;
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function segmentDistance(lng: number, lat: number, a: number[], b: number[]): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const length = dx * dx + dy * dy;
  const t = length === 0 ? 0 : Math.max(0, Math.min(1, ((lng - a[0]) * dx + (lat - a[1]) * dy) / length));
  return Math.hypot(lng - (a[0] + t * dx), lat - (a[1] + t * dy));
}

// About three miles. Keeps a pin in a harbor or just offshore, and rejects Long Island and Rhode Island.
const NEAR = 0.04;

/** County label from the real Connecticut polygons, or null when the point is outside the state. */
export function locateInConnecticut(lat: number, lng: number): string | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  let nearest: { name: string; dist: number } | null = null;
  for (const feature of features) {
    const name = feature.properties?.name;
    const geometry = feature.geometry;
    if (!name || !geometry) continue;
    const rings = ringsOf(geometry);
    const outer = rings[0];
    if (outer && contains(outer, lng, lat) && !rings.slice(1).some((ring) => contains(ring, lng, lat))) {
      return `${name} County`;
    }
    for (const ring of rings) {
      for (let i = 0; i < ring.length; i++) {
        const next = ring[(i + 1) % ring.length];
        const point = ring[i];
        if (!point || !next) continue;
        const dist = segmentDistance(lng, lat, point, next);
        if (!nearest || dist < nearest.dist) nearest = { name, dist };
      }
    }
  }
  if (nearest && nearest.dist <= NEAR) return `${nearest.name} County`;
  return null;
}

export function inConnecticut(lat: number, lng: number): boolean {
  return locateInConnecticut(lat, lng) !== null;
}

export function pinAsPlace(pin: RetreatPin): Place {
  return {
    id: pin.id,
    name: pin.name,
    kind: "spot",
    iso: "US",
    parentId: "us",
    lat: pin.lat,
    lng: pin.lng,
    region: pin.area || "Connecticut",
    blurb: pin.note,
    guide: pin.note,
    stays: [],
    tags: ["retreat"],
    aliases: [],
    cat: "landmark",
  };
}
