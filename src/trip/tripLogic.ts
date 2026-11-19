// Trip details: flights, "leave by" times, invite links and calendar export.

import { GATEWAYS, clock, duration, type Gateway } from "../flights/engine";
import { lookupPlace } from "../data";
import { formatRange, parseISODate } from "../logic";
import type { Season, Trip, TripFlight } from "../types";

export const AIRLINES: { name: string; code: string }[] = [
  { name: "American", code: "AA" },
  { name: "Delta", code: "DL" },
  { name: "United", code: "UA" },
  { name: "JetBlue", code: "B6" },
  { name: "Southwest", code: "WN" },
  { name: "Alaska", code: "AS" },
  { name: "Spirit", code: "NK" },
  { name: "Frontier", code: "F9" },
  { name: "Breeze", code: "MX" },
  { name: "Avelo", code: "XP" },
  { name: "Allegiant", code: "G4" },
  { name: "Sun Country", code: "SY" },
  { name: "Air Canada", code: "AC" },
  { name: "Aer Lingus", code: "EI" },
  { name: "Aeroméxico", code: "AM" },
  { name: "Air France", code: "AF" },
  { name: "ANA", code: "NH" },
  { name: "Avianca", code: "AV" },
  { name: "British Airways", code: "BA" },
  { name: "Cathay Pacific", code: "CX" },
  { name: "Copa", code: "CM" },
  { name: "Emirates", code: "EK" },
  { name: "Iberia", code: "IB" },
  { name: "Icelandair", code: "FI" },
  { name: "ITA Airways", code: "AZ" },
  { name: "Japan Airlines", code: "JL" },
  { name: "KLM", code: "KL" },
  { name: "Korean Air", code: "KE" },
  { name: "LATAM", code: "LA" },
  { name: "Lufthansa", code: "LH" },
  { name: "Qatar Airways", code: "QR" },
  { name: "Swiss", code: "LX" },
  { name: "TAP Air Portugal", code: "TP" },
  { name: "Turkish Airlines", code: "TK" },
  { name: "Virgin Atlantic", code: "VS" },
  { name: "Volaris", code: "Y4" },
  { name: "Other", code: "" },
];

export function airlineCode(name: string): string {
  return AIRLINES.find((a) => a.name === name)?.code ?? "";
}

/** "B6 1503" when we know the airline code and a number was entered. */
export function flightLabel(f: TripFlight): string {
  const code = airlineCode(f.airline);
  return f.number ? `${code ? `${code} ` : `${f.airline} `}${f.number}` : f.airline;
}

export function gatewayOf(code: string): Gateway | undefined {
  return GATEWAYS.find((g) => g.code === code);
}

export function isDomestic(trip: Trip): boolean {
  const iso = lookupPlace(trip.placeId)?.iso;
  return iso === "US" || iso === "PR";
}

function minutesOf(hhmm: string): number | null {
  const m = hhmm.match(/^(\d{1,2}):(\d{2})$/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/** A date + minutes-from-midnight, shifted by `delta` minutes, as { date, mins }. */
function shift(date: string, mins: number, delta: number): { date: string; mins: number } {
  const t = parseISODate(date) + (mins + delta) * 60_000;
  const d = new Date(t);
  return { date: d.toISOString().slice(0, 10), mins: d.getUTCHours() * 60 + d.getUTCMinutes() };
}

export type LeavePlan = {
  label: string;
  leaveDate: string;
  leaveMins: number;
  rideMins: number;
  cost: number;
  splittable: boolean;
  tags: string[];
};

/**
 * When to leave Old Campus for an outbound flight, for each way of getting to that airport.
 * Arrive at the airport `buffer` minutes before departure (more for international), plus 10 minutes to get going.
 */
export function leavePlans(f: TripFlight, international: boolean): { buffer: number; plans: LeavePlan[] } | null {
  const gw = gatewayOf(f.airport);
  const dep = minutesOf(f.time);
  if (!gw || dep === null || !f.date) return null;
  const buffer = international ? Math.min(180, gw.security + 60) : gw.security;
  const plans = gw.ground.map((g) => {
    const at = shift(f.date, dep, -(buffer + g.mins + 10));
    return { label: g.label, leaveDate: at.date, leaveMins: at.mins, rideMins: g.mins, cost: g.cost, splittable: g.splittable, tags: [] as string[] };
  });
  if (!plans.length) return null;
  const latest = plans.reduce((a, b) => (b.leaveDate + clock2(b.leaveMins) > a.leaveDate + clock2(a.leaveMins) ? b : a));
  const cheapest = plans.reduce((a, b) => (b.cost < a.cost ? b : a));
  latest.tags.push("Leave latest");
  cheapest.tags.push("Cheapest");
  plans.sort((a, b) => a.cost - b.cost);
  return { buffer, plans };
}
const clock2 = (m: number) => String(m).padStart(4, "0");

/** Getting back to campus after a return flight lands at a nearby airport. */
export function homePlans(f: TripFlight, international: boolean): { plans: { label: string; homeDate: string; homeMins: number; cost: number; rideMins: number }[] } | null {
  const gw = gatewayOf(f.airport);
  const arr = minutesOf(f.time);
  if (!gw || arr === null || !f.date) return null;
  const exit = international ? 60 : 25; // deplane, bags, customs
  return {
    plans: gw.ground
      .map((g) => {
        const at = shift(f.date, arr, exit + g.mins);
        return { label: g.label.replace(/ to .*$/, "").replace(/^Uber$/, "Uber"), homeDate: at.date, homeMins: at.mins, cost: g.cost, rideMins: g.mins };
      })
      .sort((a, b) => a.cost - b.cost),
  };
}

export function dayLabel(iso: string): string {
  return new Date(parseISODate(iso)).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
}

export { clock, duration };

// ---------- checklist ----------
export type CheckItem = { id: string; label: string; hint?: string };
export function checklistFor(trip: Trip): CheckItem[] {
  const intl = !isDomestic(trip);
  return [
    { id: "flight", label: "Flights or tickets booked" },
    { id: "stay", label: "Place to stay booked" },
    ...(intl ? [{ id: "passport", label: "Passport valid 6+ months past your return", hint: "Many countries require it" }] : []),
    ...(intl ? [{ id: "entry", label: "Visa or entry rules checked", hint: "travel.state.gov country page" }] : []),
    { id: "registry", label: "Trip registered with Yale", hint: "Required for Yale-funded travel, recommended otherwise" },
    { id: "insurance", label: "Health coverage abroad checked", hint: intl ? "Yale Health covers emergencies abroad; check details" : "Bring your insurance card" },
    { id: "share", label: "Plans shared with family" },
  ];
}

// ---------- invite links ----------
export type Invite = {
  v: 1;
  p: string; // placeId
  s: Season;
  a: string; // start
  b: string; // end
  n: string; // inviter's name
  i: string; // inviter's account id (for a friend request), may be ""
  f: TripFlight[];
};

function b64url(s: string): string {
  return btoa(unescape(encodeURIComponent(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function unb64url(s: string): string {
  return decodeURIComponent(escape(atob(s.replace(/-/g, "+").replace(/_/g, "/"))));
}

export function inviteLink(trip: Trip, name: string, id: string): string {
  const inv: Invite = { v: 1, p: trip.placeId, s: trip.season, a: trip.start, b: trip.end, n: name.slice(0, 60), i: id, f: (trip.flights ?? []).slice(0, 6) };
  return `${location.origin}${location.pathname}?join=${b64url(JSON.stringify(inv))}`;
}

const SEASONS = new Set(["spring", "summer", "fall", "winter", "weekend"]);
export function readInvite(raw: string | null): Invite | null {
  if (!raw || raw.length > 4000) return null;
  try {
    const inv = JSON.parse(unb64url(raw)) as Partial<Invite>;
    if (inv.v !== 1 || typeof inv.p !== "string" || !lookupPlace(inv.p)) return null;
    if (!SEASONS.has(String(inv.s)) || !/^\d{4}-\d{2}-\d{2}$/.test(String(inv.a)) || !/^\d{4}-\d{2}-\d{2}$/.test(String(inv.b))) return null;
    return {
      v: 1,
      p: inv.p,
      s: inv.s as Season,
      a: String(inv.a),
      b: String(inv.b),
      n: String(inv.n ?? "A friend").slice(0, 60),
      i: /^[0-9a-f-]{36}$/.test(String(inv.i ?? "")) ? String(inv.i) : "",
      f: Array.isArray(inv.f) ? inv.f.map(sanitizeFlight).filter((x): x is TripFlight => x !== null).slice(0, 6) : [],
    };
  } catch {
    return null;
  }
}

export function sanitizeFlight(value: unknown): TripFlight | null {
  if (!value || typeof value !== "object") return null;
  const f = value as Partial<TripFlight>;
  if ((f.dir !== "out" && f.dir !== "back") || typeof f.airport !== "string" || typeof f.date !== "string") return null;
  return {
    id: String(f.id ?? `f-${Math.random().toString(36).slice(2, 9)}`).slice(0, 40),
    dir: f.dir,
    airport: f.airport.slice(0, 40),
    airline: String(f.airline ?? "").slice(0, 40),
    number: String(f.number ?? "").replace(/[^0-9A-Za-z]/g, "").slice(0, 6),
    date: /^\d{4}-\d{2}-\d{2}$/.test(f.date) ? f.date : "",
    time: /^\d{1,2}:\d{2}$/.test(String(f.time ?? "")) ? String(f.time) : "",
  };
}

// ---------- calendar export ----------
function icsStamp(date: string, mins: number): string {
  return `${date.replace(/-/g, "")}T${String(Math.floor(mins / 60)).padStart(2, "0")}${String(mins % 60).padStart(2, "0")}00`;
}
function icsText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export function tripCalendar(trip: Trip): string {
  const place = lookupPlace(trip.placeId);
  const name = place?.name ?? "Trip";
  const intl = !isDomestic(trip);
  const ev: string[] = [];
  const end = new Date(parseISODate(trip.end) + 86_400_000).toISOString().slice(0, 10).replace(/-/g, "");
  ev.push(
    ["BEGIN:VEVENT", `UID:${trip.id}@triptable`, `DTSTAMP:${icsStamp(new Date().toISOString().slice(0, 10), 0)}Z`, `DTSTART;VALUE=DATE:${trip.start.replace(/-/g, "")}`, `DTEND;VALUE=DATE:${end}`, `SUMMARY:${icsText(`Trip: ${name}`)}`, `DESCRIPTION:${icsText(trip.note || formatRange(trip.start, trip.end))}`, "END:VEVENT"].join("\r\n"),
  );
  for (const f of trip.flights ?? []) {
    const t = minutesOf(f.time);
    if (t === null || !f.date) continue;
    if (f.dir === "out") {
      ev.push(
        ["BEGIN:VEVENT", `UID:${f.id}@triptable`, `DTSTAMP:${icsStamp(new Date().toISOString().slice(0, 10), 0)}Z`, `DTSTART:${icsStamp(f.date, t)}`, `DTEND:${icsStamp(f.date, t + 60)}`, `SUMMARY:${icsText(`✈ ${flightLabel(f)} from ${f.airport}`)}`, "END:VEVENT"].join("\r\n"),
      );
      const lp = leavePlans(f, intl);
      if (lp) {
        const pick = lp.plans.find((p) => p.tags.includes("Cheapest")) ?? lp.plans[0];
        ev.push(
          [
            "BEGIN:VEVENT",
            `UID:${f.id}-leave@triptable`,
            `DTSTAMP:${icsStamp(new Date().toISOString().slice(0, 10), 0)}Z`,
            `DTSTART:${icsStamp(pick.leaveDate, pick.leaveMins)}`,
            `DTEND:${icsStamp(pick.leaveDate, Math.min(1439, pick.leaveMins + pick.rideMins))}`,
            `SUMMARY:${icsText(`Leave campus for ${f.airport} (${pick.label})`)}`,
            `DESCRIPTION:${icsText(`Flight ${flightLabel(f)} departs ${clock(t)}. Other options: ${lp.plans.map((p) => `${p.label} leave by ${clock(p.leaveMins)}`).join("; ")}`)}`,
            "BEGIN:VALARM",
            "TRIGGER:-PT60M",
            "ACTION:DISPLAY",
            `DESCRIPTION:${icsText(`Leave for ${f.airport} in 1 hour`)}`,
            "END:VALARM",
            "END:VEVENT",
          ].join("\r\n"),
        );
      }
    } else {
      ev.push(
        ["BEGIN:VEVENT", `UID:${f.id}@triptable`, `DTSTAMP:${icsStamp(new Date().toISOString().slice(0, 10), 0)}Z`, `DTSTART:${icsStamp(f.date, t)}`, `DTEND:${icsStamp(f.date, Math.min(1439, t + 30))}`, `SUMMARY:${icsText(`✈ ${flightLabel(f)} lands at ${f.airport}`)}`, "END:VEVENT"].join("\r\n"),
      );
    }
  }
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//TripTable//EN", "CALSCALE:GREGORIAN", ...ev, "END:VCALENDAR", ""].join("\r\n");
}

export function downloadCalendar(trip: Trip) {
  const place = lookupPlace(trip.placeId);
  const blob = new Blob([tripCalendar(trip)], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(place?.name ?? "trip").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-trip.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function daysUntil(iso: string): number {
  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((parseISODate(iso) - today) / 86_400_000);
}
