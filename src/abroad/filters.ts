// Study abroad program filters, shared by the map's side rail and the study abroad catalog.

import { summaryAvg } from "../reviews/store";
import type { AbroadFilters } from "../types";
import { grantsFor, type Program } from "./data";

export const DEFAULT_ABROAD_FILTERS: AbroadFilters = {
  kind: "all",
  region: "all",
  grant: "all",
  overall: 1,
  academics: 1,
  housing: 1,
  value: 1,
  minGrants: 0,
};

export const ABROAD_METRICS = [
  ["overall", "Overall"],
  ["academics", "Academics"],
  ["housing", "Housing"],
  ["value", "Value for money"],
] as const;

export function sanitizeAbroadFilters(value: unknown): AbroadFilters {
  const v = (value && typeof value === "object" ? value : {}) as Partial<AbroadFilters>;
  const num = (x: unknown, lo: number, hi: number, d: number) => (typeof x === "number" && x >= lo && x <= hi ? x : d);
  const str = (x: unknown) => (typeof x === "string" && x.length < 60 ? x : "all");
  return {
    kind: str(v.kind),
    region: str(v.region),
    grant: str(v.grant),
    overall: num(v.overall, 1, 5, 1),
    academics: num(v.academics, 1, 5, 1),
    housing: num(v.housing, 1, 5, 1),
    value: num(v.value, 1, 5, 1),
    minGrants: num(v.minGrants, 0, 10, 0),
  };
}

export function abroadActiveCount(f: AbroadFilters): number {
  return (
    Number(f.kind !== "all") +
    Number(f.region !== "all") +
    Number(f.grant !== "all") +
    ABROAD_METRICS.filter(([k]) => f[k] > 1).length +
    Number(f.minGrants > 0)
  );
}

/** Whether a program clears the filters. A rating minimum hides programs nobody has rated yet. */
export function passesAbroad(p: Program, f: AbroadFilters): boolean {
  if (f.kind !== "all" && p.kind !== f.kind) return false;
  if (f.region !== "all" && p.region !== f.region) return false;
  const grants = grantsFor(p);
  if (f.grant !== "all" && !grants.some((g) => g.id === f.grant)) return false;
  if (f.minGrants > 0 && grants.length < f.minGrants) return false;
  for (const [key] of ABROAD_METRICS) {
    if (f[key] <= 1) continue;
    const avg = summaryAvg("program", [p.id], key);
    if (avg === null || avg + 1e-6 < f[key]) return false;
  }
  return true;
}

export function matchesQuery(p: Program, q: string): boolean {
  if (!q) return true;
  return [p.name, p.city, p.country, p.subject, p.language ?? ""].some((s) => s.toLowerCase().includes(q));
}
