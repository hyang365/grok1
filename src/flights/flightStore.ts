// Flight-planner preferences (destination, dates, airports, who you are flying with).
// Kept apart from the main TripTable store so the existing reducer stays untouched.
import { useSyncExternalStore } from "react";

export type FlightState = {
  boycottAvelo: boolean;
  destId: string | null;
  out: string | null;
  back: string | null;
  gateways: string[];
  crew: string[]; // friend netids flying with you
};

const KEY = "triptable-flights-v1";
const ALL_GATEWAYS = ["HVN", "BDL", "JFK", "LGA", "EWR", "BOS"];

const defaults: FlightState = {
  boycottAvelo: false,
  destId: null,
  out: null,
  back: null,
  gateways: ALL_GATEWAYS,
  crew: [],
};

function load(): FlightState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...defaults };
    const data = JSON.parse(raw) as Partial<FlightState>;
    const merged: FlightState = {
      ...defaults,
      boycottAvelo: Boolean(data.boycottAvelo),
      destId: typeof data.destId === "string" ? data.destId : null,
      out: typeof data.out === "string" ? data.out : null,
      back: typeof data.back === "string" ? data.back : null,
    };
    merged.gateways = Array.isArray(data.gateways) && data.gateways.length ? data.gateways.filter((g) => ALL_GATEWAYS.includes(g)) : ALL_GATEWAYS;
    if (!merged.gateways.length) merged.gateways = ALL_GATEWAYS;
    // Crew ids are account ids (uuids); drop sample-friend netids from older versions.
    merged.crew = Array.isArray(data.crew) ? data.crew.filter((id: unknown) => typeof id === "string" && /^[0-9a-f-]{36}$/.test(id)) : [];
    return merged;
  } catch {
    return { ...defaults };
  }
}

let state: FlightState = load();
const listeners = new Set<() => void>();

export const flightStore = {
  get: () => state,
  set(patch: Partial<FlightState> | ((s: FlightState) => Partial<FlightState>)) {
    const next = typeof patch === "function" ? patch(state) : patch;
    state = { ...state, ...next };
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* storage full or blocked */
    }
    listeners.forEach((fn) => fn());
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
  reset() {
    state = { ...defaults };
    localStorage.removeItem(KEY);
    listeners.forEach((fn) => fn());
  },
};

export function useFlights(): FlightState {
  return useSyncExternalStore(flightStore.subscribe, flightStore.get, flightStore.get);
}

export { ALL_GATEWAYS };
