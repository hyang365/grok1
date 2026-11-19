import { summaryAvg, summaryCount } from "./reviews/store";
import { planCount, seasonYear } from "./live/plans";
import { PLACES } from "./data";
import { CONTINENT_BY_ISO } from "./morePlaces";
import { FIXED_SCORES } from "./fun/harvard";
import { YALE_RECESSES, recessWindow } from "./yaleCalendar";
import type { Filters, Person, PersonTrip, Place, Season, Trip } from "./types";

export const CURRENT_YEAR = 2026;

export const SEASONS: { id: Season; label: string }[] = [
  { id: "spring", label: "Spring Break" },
  { id: "summer", label: "Summer" },
  { id: "fall", label: "Fall Break" },
  { id: "winter", label: "Winter" },
  { id: "weekend", label: "Weekends" },
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function seasonLabel(id: Season): string {
  return SEASONS.find((season) => season.id === id)?.label ?? id;
}

/** Live count of Yale students who saved a trip here (a country includes its spots). Never sample data. */
export function visitCount(place: Place, season: Season, year = seasonYear(season)): number {
  let n = planCount(place.id, season, year);
  if (place.kind === "country") {
    for (const child of CHILDREN.get(place.id) ?? []) n += planCount(child, season, year);
  }
  return n;
}

const CHILDREN = new Map<string, string[]>();
for (const p of PLACES) {
  // Hand-set joke scores (Harvard) never count toward their country.
  if (p.parentId && !(p.id in FIXED_SCORES)) CHILDREN.set(p.parentId, [...(CHILDREN.get(p.parentId) ?? []), p.id]);
}

/** Default dates for a season: Yale's break calendar, rolled to the next occurrence. */
export function defaultWindow(season: Season): [string, string] {
  const y = seasonYear(season);
  // Published Yale recesses first (October recess for fall, or November recess once October's has passed).
  const today = new Date().toISOString().slice(0, 10);
  const official = YALE_RECESSES.filter((r) => r.season === season && r.year === y && r.leave > today);
  if (official.length) return recessWindow(official[0]);
  // Not published yet: the usual Yale pattern.
  if (season === "spring") return [`${y}-03-13`, `${y}-03-21`];
  if (season === "summer") return [`${y}-06-01`, `${y}-06-14`];
  if (season === "fall") return [`${y}-10-15`, `${y}-10-19`];
  if (season === "winter") return [`${y}-12-20`, `${y + 1}-01-03`];
  const d = new Date();
  d.setDate(d.getDate() + ((5 - d.getDay() + 7) % 7 || 7));
  const fri = d.toISOString().slice(0, 10);
  d.setDate(d.getDate() + 2);
  return [fri, d.toISOString().slice(0, 10)];
}

export function parseISODate(iso: string): number {
  const [year, month, day] = iso.split("-").map(Number);
  return Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1);
}

export function daysInclusive(start: string, end: string): number {
  const from = parseISODate(start);
  const to = parseISODate(end);
  if (to < from) return 0;
  return Math.round((to - from) / 86_400_000) + 1;
}

export function daysOverlap(a0: string, a1: string, b0: string, b1: string): number {
  const start = Math.max(parseISODate(a0), parseISODate(b0));
  const end = Math.min(parseISODate(a1), parseISODate(b1));
  if (end < start) return 0;
  return Math.round((end - start) / 86_400_000) + 1;
}

export function formatRange(start: string, end: string): string {
  const a = new Date(parseISODate(start));
  const b = new Date(parseISODate(end));
  const left = MONTHS[a.getUTCMonth()] ?? "";
  const right = MONTHS[b.getUTCMonth()] ?? "";
  if (a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth()) {
    return `${left} ${a.getUTCDate()}–${b.getUTCDate()}`;
  }
  if (a.getUTCFullYear() === b.getUTCFullYear()) {
    return `${left} ${a.getUTCDate()} – ${right} ${b.getUTCDate()}`;
  }
  return `${left} ${a.getUTCDate()}, ${a.getUTCFullYear()} – ${right} ${b.getUTCDate()}, ${b.getUTCFullYear()}`;
}

export function formatMoney(amount: number): string {
  return `$${amount.toLocaleString("en-US")}`;
}

export function ratingBand(score: number): "great" | "good" | "ok" | "low" {
  if (score >= 4.5) return "great";
  if (score >= 4) return "good";
  if (score >= 3.4) return "ok";
  return "low";
}

const MONTH: Record<Season, number> = { spring: 2, summer: 6, fall: 9, winter: 0, weekend: 4 };

export const TEMP_LABELS = ["Very cold", "Cold", "Mild", "Warm", "Hot", "Very hot"] as const;

export const FEATURES: { id: string; label: string; tags: string[] }[] = [
  { id: "beach", label: "Beaches", tags: ["beach", "coast", "swim"] },
  { id: "mountain", label: "Mountains", tags: ["mountain", "hike", "ski"] },
  { id: "city", label: "City", tags: ["city"] },
  { id: "island", label: "Island", tags: ["island"] },
  { id: "desert", label: "Desert", tags: ["desert"] },
  { id: "food", label: "Food", tags: ["food"] },
];

export const CONTINENTS = ["North America", "Caribbean", "Central America", "South America", "Europe", "Africa", "Asia", "Oceania"];

// State Department Level 4 countries, the list Yale College uses for its undergraduate travel ban.
// TravelGov, 9 November 2026: Afghanistan, Belarus, Burkina Faso, Burma, Central African Republic,
// Chad, DR Congo, Haiti, Iran, Iraq, Lebanon, Libya, Mali, Niger, North Korea, Russia, Somalia,
// South Sudan, Sudan, Syria, Uganda, Ukraine, Yemen. Venezuela is not on that list.
const BLOCKED_ISOS = new Set(["AF", "BY", "BF", "MM", "CF", "TD", "CD", "HT", "IR", "IQ", "LB", "LY", "ML", "NE", "KP", "RU", "SO", "SS", "SD", "SY", "UG", "UA", "YE"]);

const REGIONAL: Record<string, string> = {
  MX: "A Level 4 advisory covers specific states, including Colima, Guerrero, Michoacán, Sinaloa, Tamaulipas, and Zacatecas. Yale will not sponsor travel to those states. Mexico City and Oaxaca are outside that list.",
  EG: "A Level 4 advisory covers the Sinai Peninsula. Yale will not sponsor travel there. The rest of Egypt is not under a countrywide ban.",
  CO: "A Level 4 advisory covers specific regions rather than the whole country. Yale will not sponsor travel into those regions.",
};

// Yale doesn't restrict these, but the State Department advisory has warnings worth reading first.
const CAUTION: Record<string, string> = {
  CN: "Yale doesn't restrict travel here, but the State Department's Level 2 advisory warns about exit bans and wrongful detention. Read it before you book.",
  HK: "Yale doesn't restrict travel here, but the State Department's Level 2 advisory warns about arbitrary enforcement of local laws. Read it before you go.",
};

export type Guidance = { level: "ok" | "regional" | "blocked"; title: string; detail: string };

const WAIVER =
  "If Yale funds the trip, awards credit, or a recognized student organization is going, file the OISP waiver and assumption of risk before departure.";

export function averageTempC(lat: number, season: Season): number {
  const month = MONTH[season];
  const abs = Math.abs(lat);
  const mean = 28 - abs * 0.42;
  const amp = 3 + abs * 0.32;
  const north = ((month - 6) / 12) * Math.PI * 2;
  const phase = lat >= 0 ? north : north + Math.PI;
  return Math.round(mean + amp * Math.cos(phase));
}

export function tempBand(celsius: number): number {
  if (celsius < 5) return 0;
  if (celsius < 12) return 1;
  if (celsius < 18) return 2;
  if (celsius < 24) return 3;
  if (celsius < 30) return 4;
  return 5;
}

export function warmthLabel(band: number): string {
  return band <= 0 ? "Any" : TEMP_LABELS[Math.min(5, band)] ?? "Very hot";
}

const ISO_CONTINENT: Record<string, string[]> = {
  US: ["North America"],
  CA: ["North America"],
  MX: ["North America"],
  PR: ["Caribbean"],
  DO: ["Caribbean"],
  BS: ["Caribbean"],
  JM: ["Caribbean"],
  CR: ["Central America"],
  CO: ["South America"],
  PE: ["South America"],
  IT: ["Europe"],
  ES: ["Europe"],
  FR: ["Europe"],
  GB: ["Europe"],
  IS: ["Europe"],
  PT: ["Europe"],
  GR: ["Europe"],
  CH: ["Europe"],
  NL: ["Europe"],
  DE: ["Europe"],
  IE: ["Europe"],
  HR: ["Europe"],
  CZ: ["Europe"],
  TR: ["Europe", "Asia"],
  MA: ["Africa"],
  EG: ["Africa"],
  JP: ["Asia"],
  CN: ["Asia"],
  HK: ["Asia"],
  KR: ["Asia"],
  TH: ["Asia"],
  VN: ["Asia"],
  ID: ["Asia"],
  AU: ["Oceania"],
};

export function continentsOf(place: Place): string[] {
  const extra = CONTINENT_BY_ISO[place.iso];
  return ISO_CONTINENT[place.iso] ?? (extra ? [extra] : ["North America"]);
}

export function featureMatch(place: Place, id: string): boolean {
  const feature = FEATURES.find((item) => item.id === id);
  return Boolean(feature && feature.tags.some((tag) => place.tags.includes(tag)));
}

export function travelGuidance(iso: string): Guidance {
  if (iso === "US" || iso === "PR") {
    return {
      level: "ok",
      title: "Domestic",
      detail: iso === "PR" ? "Puerto Rico is a U.S. territory, so the international sponsorship ban does not apply." : "Travel inside the United States is outside the international sponsorship ban.",
    };
  }
  if (BLOCKED_ISOS.has(iso)) {
    return {
      level: "blocked",
      title: "On Yale's travel ban list",
      detail: "This country is on Yale's travel ban list. The State Department Level 4 “Do Not Travel” advisory means Yale College will not fund, credit, or sponsor undergraduate travel here. No exceptions.",
    };
  }
  if (iso === "CU") {
    return {
      level: "regional",
      title: "Cuba needs extra Yale review",
      detail: `Academic work in Cuba has separate Office of the General Counsel rules on top of the travel policy. ${WAIVER}`,
    };
  }
  if (CAUTION[iso]) {
    return { level: "ok", title: "Allowed, with extra caution", detail: `${CAUTION[iso]} ${WAIVER}` };
  }
  if (REGIONAL[iso]) {
    return { level: "regional", title: "Yale restricts part of this country", detail: `${REGIONAL[iso]} ${WAIVER}` };
  }
  return {
    level: "ok",
    title: "Safe to travel",
    detail: "No Yale travel restrictions here. Taking a Yale-funded or for-credit trip? File the OISP travel waiver before you go.",
  };
}

export function passesFilters(place: Place, count: number, filters: Filters): boolean {
  if (filters.minYalies > 0 && count < filters.minYalies) return false;
  for (const key of ["overall", "affordability", "safety", "beauty"] as const) {
    if (filters[key] <= 1) continue;
    const value = scoreOf(place.id, key);
    if (value === null || value + 1e-6 < filters[key]) return false;
  }
  if (filters.features.length > 0 && !filters.features.some((id) => featureMatch(place, id))) return false;
  if (filters.continents.length > 0 && !continentsOf(place).some((name) => filters.continents.includes(name))) return false;
  if (filters.scope === "countries" && place.kind !== "country") return false;
  if (filters.scope === "us" && place.iso !== "US") return false;
  const query = filters.query.trim().toLowerCase();
  if (!query) return true;
  const haystack = [place.name, place.region, place.blurb, place.guide, place.atlas ?? "", ...place.tags, ...place.aliases]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

export function filtersAreDefault(filters: Filters): boolean {
  return (
    filters.overall <= 1 &&
    filters.affordability <= 1 &&
    filters.safety <= 1 &&
    filters.beauty <= 1 &&
    filters.minYalies <= 0 &&
    filters.features.length === 0 &&
    filters.continents.length === 0 &&
    (filters.scope === "all" || filters.scope === "countries")
  );
}

export type FriendHit = { person: Person; trip: PersonTrip; overlapsYou: boolean };

export function friendsAtPlace(placeId: string, season: Season, friends: Person[], trip?: Trip): FriendHit[] {
  const hits: FriendHit[] = [];
  for (const person of friends) {
    for (const friendTrip of person.trips) {
      if (friendTrip.placeId !== placeId || friendTrip.season !== season) continue;
      const overlapsYou = Boolean(
        trip && trip.season === season && daysOverlap(trip.start, trip.end, friendTrip.start, friendTrip.end) > 0,
      );
      hits.push({ person, trip: friendTrip, overlapsYou });
    }
  }
  return hits;
}

export function heatColor(count: number, max: number, dark: boolean): number {
  const capped = Math.max(40, Math.min(180, max));
  const t = Math.sqrt(Math.min(1, count / capped));
  const low = dark ? 0x1a3f73 : 0xd5e5fb;
  const high = dark ? 0xc5ddff : 0x0b3d91;
  return mix(low, high, t);
}

/**
 * Map shade for an overall rating. Five distinct steps (1 pale, 5 deep navy) so a 4 and a 5
 * look clearly different; values in between blend between the two nearest steps.
 */
const RATING_STEPS_LIGHT = [0xe4eefc, 0xb6d0f4, 0x78a5e2, 0x3a70c4, 0x0d3a8a];
const RATING_STEPS_DARK = [0x1f2f45, 0x284d80, 0x3a6fb8, 0x6d9be0, 0xb3d1ff];
export function ratingColor(score: number, dark: boolean): number {
  const steps = dark ? RATING_STEPS_DARK : RATING_STEPS_LIGHT;
  const x = Math.max(0, Math.min(4, score - 1));
  const i = Math.min(3, Math.floor(x));
  return mix(steps[i], steps[i + 1], x - i);
}

function mix(a: number, b: number, t: number): number {
  const channel = (shift: number) => {
    const from = (a >> shift) & 255;
    const to = (b >> shift) & 255;
    return Math.round(from + (to - from) * t);
  };
  return (channel(16) << 16) + (channel(8) << 8) + channel(0);
}

export type ScoreKey = "overall" | "affordability" | "safety" | "beauty";

/** Average of real student reviews for a place, or null if nobody has reviewed it yet. */
/**
 * A country's rating averages every review of the country itself and of its
 * cities and destinations. A city's rating uses only that city's reviews.
 */
export function scoreOf(placeId: string, key: ScoreKey): number | null {
  if (placeId in FIXED_SCORES) return FIXED_SCORES[placeId];
  return summaryAvg("place", [placeId, ...(CHILDREN.get(placeId) ?? [])], key);
}

/** How many ratings feed a place's score (a country counts its cities' ratings too). */
export function ratingCount(placeId: string): number {
  return summaryCount("place", [placeId, ...(CHILDREN.get(placeId) ?? [])]);
}

export function sortScore(placeId: string, sort: ScoreKey): number {
  return scoreOf(placeId, sort) ?? -1;
}
