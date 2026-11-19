// Google Calendar sync. "Connect Google Calendar" asks Google once for permission to manage events;
// from then on the gcal edge function adds, updates and removes an all-day event for each trip
// whenever trips change (on any device).

import { useSyncExternalStore } from "react";
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabase } from "../reviews/backend";
import { reviews } from "../reviews/store";
import { lookupPlace } from "../data";
import { formatRange, seasonLabel } from "../logic";
import { leaveByLine } from "../trip/TripDetail";
import type { Trip } from "../types";

type Snap = { connected: boolean | null; busy: boolean; error: string | null };
let snap: Snap = { connected: null, busy: false, error: null };
const listeners = new Set<() => void>();
function set(patch: Partial<Snap>) {
  const next = { ...snap, ...patch };
  if (next.connected === snap.connected && next.busy === snap.busy && next.error === snap.error) return;
  snap = next;
  listeners.forEach((fn) => fn());
}

const FLAG = "triptable-gcal-connect";
const SCOPE = "https://www.googleapis.com/auth/calendar.events";

async function call(body: Record<string, unknown>): Promise<{ connected?: boolean; error?: string } | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  const jwt = data.session?.access_token;
  if (!jwt) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/gcal`, {
      method: "POST",
      headers: { Authorization: `Bearer ${jwt}`, apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return (await res.json()) as { connected?: boolean; error?: string };
  } catch {
    return null;
  }
}

let lastSent = "";
let pending: Trip[] | null = null;
let timer: number | null = null;

function eventsFor(trips: Trip[]) {
  const base = `${location.origin}${location.pathname.replace(/[^/]*$/, "")}`;
  return trips.map((t) => {
    const place = lookupPlace(t.placeId);
    const lines = [`${formatRange(t.start, t.end)} · ${seasonLabel(t.season)}`];
    const leave = leaveByLine(t);
    if (leave) lines.push(leave);
    if (t.note.trim()) lines.push("", t.note.trim());
    lines.push("", `Open in TripTable: ${base}itinerary?trip=${encodeURIComponent(t.id)}`);
    return { tripId: t.id, title: `✈ Trip: ${place?.name ?? "TripTable trip"}`, description: lines.join("\n") };
  });
}

async function flush() {
  timer = null;
  const trips = pending;
  pending = null;
  if (!trips || !snap.connected) return;
  const events = eventsFor(trips);
  const sig = JSON.stringify(events);
  if (sig === lastSent) return;
  lastSent = sig;
  const res = await call({ action: "sync", events });
  if (res && res.connected === false) set({ connected: false });
}

let checkedFor: string | null = null;
async function onSession() {
  const s = reviews.get();
  const uid = s.shared && s.session?.email ? s.session.userId : null;
  if (!uid || !supabase) {
    checkedFor = null;
    set({ connected: null });
    return;
  }
  // Back from the Google consent screen: hand the calendar permission to the server.
  let wanted = false;
  try {
    wanted = sessionStorage.getItem(FLAG) === "1";
  } catch {
    /* storage blocked */
  }
  if (wanted) {
    const { data } = await supabase.auth.getSession();
    const refresh = data.session?.provider_refresh_token;
    if (refresh) {
      try {
        sessionStorage.removeItem(FLAG);
      } catch {
        /* ignore */
      }
      set({ busy: true, error: null });
      const res = await call({ action: "connect", refreshToken: refresh });
      set({ busy: false, connected: Boolean(res?.connected), error: res?.connected ? null : (res?.error ?? "Couldn't connect Google Calendar. Try again.") });
      checkedFor = uid;
      lastSent = "";
      if (pending) void flush();
      return;
    }
  }
  if (checkedFor === uid) return;
  checkedFor = uid;
  const res = await call({ action: "status" });
  set({ connected: Boolean(res?.connected) });
  if (pending) void flush();
}
reviews.subscribe(() => void onSession());

export const gcal = {
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
  get: () => snap,

  /** Called after trips are saved to the database: pushes them to Google Calendar shortly after. */
  queue(trips: Trip[]) {
    pending = trips;
    if (snap.connected !== true) return;
    if (timer) window.clearTimeout(timer);
    timer = window.setTimeout(() => void flush(), 1500);
  },

  /** Opens Google's consent screen for calendar access; we come back to this same page. */
  async connect() {
    if (!supabase) return;
    try {
      sessionStorage.setItem(FLAG, "1");
    } catch {
      /* storage blocked */
    }
    const email = reviews.get().session?.email ?? "";
    set({ busy: true, error: null });
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: location.origin + location.pathname + location.search,
        scopes: SCOPE,
        queryParams: { access_type: "offline", prompt: "consent", hd: "yale.edu", ...(email ? { login_hint: email } : {}) },
      },
    });
    if (error) set({ busy: false, error: "Couldn't open Google. Try again." });
  },

  async disconnect() {
    set({ busy: true });
    await call({ action: "disconnect" });
    lastSent = "";
    set({ busy: false, connected: false });
  },
};

export function useGcal(): Snap {
  return useSyncExternalStore(gcal.subscribe, gcal.get, gcal.get);
}
