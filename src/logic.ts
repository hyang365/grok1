import { placeScores, reviews } from "./reviews/store";
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

export function visitCount(place: Place, season: Season, year = CURRENT_YEAR): number {
  return place.history[season].find((row) => row.year === year)?.count ?? 0;
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

const BLOCKED_ISOS = new Set(["AF", "BY", "BF", "MM", "CF", "HT", "IR", "IQ", "LY", "ML", "KP", "RU", "SO", "SS", "SD", "SY", "UA", "VE", "YE", "LB"]);

const REGIONAL: Record<string, string> = {
  MX: "A Level 4 advisory covers specific states, including Colima, Guerrero, Michoacán, Sinaloa, Tamaulipas, and Zacatecas. Yale will not sponsor travel to those states. Mexico City and Oaxaca are outside that list.",
  EG: "A Level 4 advisory covers the Sinai Peninsula. Yale will not sponsor travel there. The rest of Egypt is not under a countrywide ban.",
  CO: "A Level 4 advisory covers specific regions rather than the whole country. Yale will not sponsor travel into those regions.",
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
  KR: ["Asia"],
  TH: ["Asia"],
  VN: ["Asia"],
  ID: ["Asia"],
  AU: ["Oceania"],
};

export function continentsOf(place: Place): string[] {
  return ISO_CONTINENT[place.iso] ?? ["North America"];
}

function featureMatch(place: Place, id: string): boolean {
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
      title: "Yale will not sponsor this",
      detail: `The State Department Level 4 “Do Not Travel” advisory means Yale College will not fund, credit, or sponsor undergraduate travel to this country. No exceptions. ${WAIVER}`,
    };
  }
  if (iso === "CU") {
    return {
      level: "regional",
      title: "Cuba needs extra Yale review",
      detail: `Academic work in Cuba has separate Office of the General Counsel rules on top of the travel policy. ${WAIVER}`,
    };
  }
  if (REGIONAL[iso]) {
    return { level: "regional", title: "Yale restricts part of this country", detail: `${REGIONAL[iso]} ${WAIVER}` };
  }
  return {
    level: "ok",
    title: "Check advisories, then the waiver",
    detail: `${WAIVER} A later Level 4 advisory, or an International SOS rating of High or Extreme, would end Yale sponsorship.`,
  };
}

export function passesFilters(place: Place, count: number, filters: Filters): boolean {
  if (count <= 0) return false;
  if (count < filters.minYalies) return false;
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
    filters.scope === "all"
  );
}

export type Overlap = { count: number; label: string; matched: boolean };

export function anonymousOverlap(place: Place, season: Season, trip?: Trip): Overlap {
  const cohorts = place.cohorts.filter((cohort) => cohort.season === season);
  if (cohorts.length === 0) return { count: 0, label: "No week logged", matched: false };
  const peak = cohorts.reduce((best, cohort) => (cohort.count > best.count ? cohort : best));
  if (!trip || trip.placeId !== place.id || trip.season !== season) {
    return { count: peak.count, label: formatRange(peak.start, peak.end), matched: false };
  }
  let count = 0;
  let label = "";
  let best = -1;
  for (const cohort of cohorts) {
    const span = daysInclusive(cohort.start, cohort.end);
    const overlap = daysOverlap(trip.start, trip.end, cohort.start, cohort.end);
    if (overlap <= 0 || span <= 0) continue;
    count += Math.max(1, Math.round(cohort.count * (overlap / span)));
    if (cohort.count > best) {
      best = cohort.count;
      label = formatRange(cohort.start, cohort.end);
    }
  }
  if (count === 0) return { count: 0, label: "No overlap with logged weeks", matched: true };
  return { count, label, matched: true };
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
export function scoreOf(placeId: string, key: ScoreKey): number | null {
  return placeScores(reviews.get().reviews, placeId)?.[key] ?? null;
}

export function sortScore(placeId: string, sort: ScoreKey): number {
  return scoreOf(placeId, sort) ?? -1;
}
