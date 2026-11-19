// Yale College recesses, from the official "Yale College Calendar with Pertinent Deadlines"
// (catalog.yale.edu/ycps/calendar, 2026–2027, checked Nov 2026). Trip dates default to these.
// "leave" is the first full day off (recesses begin after the last academic obligation), and
// "back" is the last day before classes resume or residences reopen.
// Add the 2027–2028 entries when Yale publishes that calendar; until then later breaks are estimated.

import type { Season } from "./types";

export type Recess = {
  id: "oct" | "nov" | "win" | "spr" | "sum";
  season: Season;
  /** Year the season is counted in (winter counts by the December it starts in). */
  year: number;
  label: string;
  leave: string;
  back: string;
  /** What the Yale calendar says, for the hint under the date picker. */
  note: string;
};

export const YALE_RECESSES: Recess[] = [
  { id: "oct", season: "fall", year: 2026, label: "October recess", leave: "2026-10-21", back: "2026-10-25", note: "Recess begins Tue Oct 20 after your last class; classes resume Mon Oct 26." },
  { id: "nov", season: "fall", year: 2026, label: "November recess", leave: "2026-11-21", back: "2026-11-29", note: "Recess begins Fri Nov 20 after your last class; classes resume Mon Nov 30." },
  { id: "win", season: "winter", year: 2026, label: "Winter recess", leave: "2026-12-23", back: "2027-01-18", note: "Finals end Tue Dec 22; residences close Wed Dec 23 at noon and reopen Fri Jan 15; classes begin Tue Jan 19." },
  { id: "spr", season: "spring", year: 2027, label: "Spring recess", leave: "2027-03-06", back: "2027-03-21", note: "Recess begins Fri Mar 5 after your last class; classes resume Mon Mar 22." },
  { id: "sum", season: "summer", year: 2027, label: "Summer", leave: "2027-05-13", back: "2027-08-28", note: "Finals end Wed May 12; residences close for non-seniors Thu May 13. Fall 2027 dates aren't published yet." },
];

/** Long recesses default to a trip of this many nights from the start, not the whole break. */
const LONG_TRIP_NIGHTS = 10;

function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** The official recess for a season and year, if Yale has published it. Fall uses October recess. */
export function recessFor(season: Season, year: number): Recess | undefined {
  return YALE_RECESSES.find((r) => r.season === season && r.year === year && r.id !== "nov");
}

/** Default trip dates for a recess: the whole break, or the first ten nights of winter and summer. */
export function recessWindow(r: Recess): [string, string] {
  if (r.id === "win" || r.id === "sum") {
    const end = addDaysISO(r.leave, LONG_TRIP_NIGHTS);
    return [r.leave, end < r.back ? end : r.back];
  }
  return [r.leave, r.back];
}
