// Live, anonymous plan counts built only from trips Yale students save while signed in.
// The database returns totals per place/season/year (public.plan_counts) and never who.

import { useEffect, useState, useSyncExternalStore } from "react";
import { supabase } from "../reviews/backend";
import type { Season, Trip } from "../types";

type Snapshot = { counts: Map<string, number>; loaded: boolean; version: number };

let snap: Snapshot = { counts: new Map(), loaded: false, version: 0 };
const listeners = new Set<() => void>();
const key = (placeId: string, season: string, year: number) => `${placeId}|${season}|${year}`;

export async function refreshPlans() {
  if (!supabase) {
    snap = { ...snap, loaded: true, version: snap.version + 1 };
    listeners.forEach((fn) => fn());
    return;
  }
  const { data, error } = await supabase.rpc("plan_counts");
  const counts = new Map<string, number>();
  if (!error && Array.isArray(data)) {
    for (const row of data as { place_id: string; season: string; year: number; plans: number }[]) {
      counts.set(key(row.place_id, row.season, row.year), row.plans);
    }
  }
  snap = { counts, loaded: true, version: snap.version + 1 };
  listeners.forEach((fn) => fn());
}

let started = false;
function start() {
  if (started) return;
  started = true;
  void refreshPlans();
  window.setInterval(() => {
    if (document.visibilityState === "visible") void refreshPlans();
  }, 60_000);
}

export const plansStore = {
  subscribe(fn: () => void) {
    start();
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
  get: () => snap,
};

export function usePlans(): Snapshot {
  return useSyncExternalStore(plansStore.subscribe, plansStore.get, plansStore.get);
}

/** Students planning this exact place (not including spots inside it). */
export function planCount(placeId: string, season: Season, year: number): number {
  return snap.counts.get(key(placeId, season, year)) ?? 0;
}

/**
 * The year a season's next (or current) occurrence falls in, so "Spring Break" in November
 * means next March. Winter break counts by the December it starts in.
 */
export function seasonYear(season: Season, now = new Date()): number {
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  if (season === "spring") return m > 3 ? y + 1 : y;
  if (season === "summer") return m > 8 ? y + 1 : y;
  if (season === "fall") return m > 10 ? y + 1 : y;
  if (season === "winter") return m === 1 ? y - 1 : y;
  return y;
}

/** How many other students overlap the given dates at a place. Null while loading or offline. */
export function useOverlap(placeId: string | null, start?: string, end?: string): number | null {
  const [n, setN] = useState<number | null>(null);
  const { version } = usePlans();
  useEffect(() => {
    let alive = true;
    setN(null);
    if (!supabase || !placeId || !start || !end) return;
    supabase.rpc("overlap_count", { p_place: placeId, p_start: start, p_end: end }).then(({ data, error }) => {
      if (alive && !error && typeof data === "number") setN(data);
    });
    return () => {
      alive = false;
    };
  }, [placeId, start, end, version]);
  return n;
}

// ---------- syncing your own trips (signed-in Yale accounts only) ----------
type Details = { note?: string; friendNetids?: string[]; flights?: unknown[]; checklist?: string[] };
type Row = { id: string; place_id: string; season: Season; start_date: string; end_date: string; details: Details };
export type RemoteTrip = Row;

let lastSynced = new Map<string, string>();

function detailsOf(t: Trip): Details {
  return { note: t.note, friendNetids: t.friendNetids, flights: t.flights ?? [], checklist: t.checklist ?? [] };
}
const sig = (t: Omit<Row, "id">) => JSON.stringify([t.place_id, t.season, t.start_date, t.end_date, t.details ?? {}]);

/**
 * Push local trips (with their flights, friends, notes and checklist) to the database and remove ones you deleted.
 * Returns trips that exist only remotely, and trips another device changed since this one last synced.
 */
export async function syncTrips(trips: Trip[], userId: string): Promise<{ added: Row[]; changed: Row[] }> {
  if (!supabase) return { added: [], changed: [] };
  const { data, error } = await supabase.from("trips").select("id,place_id,season,start_date,end_date,details").eq("user_id", userId);
  if (error) return { added: [], changed: [] };
  const remote = new Map((data as Row[]).map((r) => [r.id, { ...r, details: r.details ?? {} }]));
  const local = new Map(trips.map((t) => [t.id, { id: t.id, place_id: t.placeId, season: t.season, start_date: t.start, end_date: t.end, details: detailsOf(t) }]));

  // Another device edited a trip this device hasn't touched since its last sync: take the remote version.
  const changed = [...local.values()].filter((r) => {
    const rem = remote.get(r.id);
    return rem && lastSynced.get(r.id) === sig(r) && sig(rem) !== sig(r);
  });
  const changedIds = new Set(changed.map((r) => r.id));

  const upserts = [...local.values()].filter((r) => !changedIds.has(r.id) && (!remote.has(r.id) || sig(remote.get(r.id)!) !== sig(r)));
  if (upserts.length) await supabase.from("trips").upsert(upserts.map((r) => ({ ...r, user_id: userId, updated_at: new Date().toISOString() })));

  // Only delete remote trips this device previously synced and has since removed.
  const removed = [...remote.keys()].filter((id) => !local.has(id) && lastSynced.has(id));
  if (removed.length) await supabase.from("trips").delete().in("id", removed);

  lastSynced = new Map([...local.values()].map((r) => [r.id, sig(changedIds.has(r.id) ? remote.get(r.id)! : r)]));
  for (const r of remote.values()) if (!local.has(r.id) && !removed.includes(r.id)) lastSynced.set(r.id, sig(r));
  if (upserts.length || removed.length) void refreshPlans();
  return {
    added: [...remote.values()].filter((r) => !local.has(r.id) && !removed.includes(r.id)),
    changed: changed.map((r) => remote.get(r.id)!),
  };
}
