import { createContext, useContext, useEffect, useMemo, useReducer, type Dispatch, type ReactNode } from "react";
import { PLACE_BY_ID } from "./data";
import { useAccount } from "./account/account";
import { useReviewStore } from "./reviews/store";
import { usePlans } from "./live/plans";
import { passesFilters, sortScore, visitCount } from "./logic";
import type { AbroadTerm, BucketItem, ProfileTab, FlightLeg, GroupFlight, Filters, MapMode, Person, Place, Season, Scope, SortKey, ThemeName, Trip, ViewName } from "./types";

export const DEFAULT_FILTERS: Filters = {
  overall: 1,
  affordability: 1,
  safety: 1,
  beauty: 1,
  minYalies: 0,
  features: [],
  continents: [],
  query: "",
  scope: "all",
};

const STORAGE_KEY = "triptable-v2";
// v1 held demo trips and sample friends; start everyone fresh as a guest.
try {
  localStorage.removeItem("triptable-v1");
} catch {
  /* storage blocked */
}

export type State = {
  theme: ThemeName;
  view: ViewName;
  season: Season;
  sort: SortKey;
  sortDir: "asc" | "desc";
  filters: Filters;
  selectedId: string | null;
  emptyGeo: { iso: string; name: string } | null;
  showFriends: boolean;
  trips: Trip[];
  friendFocus: string | null;
  toast: string | null;
  homeTick: number;
  mapMode: MapMode;
  abroadTerm: AbroadTerm;
  bucket: BucketItem[];
  profileTab: ProfileTab;
  abroadIso: string | null;
  abroadProgramId: string | null;
};

const SEASONS = new Set<Season>(["spring", "summer", "fall", "winter", "weekend"]);
const SORTS = new Set<SortKey>(["yalies", "overall", "affordability", "safety", "beauty"]);
const SCOPES = new Set<Scope>(["all", "countries", "us"]);
const VIEWS = new Set<ViewName>(["map", "catalog", "friends", "itinerary", "flights", "abroad", "transit", "profile"]);
const FEATURE_IDS = new Set(["beach", "mountain", "city", "island", "desert", "food"]);
const CONTINENT_NAMES = new Set(["North America", "Caribbean", "Central America", "South America", "Europe", "Africa", "Asia", "Oceania"]);

function defaultState(): State {
  return {
    theme: "light",
    view: "map",
    season: "spring",
    sort: "yalies",
    sortDir: "desc",
    filters: { ...DEFAULT_FILTERS },
    selectedId: null,
    emptyGeo: null,
    showFriends: true,
    trips: [],
    friendFocus: null,
    toast: null,
    homeTick: 0,
    mapMode: "travel",
    abroadTerm: "Fall",
    bucket: [],
    profileTab: "history",
    abroadIso: null,
    abroadProgramId: null,
  };
}

function sanitizeTrip(value: unknown): Trip | null {
  if (!value || typeof value !== "object") return null;
  const trip = value as Partial<Trip>;
  if (!trip.placeId || !trip.start || !trip.end || !trip.season) return null;
  if (!SEASONS.has(trip.season)) return null;
  if (!PLACE_BY_ID.has(trip.placeId)) return null;
  return {
    id: String(trip.id || `trip-${trip.placeId}`),
    placeId: trip.placeId,
    season: trip.season,
    start: trip.start,
    end: trip.end,
    note: typeof trip.note === "string" ? trip.note : "",
    friendNetids: Array.isArray(trip.friendNetids) ? trip.friendNetids.filter((id) => typeof id === "string") : [],
    groupFlight: sanitizeGroupFlight(trip.groupFlight),
  };
}

function sanitizeLeg(value: unknown): FlightLeg | null {
  if (!value || typeof value !== "object") return null;
  const leg = value as Partial<FlightLeg>;
  if (typeof leg.flight !== "string" || typeof leg.date !== "string") return null;
  return { flight: leg.flight, date: leg.date, time: String(leg.time ?? ""), from: String(leg.from ?? ""), to: String(leg.to ?? "") };
}

function sanitizeGroupFlight(value: unknown): GroupFlight | undefined {
  if (!value || typeof value !== "object") return undefined;
  const g = value as Partial<GroupFlight>;
  const outbound = sanitizeLeg(g.outbound);
  if (!outbound) return undefined;
  return {
    outbound,
    ret: sanitizeLeg(g.ret),
    link: typeof g.link === "string" ? g.link : "",
    setBy: typeof g.setBy === "string" ? g.setBy : "",
    booked: Array.isArray(g.booked) ? g.booked.filter((id) => typeof id === "string") : [],
    setAt: typeof g.setAt === "string" ? g.setAt : "",
  };
}

function loadState(): State {
  const base = defaultState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return base;
    const data = JSON.parse(raw) as Partial<State>;
    const incoming = data.filters ?? base.filters;
    const filters = { ...base.filters, ...incoming };
    if (!SCOPES.has(filters.scope)) filters.scope = "all";
    filters.features = Array.isArray(incoming.features) ? incoming.features.filter((id) => FEATURE_IDS.has(id)) : [];
    filters.continents = Array.isArray(incoming.continents) ? incoming.continents.filter((name) => CONTINENT_NAMES.has(name)) : [];
    return {
      ...base,
      theme: data.theme === "dark" ? "dark" : "light",
      view: data.view && VIEWS.has(data.view) ? data.view : base.view,
      season: data.season && SEASONS.has(data.season) ? data.season : base.season,
      sort: data.sort && SORTS.has(data.sort) ? data.sort : base.sort,
      sortDir: data.sortDir === "asc" ? "asc" : "desc",
      filters,
      selectedId: data.selectedId && PLACE_BY_ID.has(data.selectedId) ? data.selectedId : null,
      showFriends: data.showFriends !== false,
      trips: Array.isArray(data.trips) ? data.trips.map(sanitizeTrip).filter((trip): trip is Trip => trip !== null) : base.trips,
      friendFocus: typeof data.friendFocus === "string" ? data.friendFocus : base.friendFocus,
      toast: null,
      emptyGeo: null,
      homeTick: 0,
      mapMode: data.mapMode === "abroad" ? "abroad" : "travel",
      abroadTerm: data.abroadTerm === "Spring" || data.abroadTerm === "Summer" ? data.abroadTerm : "Fall",
      bucket: Array.isArray(data.bucket)
        ? data.bucket.filter((b): b is BucketItem => Boolean(b && typeof b.targetId === "string" && (b.kind === "place" || b.kind === "program")))
        : [],
      profileTab: data.profileTab && ["history", "bucket", "reviews", "settings", "moderation"].includes(data.profileTab) ? data.profileTab : "history",
      abroadIso: null,
      abroadProgramId: typeof data.abroadProgramId === "string" ? data.abroadProgramId : null,
    };
  } catch {
    return base;
  }
}

export type Action =
  | { type: "setTheme"; theme: ThemeName }
  | { type: "setView"; view: ViewName }
  | { type: "setSeason"; season: Season }
  | { type: "setSort"; sort: SortKey }
  | { type: "patchFilters"; patch: Partial<Filters> }
  | { type: "select"; id: string | null }
  | { type: "selectEmpty"; iso: string; name: string }
  | { type: "world" }
  | { type: "toggleFriends" }
  | { type: "focusFriend"; netid: string }
  | { type: "saveTrip"; trip: Trip; message?: string }
  | { type: "removeTrip"; id: string }
  | { type: "toast"; message: string }
  | { type: "clearToast" }
  | { type: "reset" }
  | { type: "setMapMode"; mode: MapMode }
  | { type: "selectAbroad"; iso: string | null }
  | { type: "setAbroadTerm"; term: AbroadTerm }
  | { type: "toggleBucket"; kind: BucketItem["kind"]; targetId: string; label?: string }
  | { type: "setBucketDone"; id: string; done: boolean }
  | { type: "openProfile"; tab: ProfileTab }
  | { type: "mergeTrips"; trips: Trip[] }
  | { type: "openProgram"; id: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "setTheme":
      return { ...state, theme: action.theme };
    case "setView":
      return { ...state, view: action.view };
    case "setSeason":
      return { ...state, season: action.season };
    case "setSort":
      if (state.sort === action.sort) return { ...state, sortDir: state.sortDir === "desc" ? "asc" : "desc" };
      return { ...state, sort: action.sort, sortDir: "desc" };
    case "patchFilters":
      return { ...state, filters: { ...state.filters, ...action.patch } };
    case "select":
      return {
        ...state,
        selectedId: action.id,
        emptyGeo: null,
        view: state.view === "catalog" ? "catalog" : action.id ? "map" : state.view,
      };
    case "selectEmpty":
      return { ...state, selectedId: null, emptyGeo: { iso: action.iso, name: action.name }, view: "map" };
    case "world":
      return {
        ...state,
        view: "map",
        selectedId: null,
        emptyGeo: null,
        homeTick: state.homeTick + 1,
        abroadIso: null,
        filters: { ...state.filters, scope: "all" },
      };
    case "toggleFriends":
      return { ...state, showFriends: !state.showFriends };
    case "focusFriend":
      return { ...state, friendFocus: action.netid, view: "friends" };
    case "saveTrip": {
      // Match by id, so a past trip and an upcoming trip to the same place can coexist.
      const index = state.trips.findIndex((trip) => trip.id === action.trip.id);
      const trips = index === -1 ? [...state.trips, action.trip] : state.trips.map((trip, i) => (i === index ? action.trip : trip));
      return { ...state, trips, toast: action.message ?? "Saved to itinerary" };
    }
    case "removeTrip":
      return { ...state, trips: state.trips.filter((trip) => trip.id !== action.id), toast: "Removed from itinerary" };
    case "toast":
      return { ...state, toast: action.message };
    case "clearToast":
      return { ...state, toast: null };
    case "setMapMode":
      return { ...state, mapMode: action.mode, view: "map", abroadIso: null, selectedId: null, emptyGeo: null };
    case "toggleBucket": {
      const existing = state.bucket.find((b) => b.kind === action.kind && b.targetId === action.targetId);
      if (existing) return { ...state, bucket: state.bucket.filter((b) => b !== existing), toast: "Removed from your bucket list" };
      const item: BucketItem = { id: `b-${action.kind}-${action.targetId}`, kind: action.kind, targetId: action.targetId, addedAt: new Date().toISOString(), done: false };
      return { ...state, bucket: [item, ...state.bucket], toast: `${action.label ?? "Added"} added to your bucket list` };
    }
    case "setBucketDone":
      return { ...state, bucket: state.bucket.map((b) => (b.id === action.id ? { ...b, done: action.done } : b)) };
    case "mergeTrips": {
      const have = new Set(state.trips.map((t) => t.id));
      const add = action.trips.filter((t) => !have.has(t.id));
      return add.length ? { ...state, trips: [...state.trips, ...add] } : state;
    }
    case "openProfile":
      return { ...state, view: "profile", profileTab: action.tab };
    case "setAbroadTerm":
      return { ...state, abroadTerm: action.term };
    case "selectAbroad":
      return { ...state, abroadIso: action.iso, selectedId: null, emptyGeo: null };
    case "openProgram":
      return { ...state, view: "abroad", abroadProgramId: action.id };
    case "reset":
      localStorage.removeItem(STORAGE_KEY);
      return { ...defaultState(), toast: "Demo data restored" };
    default: {
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}

type StoreValue = { state: State; dispatch: Dispatch<Action> };

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);

  useEffect(() => {
    document.documentElement.dataset.theme = state.theme;
  }, [state.theme]);

  useEffect(() => {
    const { toast: _toast, emptyGeo: _empty, homeTick: _home, abroadIso: _abroad, ...persist } = state;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persist));
  }, [state]);

  useEffect(() => {
    if (!state.toast) return;
    const timer = window.setTimeout(() => dispatch({ type: "clearToast" }), 2400);
    return () => window.clearTimeout(timer);
  }, [state.toast]);

  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useTripTable(): StoreValue {
  const value = useContext(StoreContext);
  if (!value) throw new Error("TripTable store missing");
  return value;
}

export type CatalogRow = { place: Place; count: number };

export function useCatalog(): {
  rows: CatalogRow[];
  passed: Set<string>;
  total: number;
  maxCountry: number;
} {
  const { state } = useTripTable();
  const { version } = useReviewStore();
  const { version: plansVersion } = usePlans();
  return useMemo(() => {
    const rows = [...PLACE_BY_ID.values()]
      .map((place) => ({ place, count: visitCount(place, state.season) }))
      .filter((row) => passesFilters(row.place, row.count, state.filters))
      // Lists show countries and cities. Attractions outside the U.S. (parks, landmarks) stay inside
      // their country's panel and on the map, and still turn up when you search for them by name.
      .filter(
        (row) =>
          row.place.kind === "country" ||
          row.place.cat === "city" ||
          row.place.iso === "US" ||
          state.filters.query.trim().length > 0,
      );
    const direction = state.sortDir === "asc" ? 1 : -1;
    rows.sort((a, b) => {
      const primary =
        state.sort === "yalies" ? a.count - b.count : sortScore(a.place.id, state.sort) - sortScore(b.place.id, state.sort);
      if (primary !== 0) return primary * direction;
      return (a.count - b.count) * direction || a.place.name.localeCompare(b.place.name);
    });
    const passed = new Set(rows.map((row) => row.place.id));
    const total =
      state.filters.scope === "us"
        ? rows.filter((row) => row.place.kind === "spot").reduce((sum, row) => sum + row.count, 0)
        : rows.filter((row) => row.place.kind === "country").reduce((sum, row) => sum + row.count, 0);
    const maxCountry = Math.max(
      1,
      ...[...PLACE_BY_ID.values()].filter((place) => place.kind === "country").map((place) => visitCount(place, state.season)),
    );
    return { rows, passed, total, maxCountry };
  }, [state.filters, state.season, state.sort, state.sortDir, version, plansVersion]);
}

export function useFriends(): Person[] {
  return useAccount().friends;
}

