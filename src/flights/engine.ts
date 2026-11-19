// Trip logistics for TripTable: which airport, how to get there from Old Campus, and links out.
// There is no in-app flight data. Fares, schedules and booking all happen on Google Flights.
// Ground times and costs below are rough estimates for planning, not quotes.

import { parseISODate } from "../logic";
import type { Place } from "../types";
import { YALE_RECESSES } from "../yaleCalendar";

export type GroundLeg = {
  id: string;
  label: string;
  mins: number;
  cost: number;
  co2: number;
  splittable: boolean; // a car you can share with friends
};

export type Gateway = {
  code: string;
  name: string;
  city: string;
  lat: number;
  lng: number;
  security: number;
  ground: GroundLeg[];
};

export const YALE = { lat: 41.3083, lng: -72.9279 };

export const GATEWAYS: Gateway[] = [
  {
    code: "HVN", name: "Tweed-New Haven", city: "New Haven", lat: 41.2637, lng: -72.8868, security: 45,
    ground: [
      { id: "hvn-uber", label: "Uber to Tweed", mins: 15, cost: 18, co2: 2, splittable: true },
      { id: "hvn-bus", label: "CTtransit bus", mins: 40, cost: 2, co2: 1, splittable: false },
    ],
  },
  {
    code: "BDL", name: "Bradley", city: "Hartford", lat: 41.9389, lng: -72.6832, security: 75,
    ground: [
      { id: "bdl-uber", label: "Uber to Bradley", mins: 60, cost: 95, co2: 14, splittable: true },
      { id: "bdl-train", label: "Hartford Line + Bradley Flyer", mins: 105, cost: 12, co2: 3, splittable: false },
      { id: "bdl-shuttle", label: "CT Limo shuttle", mins: 75, cost: 59, co2: 6, splittable: false },
    ],
  },
  {
    code: "JFK", name: "JFK", city: "New York", lat: 40.6413, lng: -73.7781, security: 120,
    ground: [
      { id: "jfk-train", label: "Metro-North + LIRR + AirTrain", mins: 150, cost: 38, co2: 4, splittable: false },
      { id: "jfk-shuttle", label: "GO Airport Shuttle", mins: 125, cost: 89, co2: 10, splittable: false },
      { id: "jfk-uber", label: "Uber to JFK", mins: 110, cost: 210, co2: 25, splittable: true },
    ],
  },
  {
    code: "LGA", name: "LaGuardia", city: "New York", lat: 40.7769, lng: -73.874, security: 100,
    ground: [
      { id: "lga-train", label: "Metro-North + Q70 bus", mins: 130, cost: 26, co2: 3, splittable: false },
      { id: "lga-uber", label: "Uber to LaGuardia", mins: 95, cost: 180, co2: 22, splittable: true },
    ],
  },
  {
    code: "EWR", name: "Newark", city: "Newark", lat: 40.6895, lng: -74.1745, security: 120,
    ground: [
      { id: "ewr-amtrak", label: "Amtrak to Newark Airport", mins: 120, cost: 52, co2: 4, splittable: false },
      { id: "ewr-uber", label: "Uber to Newark", mins: 120, cost: 230, co2: 28, splittable: true },
    ],
  },
  {
    code: "BOS", name: "Logan", city: "Boston", lat: 42.3656, lng: -71.0096, security: 110,
    ground: [{ id: "bos-amtrak", label: "Amtrak + Silver Line", mins: 190, cost: 61, co2: 5, splittable: false }],
  },
];

export type Airport = { code: string; city: string; lat: number; lng: number; iso: string };

const AIRPORTS: Airport[] = [
  { code: "SJU", city: "San Juan", lat: 18.439, lng: -66.002, iso: "PR" },
  { code: "MEX", city: "Mexico City", lat: 19.436, lng: -99.072, iso: "MX" },
  { code: "OAX", city: "Oaxaca", lat: 16.999, lng: -96.727, iso: "MX" },
  { code: "CUN", city: "Cancún", lat: 21.037, lng: -86.877, iso: "MX" },
  { code: "BOS", city: "Boston", lat: 42.366, lng: -71.01, iso: "US" },
  { code: "DCA", city: "Washington", lat: 38.852, lng: -77.038, iso: "US" },
  { code: "PHL", city: "Philadelphia", lat: 39.874, lng: -75.243, iso: "US" },
  { code: "MIA", city: "Miami", lat: 25.795, lng: -80.29, iso: "US" },
  { code: "MSY", city: "New Orleans", lat: 29.993, lng: -90.258, iso: "US" },
  { code: "AUS", city: "Austin", lat: 30.197, lng: -97.666, iso: "US" },
  { code: "CHS", city: "Charleston", lat: 32.899, lng: -80.04, iso: "US" },
  { code: "BNA", city: "Nashville", lat: 36.124, lng: -86.678, iso: "US" },
  { code: "LAX", city: "Los Angeles", lat: 33.942, lng: -118.408, iso: "US" },
  { code: "SFO", city: "San Francisco", lat: 37.621, lng: -122.379, iso: "US" },
  { code: "HNL", city: "Honolulu", lat: 21.318, lng: -157.922, iso: "US" },
  { code: "PHX", city: "Phoenix", lat: 33.434, lng: -112.012, iso: "US" },
  { code: "ELP", city: "El Paso", lat: 31.807, lng: -106.378, iso: "US" },
  { code: "LAS", city: "Las Vegas", lat: 36.084, lng: -115.154, iso: "US" },
  { code: "PSP", city: "Palm Springs", lat: 33.83, lng: -116.507, iso: "US" },
  { code: "SJC", city: "San Jose", lat: 37.363, lng: -121.929, iso: "US" },
  { code: "BGR", city: "Bangor", lat: 44.807, lng: -68.828, iso: "US" },
  { code: "AVL", city: "Asheville", lat: 35.436, lng: -82.542, iso: "US" },
  { code: "ORD", city: "Chicago", lat: 41.974, lng: -87.907, iso: "US" },
  { code: "DEN", city: "Denver", lat: 39.856, lng: -104.674, iso: "US" },
  { code: "FCO", city: "Rome", lat: 41.8, lng: 12.239, iso: "IT" },
  { code: "FLR", city: "Florence", lat: 43.81, lng: 11.205, iso: "IT" },
  { code: "NAP", city: "Naples", lat: 40.886, lng: 14.291, iso: "IT" },
  { code: "HND", city: "Tokyo", lat: 35.549, lng: 139.78, iso: "JP" },
  { code: "KIX", city: "Osaka (Kyoto)", lat: 34.434, lng: 135.244, iso: "JP" },
  { code: "MAD", city: "Madrid", lat: 40.498, lng: -3.567, iso: "ES" },
  { code: "BCN", city: "Barcelona", lat: 41.297, lng: 2.078, iso: "ES" },
  { code: "CDG", city: "Paris", lat: 49.01, lng: 2.548, iso: "FR" },
  { code: "LHR", city: "London", lat: 51.47, lng: -0.454, iso: "GB" },
  { code: "EDI", city: "Edinburgh", lat: 55.95, lng: -3.372, iso: "GB" },
  { code: "KEF", city: "Reykjavík", lat: 63.985, lng: -22.605, iso: "IS" },
  { code: "LIS", city: "Lisbon", lat: 38.774, lng: -9.134, iso: "PT" },
  { code: "ICN", city: "Seoul", lat: 37.46, lng: 126.44, iso: "KR" },
  { code: "RAK", city: "Marrakech", lat: 31.607, lng: -8.036, iso: "MA" },
  { code: "TNG", city: "Tangier", lat: 35.727, lng: -5.917, iso: "MA" },
  { code: "CMN", city: "Casablanca", lat: 33.367, lng: -7.59, iso: "MA" },
  { code: "SJO", city: "San José", lat: 9.994, lng: -84.209, iso: "CR" },
  { code: "LIR", city: "Liberia", lat: 10.593, lng: -85.544, iso: "CR" },
  { code: "ATH", city: "Athens", lat: 37.936, lng: 23.947, iso: "GR" },
  { code: "ZRH", city: "Zürich", lat: 47.458, lng: 8.556, iso: "CH" },
  { code: "GVA", city: "Geneva", lat: 46.238, lng: 6.109, iso: "CH" },
  { code: "BKK", city: "Bangkok", lat: 13.69, lng: 100.75, iso: "TH" },
  { code: "YUL", city: "Montréal", lat: 45.47, lng: -73.741, iso: "CA" },
  { code: "YYZ", city: "Toronto", lat: 43.677, lng: -79.631, iso: "CA" },
  { code: "PUJ", city: "Punta Cana", lat: 18.567, lng: -68.363, iso: "DO" },
  { code: "NAS", city: "Nassau", lat: 25.039, lng: -77.466, iso: "BS" },
  { code: "MBJ", city: "Montego Bay", lat: 18.504, lng: -77.913, iso: "JM" },
  { code: "AMS", city: "Amsterdam", lat: 52.31, lng: 4.768, iso: "NL" },
  { code: "BER", city: "Berlin", lat: 52.366, lng: 13.503, iso: "DE" },
  { code: "DUB", city: "Dublin", lat: 53.421, lng: -6.27, iso: "IE" },
  { code: "DBV", city: "Dubrovnik", lat: 42.561, lng: 18.268, iso: "HR" },
  { code: "PRG", city: "Prague", lat: 50.101, lng: 14.26, iso: "CZ" },
  { code: "IST", city: "Istanbul", lat: 41.262, lng: 28.742, iso: "TR" },
  { code: "SGN", city: "Ho Chi Minh City", lat: 10.819, lng: 106.652, iso: "VN" },
  { code: "DPS", city: "Bali", lat: -8.748, lng: 115.167, iso: "ID" },
  { code: "BOG", city: "Bogotá", lat: 4.702, lng: -74.147, iso: "CO" },
  { code: "CTG", city: "Cartagena", lat: 10.442, lng: -75.513, iso: "CO" },
  { code: "LIM", city: "Lima", lat: -12.022, lng: -77.114, iso: "PE" },
  { code: "CAI", city: "Cairo", lat: 30.122, lng: 31.406, iso: "EG" },
  { code: "SYD", city: "Sydney", lat: -33.94, lng: 151.175, iso: "AU" },
];

// A country pin flies to its main gateway, not its geographic center.
const COUNTRY_AIRPORT: Record<string, string> = {
  PR: "SJU", MX: "CUN", US: "LAX", IT: "FCO", JP: "HND", ES: "MAD", FR: "CDG", GB: "LHR", IS: "KEF", PT: "LIS",
  KR: "ICN", MA: "RAK", CR: "SJO", GR: "ATH", CH: "ZRH", TH: "BKK", CA: "YYZ", DO: "PUJ", BS: "NAS", JM: "MBJ",
  NL: "AMS", DE: "BER", IE: "DUB", HR: "DBV", CZ: "PRG", TR: "IST", VN: "SGN", ID: "DPS", CO: "CTG", PE: "LIM",
  EG: "CAI", AU: "SYD",
};

// Places close enough that you skip the airport.
export type GroundRoute = { label: string; kind: "train" | "bus" | "drive" | "ferry"; mins: number; cost: number; co2: number; splittable?: boolean };
const GROUND_ROUTES: Record<string, GroundRoute[]> = {
  nyc: [
    { label: "Metro-North to Grand Central", kind: "train", mins: 125, cost: 21, co2: 3 },
    { label: "Amtrak to Penn Station", kind: "train", mins: 100, cost: 42, co2: 3 },
    { label: "FlixBus from Union Station", kind: "bus", mins: 135, cost: 15, co2: 3 },
  ],
  boston: [
    { label: "Amtrak Northeast Regional", kind: "train", mins: 165, cost: 49, co2: 5 },
    { label: "Acela", kind: "train", mins: 135, cost: 95, co2: 5 },
    { label: "Peter Pan bus", kind: "bus", mins: 180, cost: 25, co2: 4 },
  ],
  philly: [
    { label: "Amtrak Northeast Regional", kind: "train", mins: 175, cost: 58, co2: 6 },
    { label: "Metro-North + NJ Transit + SEPTA", kind: "train", mins: 260, cost: 38, co2: 6 },
  ],
  dc: [
    { label: "Amtrak Northeast Regional", kind: "train", mins: 300, cost: 79, co2: 9 },
    { label: "Acela", kind: "train", mins: 250, cost: 145, co2: 9 },
    { label: "FlixBus", kind: "bus", mins: 390, cost: 35, co2: 8 },
  ],
  montreal: [{ label: "Amtrak Adirondack via NYC", kind: "train", mins: 760, cost: 112, co2: 18 }],
  hudson: [
    { label: "Metro-North + Hudson Line", kind: "train", mins: 170, cost: 34, co2: 4 },
    { label: "Zipcar drive", kind: "drive", mins: 95, cost: 110, co2: 22, splittable: true },
  ],
  montauk: [
    { label: "Cross Sound Ferry + drive", kind: "ferry", mins: 210, cost: 95, co2: 20, splittable: true },
    { label: "Metro-North + LIRR to Montauk", kind: "train", mins: 330, cost: 58, co2: 6 },
  ],
  block: [{ label: "Drive to Point Judith + Block Island Ferry", kind: "ferry", mins: 140, cost: 68, co2: 15 }],
  newport: [
    { label: "Zipcar drive", kind: "drive", mins: 105, cost: 95, co2: 20, splittable: true },
    { label: "Amtrak to Kingston + RIPTA bus", kind: "train", mins: 170, cost: 41, co2: 5 },
  ],
  acadia: [{ label: "Drive (rental, split)", kind: "drive", mins: 420, cost: 260, co2: 95, splittable: true }],
};

export type Destination = {
  place: Place;
  airport: Airport | null;
  transfer: { label: string; mins: number; cost: number } | null;
  domestic: boolean;
  groundRoutes: GroundRoute[];
};

export function km(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = (x: number) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}
export function todayISO(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())).toISOString().slice(0, 10);
}
export function addDays(iso: string, days: number): string {
  return new Date(parseISODate(iso) + days * 86_400_000).toISOString().slice(0, 10);
}
export function daysBetween(a: string, b: string): number {
  return Math.round((parseISODate(b) - parseISODate(a)) / 86_400_000);
}
export function clock(mins: number): string {
  const m = ((Math.round(mins) % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  return `${((h + 11) % 12) + 1}:${String(m % 60).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}
export function duration(mins: number): string {
  const m = Math.round(mins);
  const h = Math.floor(m / 60);
  return h ? `${h}h${m % 60 ? ` ${m % 60}m` : ""}` : `${m}m`;
}


// ---------- Yale breaks (Yale College 2026–27; verify on the official calendar) ----------
// Yale College recesses (see yaleCalendar.ts), with the days fares usually peak.
const PEAKS: Record<string, string[]> = {
  oct: ["2026-10-20", "2026-10-25"],
  nov: ["2026-11-21", "2026-11-25", "2026-11-29"],
  win: ["2026-12-19", "2026-12-23", "2027-01-17"],
  spr: ["2027-03-05", "2027-03-06", "2027-03-21"],
  sum: ["2027-05-13"],
};
export const BREAKS = YALE_RECESSES.map((r) => ({ id: r.id, label: r.label, start: r.leave, end: r.back, peaks: PEAKS[r.id] ?? [r.leave], note: r.note }));

// ---------- destination resolution ----------
export function resolveDestination(place: Place): Destination {
  const domestic = place.iso === "US" || place.iso === "PR";
  const groundRoutes = GROUND_ROUTES[place.id] ?? [];
  let airport: Airport | null = null;
  if (place.kind === "country") {
    airport = AIRPORTS.find((a) => a.code === COUNTRY_AIRPORT[place.iso]) ?? null;
  } else {
    const sameCountry = AIRPORTS.filter((a) => a.iso === place.iso);
    const pool = sameCountry.length ? sameCountry : AIRPORTS;
    airport = pool.reduce<Airport | null>((best, a) => (!best || km(a, place) < km(best, place) ? a : best), null);
  }
  if (airport && km(YALE, airport) < 320) airport = null; // too close to fly
  let transfer: Destination["transfer"] = null;
  if (airport && place.kind === "spot") {
    const d = km(airport, place);
    if (d > 45) {
      const mins = Math.round((d * 1.25) / 75 * 60 + 15);
      transfer = { label: `${airport.city} → ${place.name} by car or bus`, mins, cost: Math.round(18 + d * 0.22) };
    }
  }
  return { place, airport, transfer, domestic, groundRoutes };
}


// ---------- links out ----------
const OLD_CAMPUS = "Old Campus, Yale University, New Haven, CT";

/** Round-trip search on Google Flights. `from` can be an airport code or a city name. */
export function googleFlights(from: string, to: string, out: string, back: string): string {
  return `https://www.google.com/travel/flights?q=${encodeURIComponent(`Flights from ${from} to ${to} on ${out} through ${back}`)}`;
}

/** Google Flights search narrowed to one specific flight, so a group can find the exact same one. */
export function googleExactFlight(flight: string, from: string, to: string, date: string): string {
  return `https://www.google.com/travel/flights?q=${encodeURIComponent(`${flight} from ${from} to ${to} on ${date}`)}`;
}

/** Live flight status (Google shows it for a flight number search). */
export function flightStatus(flight: string, date: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(`${flight} flight status ${date}`)}`;
}

/** Door-to-door directions from Old Campus. */
export function directions(to: string, mode: "transit" | "driving" = "transit"): string {
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(OLD_CAMPUS)}&destination=${encodeURIComponent(to)}&travelmode=${mode}`;
}

export const GROUND_LINKS: Record<GroundRoute["kind"], { label: string; url: string }[]> = {
  train: [
    { label: "Amtrak", url: "https://www.amtrak.com/" },
    { label: "Metro-North (TrainTime)", url: "https://new.mta.info/agency/metro-north-railroad" },
  ],
  bus: [
    { label: "FlixBus", url: "https://www.flixbus.com/" },
    { label: "Peter Pan", url: "https://peterpanbus.com/" },
  ],
  drive: [{ label: "Zipcar", url: "https://www.zipcar.com/" }],
  ferry: [{ label: "Cross Sound Ferry", url: "https://www.longislandferry.com/" }],
};

/** Normalizes "b6 1503", "B61503", "jetblue 1503" style input to "B6 1503". Returns null if it doesn't look like a flight number. */
export function normalizeFlight(raw: string): string | null {
  const m = raw.trim().toUpperCase().replace(/\s+/g, " ").match(/^([A-Z0-9]{2})\s?(\d{1,4})$/);
  return m ? `${m[1]} ${m[2]}` : null;
}
