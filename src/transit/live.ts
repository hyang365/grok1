// Live buses (CTtransit), Metro-North and Amtrak departures near Yale.
// Each source is fetched directly from the browser first; if the provider blocks that (CORS),
// it goes through the site's Supabase proxy (supabase/functions/transit) when one is configured.
// Nothing here is simulated: if a feed can't be reached, the UI says so and links out.

import { useEffect, useState, useSyncExternalStore } from "react";
import GtfsRealtimeBindings from "gtfs-realtime-bindings";
import { FALLBACK_CT_STOPS, FALLBACK_MNR_STOPS } from "./fallback";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const PROXY = SUPABASE_URL ? `${SUPABASE_URL.replace(/\/$/, "")}/functions/v1/transit` : null;

const CT_JSON = {
  trips: "https://cttprdtmgtfs.ctttrpcloud.com/TMGTFSRealTimeWebService/TripUpdate/TripUpdates.json",
  vehicles: "https://cttprdtmgtfs.ctttrpcloud.com/TMGTFSRealTimeWebService/Vehicle/VehiclePositions.json",
};
const CT_PB = {
  trips: "https://cttprdtmgtfs.ctttrpcloud.com/TMGTFSRealTimeWebService/TripUpdate/TripUpdates.pb",
  vehicles: "https://cttprdtmgtfs.ctttrpcloud.com/TMGTFSRealTimeWebService/Vehicle/VehiclePositions.pb",
};
const MNR_PB = "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/mnr%2Fgtfs-mnr";
const AMTRAKER = "https://api-v3.amtraker.com/v3";

export const CAMPUS = { lat: 41.3083, lng: -72.9279 };
export const MNR_NEW_HAVEN = new Set(["149", "151"]);

export type SourceStatus = "loading" | "live" | "unavailable";

export type BusArrival = { key: string; route: string; color: string; headsign: string; stopId: string; stopName: string; at: number; delayMin: number | null };
export type Bus = { id: string; route: string; color: string; lat: number; lng: number; bearing: number | null; headsign: string };
export type TrainDeparture = {
  key: string;
  line: "Metro-North" | "Amtrak";
  train: string;
  to: string;
  station: string;
  at: number; // expected departure, epoch ms
  scheduled: number | null;
  delayMin: number | null;
  status: string;
};

export type Snapshot = {
  updatedAt: number | null;
  bus: { status: SourceStatus; arrivals: BusArrival[]; vehicles: Bus[]; via: string };
  metroNorth: { status: SourceStatus; departures: TrainDeparture[]; via: string };
  amtrak: { status: SourceStatus; departures: TrainDeparture[]; via: string };
  stops: { id: string; name: string; lat: number; lng: number }[];
};

// ---------- static schedule join (built in CI) ----------
type Static = {
  ct: { stops: { id: string; name: string; lat: number; lng: number }[]; routes: Record<string, { short: string; long: string; color: string }>; trips: Record<string, [string, string]> } | null;
  mnr: { stops: Record<string, string>; trips: Record<string, [string, string]> } | null;
};
let staticData: Static | null = null;
async function loadStatic(): Promise<Static> {
  if (staticData) return staticData;
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}transit-static.json`, { cache: "no-cache" });
    staticData = res.ok ? ((await res.json()) as Static) : { ct: null, mnr: null };
  } catch {
    staticData = { ct: null, mnr: null };
  }
  return staticData;
}

// ---------- tolerant GTFS-realtime access ----------
// Feeds come back as protobuf (decoded), or as provider JSON whose key casing varies
// (camelCase, snake_case or PascalCase, sometimes pluralised). Normalise keys once.
type Obj = Record<string, unknown>;
function norm(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(norm);
  if (value && typeof value === "object") {
    const out: Obj = {};
    for (const [k, v] of Object.entries(value as Obj)) out[k.toLowerCase().replace(/_/g, "")] = norm(v);
    return out;
  }
  return value;
}
const obj = (v: unknown): Obj => (v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : {});
const arr = (o: Obj, ...keys: string[]): unknown[] => {
  for (const k of keys) if (Array.isArray(o[k])) return o[k] as unknown[];
  return [];
};
const str = (v: unknown) => (v === undefined || v === null ? "" : String(v));
function epochMs(v: unknown): number | null {
  if (v === undefined || v === null || v === "") return null;
  if (typeof v === "number") return v > 1e12 ? v : v * 1000;
  const s = String(v);
  if (/^\d+$/.test(s)) return Number(s) > 1e12 ? Number(s) : Number(s) * 1000;
  const dotnet = s.match(/\/Date\((\d+)/);
  if (dotnet) return Number(dotnet[1]);
  const t = Date.parse(s);
  return Number.isNaN(t) ? null : t;
}
function entities(feed: unknown): Obj[] {
  const root = obj(norm(feed));
  return arr(root, "entity", "entities").map(obj);
}

// ---------- fetching ----------
function proxyUrl(feed: string, id?: string) {
  if (!PROXY) return null;
  return `${PROXY}?feed=${feed}${id ? `&id=${encodeURIComponent(id)}` : ""}`;
}
async function getJson(url: string, viaProxy = false): Promise<unknown> {
  const headers: Record<string, string> = {};
  if (viaProxy && SUPABASE_KEY) {
    headers.apikey = SUPABASE_KEY;
    headers.Authorization = `Bearer ${SUPABASE_KEY}`;
  }
  const res = await fetch(url, { headers, cache: "no-store" });
  if (!res.ok) throw new Error(String(res.status));
  const data = (await res.json()) as unknown;
  if (data && typeof data === "object" && "error" in (data as Obj)) throw new Error(String((data as Obj).error));
  return data;
}
async function getPb(url: string): Promise<unknown> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(String(res.status));
  const FeedMessage = GtfsRealtimeBindings.transit_realtime.FeedMessage;
  const msg = FeedMessage.decode(new Uint8Array(await res.arrayBuffer()));
  return FeedMessage.toObject(msg, { longs: Number });
}
/** Try each loader in order; return the first that works and which route it took. */
async function firstOf(loaders: [string, () => Promise<unknown>][]): Promise<{ data: unknown; via: string }> {
  let last: unknown = null;
  for (const [via, load] of loaders) {
    try {
      return { data: await load(), via };
    } catch (e) {
      last = e;
    }
  }
  throw last ?? new Error("no source");
}

function ctLoaders(kind: "trips" | "vehicles"): [string, () => Promise<unknown>][] {
  const list: [string, () => Promise<unknown>][] = [
    ["CTtransit", () => getJson(CT_JSON[kind])],
    ["CTtransit", () => getPb(CT_PB[kind])],
  ];
  const p = proxyUrl(kind === "trips" ? "ct-trips" : "ct-vehicles");
  if (p) list.push(["CTtransit via TripTable", () => getJson(p, true)]);
  return list;
}

// ---------- per-source builders ----------
async function loadBuses(st: Static, stopIds: Set<string>, stopNames: Map<string, string>) {
  const routeOf = (routeId: string, tripId: string) => {
    const rid = routeId || st.ct?.trips[tripId]?.[0] || "";
    const r = st.ct?.routes[rid];
    return { route: r?.short || rid || "Bus", color: r?.color || "" };
  };
  const [tripsRes, vehRes] = await Promise.allSettled([firstOf(ctLoaders("trips")), firstOf(ctLoaders("vehicles"))]);
  const now = Date.now();
  const arrivals: BusArrival[] = [];
  if (tripsRes.status === "fulfilled") {
    for (const e of entities(tripsRes.value.data)) {
      const tu = obj(e.tripupdate);
      const trip = obj(tu.trip);
      const tripId = str(trip.tripid);
      const { route, color } = routeOf(str(trip.routeid), tripId);
      for (const u of arr(tu, "stoptimeupdate", "stoptimeupdates").map(obj)) {
        const stopId = str(u.stopid);
        if (!stopIds.has(stopId)) continue;
        const ev = obj(u.arrival ?? u.departure);
        const at = epochMs(ev.time);
        if (!at || at < now - 60_000 || at > now + 90 * 60_000) continue;
        const delay = ev.delay === undefined ? null : Math.round(Number(ev.delay) / 60);
        arrivals.push({ key: `${tripId}-${stopId}`, route, color, headsign: st.ct?.trips[tripId]?.[1] || "", stopId, stopName: stopNames.get(stopId) ?? stopId, at, delayMin: delay });
      }
    }
  }
  const vehicles: Bus[] = [];
  if (vehRes.status === "fulfilled") {
    for (const e of entities(vehRes.value.data)) {
      const v = obj(e.vehicle);
      const pos = obj(v.position);
      const lat = Number(pos.latitude);
      const lng = Number(pos.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      if (Math.abs(lat - CAMPUS.lat) > 0.06 || Math.abs(lng - CAMPUS.lng) > 0.08) continue; // ~6 km box around campus
      const trip = obj(v.trip);
      const tripId = str(trip.tripid);
      const { route, color } = routeOf(str(trip.routeid), tripId);
      const veh = obj(v.vehicle);
      vehicles.push({ id: str(veh.id || veh.label || e.id), route, color, lat, lng, bearing: pos.bearing === undefined ? null : Number(pos.bearing), headsign: st.ct?.trips[tripId]?.[1] || "" });
    }
  }
  arrivals.sort((a, b) => a.at - b.at);
  const ok = tripsRes.status === "fulfilled" || vehRes.status === "fulfilled";
  const via = tripsRes.status === "fulfilled" ? tripsRes.value.via : vehRes.status === "fulfilled" ? vehRes.value.via : "";
  return { status: (ok ? "live" : "unavailable") as SourceStatus, arrivals, vehicles, via };
}

async function loadMetroNorth(st: Static) {
  const loaders: [string, () => Promise<unknown>][] = [["MTA", () => getPb(MNR_PB)]];
  const p = proxyUrl("mnr");
  if (p) loaders.push(["MTA via TripTable", () => getJson(p, true)]);
  const names = { ...FALLBACK_MNR_STOPS, ...(st.mnr?.stops ?? {}) };
  try {
    const { data, via } = await firstOf(loaders);
    const now = Date.now();
    const departures: TrainDeparture[] = [];
    for (const e of entities(data)) {
      const tu = obj(e.tripupdate);
      const trip = obj(tu.trip);
      const tripId = str(trip.tripid);
      const updates = arr(tu, "stoptimeupdate", "stoptimeupdates").map(obj);
      const here = updates.find((u) => MNR_NEW_HAVEN.has(str(u.stopid)));
      if (!here) continue;
      const last = updates[updates.length - 1];
      // Trains ending in New Haven are arrivals, not departures.
      if (MNR_NEW_HAVEN.has(str(last?.stopid)) && last !== here) continue;
      if (last === here) continue;
      const ev = obj(here.departure ?? here.arrival);
      const at = epochMs(ev.time);
      if (!at || at < now - 60_000 || at > now + 6 * 3600_000) continue;
      const delay = ev.delay === undefined ? null : Math.round(Number(ev.delay) / 60);
      const sched = st.mnr?.trips[tripId];
      departures.push({
        key: `mnr-${tripId}`,
        line: "Metro-North",
        train: sched?.[1] || str(obj(e.vehicle).label) || tripId,
        to: sched?.[0] || names[str(last?.stopid)] || "Grand Central",
        station: names[str(here.stopid)] || "New Haven",
        at,
        scheduled: delay !== null ? at - delay * 60_000 : null,
        delayMin: delay,
        status: delay && delay > 1 ? `${delay} min late` : "On time",
      });
    }
    departures.sort((a, b) => a.at - b.at);
    return { status: "live" as SourceStatus, departures, via };
  } catch {
    return { status: "unavailable" as SourceStatus, departures: [], via: "" };
  }
}

type AmtrakStation = { code?: string; schDep?: string; dep?: string; status?: string; name?: string };
type AmtrakTrain = { trainNum?: string | number; routeName?: string; destName?: string; trainID?: string; stations?: AmtrakStation[] };

async function loadAmtrak() {
  const stationLoaders: [string, () => Promise<unknown>][] = [["Amtraker", () => getJson(`${AMTRAKER}/stations/NHV`)]];
  const p = proxyUrl("amtrak-station");
  if (p) stationLoaders.push(["Amtraker via TripTable", () => getJson(p, true)]);
  try {
    const { data, via } = await firstOf(stationLoaders);
    const station = obj(obj(data).NHV);
    const ids = (Array.isArray(station.trains) ? station.trains : []).map(String).slice(0, 24);
    const direct = !via.includes("via");
    const trains = await Promise.allSettled(
      ids.map((id) => {
        const url = direct ? `${AMTRAKER}/trains/${encodeURIComponent(id)}` : proxyUrl("amtrak-train", id);
        return url ? getJson(url, !direct) : Promise.reject(new Error("no url"));
      }),
    );
    const now = Date.now();
    const departures: TrainDeparture[] = [];
    for (const r of trains) {
      if (r.status !== "fulfilled") continue;
      for (const list of Object.values(obj(r.value))) {
        for (const t of (Array.isArray(list) ? list : []) as AmtrakTrain[]) {
          const stop = t.stations?.find((s) => s.code === "NHV");
          if (!stop || stop.status === "Departed") continue;
          const at = epochMs(stop.dep ?? stop.schDep);
          if (!at || at < now - 60_000) continue;
          const scheduled = epochMs(stop.schDep);
          const delayMin = scheduled ? Math.round((at - scheduled) / 60_000) : null;
          departures.push({
            key: `amtrak-${t.trainID ?? t.trainNum}`,
            line: "Amtrak",
            train: `${t.routeName ?? "Amtrak"} ${t.trainNum ?? ""}`.trim(),
            to: t.destName ?? "",
            station: "New Haven Union Station",
            at,
            scheduled,
            delayMin,
            status: delayMin && delayMin > 1 ? `${delayMin} min late` : stop.status === "Station" ? "Boarding" : "On time",
          });
        }
      }
    }
    departures.sort((a, b) => a.at - b.at);
    return { status: "live" as SourceStatus, departures, via };
  } catch {
    return { status: "unavailable" as SourceStatus, departures: [], via: "" };
  }
}

// ---------- shared poller ----------
const empty: Snapshot = {
  updatedAt: null,
  bus: { status: "loading", arrivals: [], vehicles: [], via: "" },
  metroNorth: { status: "loading", departures: [], via: "" },
  amtrak: { status: "loading", departures: [], via: "" },
  stops: [],
};
let snap: Snapshot = empty;
const listeners = new Set<() => void>();
let subscribers = 0;
let timer: number | null = null;
let inflight = false;

async function refresh() {
  if (inflight) return;
  inflight = true;
  try {
    const st = await loadStatic();
    const stops = st.ct?.stops?.length ? st.ct.stops : FALLBACK_CT_STOPS;
    const stopIds = new Set(stops.map((s) => s.id));
    const stopNames = new Map(stops.map((s) => [s.id, s.name]));
    const [bus, metroNorth, amtrak] = await Promise.all([loadBuses(st, stopIds, stopNames), loadMetroNorth(st), loadAmtrak()]);
    snap = { updatedAt: Date.now(), bus, metroNorth, amtrak, stops };
    listeners.forEach((fn) => fn());
  } finally {
    inflight = false;
  }
}

const store = {
  subscribe(fn: () => void) {
    listeners.add(fn);
    subscribers += 1;
    if (subscribers === 1) {
      void refresh();
      timer = window.setInterval(() => {
        if (document.visibilityState === "visible") void refresh();
      }, 30_000);
    }
    return () => {
      listeners.delete(fn);
      subscribers -= 1;
      if (subscribers === 0 && timer !== null) {
        window.clearInterval(timer);
        timer = null;
      }
    };
  },
  get: () => snap,
};

/** Live transit near Yale. Polls every 30 s while at least one component is using it. */
export function useLiveTransit(): Snapshot {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}

export function refreshTransit() {
  void refresh();
}

/** Re-renders every few seconds so "in 4 min" labels stay current between polls. */
export function useNow(ms = 10_000): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), ms);
    return () => window.clearInterval(t);
  }, [ms]);
  return now;
}

export function minsUntil(at: number, now: number): string {
  const m = Math.round((at - now) / 60_000);
  if (m <= 0) return "Now";
  if (m < 60) return `${m} min`;
  return new Date(at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export const clockTime = (at: number) => new Date(at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
