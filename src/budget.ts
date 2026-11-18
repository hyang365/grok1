// Rough per-person trip costs from New Haven, for the budget finder.
// These are planning estimates (round-trip travel, a shared mid-range room,
// and daily food, local transport and activities), not quotes.

import type { Place } from "./types";

export type Cost = { travel: number; bed: number; day: number; how: string };

const COUNTRY: Record<string, Cost> = {
  PR: { travel: 350, bed: 110, day: 70, how: "flight" },
  MX: { travel: 450, bed: 70, day: 50, how: "flight" },
  US: { travel: 320, bed: 130, day: 80, how: "flight" },
  IT: { travel: 900, bed: 110, day: 80, how: "flight" },
  JP: { travel: 1400, bed: 90, day: 70, how: "flight" },
  ES: { travel: 800, bed: 85, day: 65, how: "flight" },
  FR: { travel: 800, bed: 120, day: 85, how: "flight" },
  GB: { travel: 750, bed: 120, day: 85, how: "flight" },
  IS: { travel: 650, bed: 150, day: 110, how: "flight" },
  PT: { travel: 750, bed: 80, day: 60, how: "flight" },
  KR: { travel: 1300, bed: 80, day: 60, how: "flight" },
  MA: { travel: 900, bed: 50, day: 40, how: "flight" },
  CR: { travel: 500, bed: 70, day: 60, how: "flight" },
  GR: { travel: 950, bed: 90, day: 70, how: "flight" },
  CH: { travel: 900, bed: 170, day: 120, how: "flight" },
  TH: { travel: 1300, bed: 35, day: 35, how: "flight" },
  CA: { travel: 350, bed: 110, day: 75, how: "flight" },
  DO: { travel: 450, bed: 80, day: 60, how: "flight" },
  BS: { travel: 400, bed: 190, day: 90, how: "flight" },
  JM: { travel: 450, bed: 110, day: 65, how: "flight" },
  NL: { travel: 750, bed: 120, day: 80, how: "flight" },
  DE: { travel: 750, bed: 95, day: 70, how: "flight" },
  IE: { travel: 700, bed: 110, day: 80, how: "flight" },
  HR: { travel: 900, bed: 85, day: 65, how: "flight" },
  CZ: { travel: 800, bed: 65, day: 50, how: "flight" },
  TR: { travel: 900, bed: 55, day: 45, how: "flight" },
  VN: { travel: 1300, bed: 30, day: 30, how: "flight" },
  ID: { travel: 1500, bed: 40, day: 35, how: "flight" },
  CO: { travel: 550, bed: 45, day: 40, how: "flight" },
  PE: { travel: 750, bed: 50, day: 45, how: "flight" },
  EG: { travel: 1000, bed: 50, day: 40, how: "flight" },
  AU: { travel: 1800, bed: 110, day: 80, how: "flight" },
};

// Places that cost noticeably more or less than their country, or that you reach by train, bus or car.
const SPOT: Record<string, Partial<Cost>> = {
  nyc: { travel: 40, bed: 170, day: 90, how: "Metro-North" },
  boston: { travel: 60, bed: 150, day: 80, how: "train or bus" },
  dc: { travel: 120, bed: 130, day: 70, how: "Amtrak" },
  philly: { travel: 90, bed: 110, day: 65, how: "Amtrak" },
  hudson: { travel: 60, bed: 140, day: 70, how: "train" },
  montauk: { travel: 70, bed: 200, day: 80, how: "train" },
  block: { travel: 80, bed: 200, day: 80, how: "car and ferry" },
  newport: { travel: 60, bed: 170, day: 80, how: "car" },
  acadia: { travel: 150, bed: 120, day: 60, how: "car" },
  montreal: { travel: 200, bed: 100, day: 70, how: "train or flight" },
  honolulu: { travel: 750, bed: 180, day: 90 },
  marfa: { travel: 450, bed: 150 },
  wave: { travel: 450, bed: 120 },
  salvation: { travel: 450, bed: 110 },
  sedona: { travel: 400, bed: 160 },
  bigsur: { travel: 450, bed: 200 },
  sf: { travel: 400, bed: 180, day: 90 },
  la: { travel: 380, bed: 160, day: 85 },
  miami: { travel: 250, bed: 160 },
  zermatt: { bed: 220, day: 130 },
  amalfi: { bed: 180 },
  lakecomo: { bed: 170 },
  santorini: { bed: 150 },
  mykonos: { bed: 170, day: 90 },
  london: { bed: 140, day: 90 },
  paris: { bed: 140, day: 90 },
  tokyo: { bed: 100 },
  eleuthera: { bed: 240 },
  exuma: { bed: 230, travel: 550 },
  culebra: { travel: 420 },
  greatbarrierreef: { travel: 2000 },
  komodo: { travel: 1700 },
  gili: { travel: 1600 },
  machupicchu: { travel: 950, day: 80 },
  merzouga: { day: 70 },
  banff: { travel: 500, bed: 170 },
  vancouver: { travel: 500 },
  skye: { bed: 150 },
};

export function costOf(place: Place): Cost {
  const base = COUNTRY[place.iso] ?? { travel: 900, bed: 100, day: 70, how: "flight" };
  return { ...base, ...(SPOT[place.id] ?? {}) };
}

/** Lodging per person: solo travelers pay for the whole room, bigger groups split rentals. */
export function roomShare(travelers: number): number {
  if (travelers <= 1) return 1.6;
  if (travelers >= 4) return 0.8;
  return 1;
}

export type Estimate = { total: number; travel: number; stay: number; daily: number; how: string };

export function estimate(place: Place, nights: number, travelers: number): Estimate {
  const c = costOf(place);
  const travel = c.travel;
  const stay = Math.round(c.bed * nights * roomShare(travelers));
  const daily = c.day * (nights + 1);
  return { total: travel + stay + daily, travel, stay, daily, how: c.how };
}
