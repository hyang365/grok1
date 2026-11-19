// Supabase Edge Function: keeps a student's TripTable trips in their Google Calendar.
// Deploy with JWT verification on. Needs the edge function secret GOOGLE_CLIENT_SECRET
// (from the same Google OAuth client Supabase uses for sign-in).
//
//   POST { action: "status" }                      -> { connected }
//   POST { action: "connect", refreshToken }       -> { connected }   (after the calendar consent screen)
//   POST { action: "sync", events: [...] }         -> { connected, created, updated, removed }
//   POST { action: "disconnect" }                  -> { connected: false }
//
// Trip dates always come from the database (the caller's own trips); the browser only supplies
// each event's title and description. Refresh tokens are stored in private.gcal_links.

import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const ORIGINS = new Set(["https://triptable.io", "https://www.triptable.io", "https://hyang365.github.io", "http://127.0.0.1:5173", "http://127.0.0.1:4173"]);
const CAL = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
// The sign-in OAuth client's ID is public (it appears in every Google sign-in URL); the secret is not.
const GOOGLE_CLIENT_ID = "1092321030698-7m3d0lrusvk5ioglm0omhrbr5lsr36f2.apps.googleusercontent.com";

function cors(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin": ORIGINS.has(origin) ? origin : "https://triptable.io",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

type Link = { refresh_token: string; events: Record<string, { id: string; sig: string }> };
type Incoming = { tripId: string; title: string; description: string };
type TripRow = { id: string; start_date: string; end_date: string };

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

async function accessToken(refresh: string): Promise<string | null> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: Deno.env.get("GOOGLE_CLIENT_ID") || GOOGLE_CLIENT_ID,
      client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET") ?? "",
      refresh_token: refresh,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { access_token?: string };
  return body.access_token ?? null;
}

function nextDay(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}

const clean = (s: unknown, max: number) => (typeof s === "string" ? s.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").slice(0, max) : "");

async function sha(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].slice(0, 12).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  const headers = { ...cors(req), "Content-Type": "application/json" };
  const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  if (req.method !== "POST") return reply({ error: "POST only" }, 405);

  const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: who } = await admin.auth.getUser(jwt);
  const user = who?.user;
  if (!user?.email || !/@yale\.edu$/i.test(user.email)) return reply({ error: "Sign in with your Yale account." }, 401);

  let body: { action?: string; refreshToken?: string; events?: Incoming[] };
  try {
    body = await req.json();
  } catch {
    return reply({ error: "Bad request" }, 400);
  }

  const { data: rows } = await admin.rpc("gcal_get", { p_user: user.id });
  const link = (Array.isArray(rows) ? rows[0] : null) as Link | null;

  if (body.action === "status") return reply({ connected: Boolean(link) });

  if (body.action === "connect") {
    const token = clean(body.refreshToken, 2048);
    if (!token || !(await accessToken(token))) return reply({ connected: Boolean(link), error: "Google didn't accept the calendar permission. Try again." }, 400);
    await admin.rpc("gcal_save", { p_user: user.id, p_token: token });
    return reply({ connected: true });
  }

  if (body.action === "disconnect") {
    if (link) {
      await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(link.refresh_token)}`, { method: "POST" }).catch(() => {});
      await admin.rpc("gcal_forget", { p_user: user.id });
    }
    return reply({ connected: false });
  }

  if (body.action !== "sync") return reply({ error: "Unknown action" }, 400);
  if (!link) return reply({ connected: false });

  const token = await accessToken(link.refresh_token);
  if (!token) {
    // Revoked in Google account settings, or expired: forget it so the site offers to reconnect.
    await admin.rpc("gcal_forget", { p_user: user.id });
    return reply({ connected: false });
  }
  const auth = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const { data: tripRows, error: tripError } = await admin.from("trips").select("id,start_date,end_date").eq("user_id", user.id).limit(60);
  if (tripError) return reply({ connected: true, error: "Couldn't read trips. Try again." }, 503);
  const trips = (tripRows ?? []) as TripRow[];
  const info = new Map((Array.isArray(body.events) ? body.events : []).slice(0, 60).map((e) => [clean(e.tripId, 200), e]));

  const events: Link["events"] = { ...(link.events ?? {}) };
  let created = 0;
  let updated = 0;
  let removed = 0;

  for (const t of trips) {
    const e = info.get(t.id);
    const event = {
      summary: clean(e?.title, 200) || "TripTable trip",
      description: clean(e?.description, 4000),
      start: { date: t.start_date },
      end: { date: nextDay(t.end_date) },
      transparency: "transparent",
      status: "confirmed",
      extendedProperties: { private: { triptable: t.id } },
    };
    const sig = await sha(JSON.stringify(event));
    const known = events[t.id];
    if (known?.sig === sig) continue;
    if (known?.id) {
      const res = await fetch(`${CAL}/${encodeURIComponent(known.id)}`, { method: "PUT", headers: auth, body: JSON.stringify(event) });
      if (res.ok) {
        events[t.id] = { id: known.id, sig };
        updated++;
        continue;
      }
      if (res.status !== 404 && res.status !== 410) continue; // try again next sync
    }
    const res = await fetch(CAL, { method: "POST", headers: auth, body: JSON.stringify(event) });
    if (res.ok) {
      const made = (await res.json()) as { id: string };
      events[t.id] = { id: made.id, sig };
      created++;
    }
  }

  // Trips you deleted: remove their events.
  const live = new Set(trips.map((t) => t.id));
  for (const [tripId, ev] of Object.entries(events)) {
    if (live.has(tripId)) continue;
    const res = await fetch(`${CAL}/${encodeURIComponent(ev.id)}`, { method: "DELETE", headers: auth });
    if (res.ok || res.status === 404 || res.status === 410) {
      delete events[tripId];
      removed++;
    }
  }

  if (created || updated || removed) await admin.rpc("gcal_set_events", { p_user: user.id, p_events: events });
  return reply({ connected: true, created, updated, removed });
});
