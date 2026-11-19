// In-app trip invites between friends: send from a trip, accept or decline from the Itinerary.

import { useSyncExternalStore } from "react";
import { supabase } from "../reviews/backend";
import { reviews } from "../reviews/store";
import { displayName, type Profile } from "../account/account";
import type { Season, Trip, TripFlight } from "../types";
import { sanitizeFlight } from "./tripLogic";

export type InviteRow = {
  id: string;
  from_user: string;
  to_user: string;
  place_id: string;
  season: Season;
  start_date: string;
  end_date: string;
  flights: unknown[];
  status: "pending" | "accepted" | "declined";
  created_at: string;
};
export type IncomingInvite = InviteRow & { fromName: string };

type Snap = { incoming: IncomingInvite[]; sent: InviteRow[]; version: number };
let snap: Snap = { incoming: [], sent: [], version: 0 };
const listeners = new Set<() => void>();
const emit = (patch: Partial<Snap>) => {
  snap = { ...snap, ...patch, version: snap.version + 1 };
  listeners.forEach((fn) => fn());
};

let me: string | null = null;

async function load() {
  if (!supabase || !me) {
    emit({ incoming: [], sent: [] });
    return;
  }
  const uid = me;
  const { data } = await supabase
    .from("trip_invites")
    .select("id,from_user,to_user,place_id,season,start_date,end_date,flights,status,created_at")
    .or(`to_user.eq.${uid},from_user.eq.${uid}`)
    .order("created_at", { ascending: false })
    .limit(200);
  const rows = (data as InviteRow[] | null) ?? [];
  const incomingRows = rows.filter((r) => r.to_user === uid && r.status === "pending");
  const senders = [...new Set(incomingRows.map((r) => r.from_user))];
  const { data: profs } = senders.length ? await supabase.from("profiles").select("id,email,full_name").in("id", senders) : { data: [] };
  const names = new Map(((profs as Pick<Profile, "id" | "email" | "full_name">[]) ?? []).map((p) => [p.id, displayName(p)]));
  emit({
    incoming: incomingRows.map((r) => ({ ...r, fromName: names.get(r.from_user) ?? "A friend" })),
    sent: rows.filter((r) => r.from_user === uid),
  });
}

reviews.subscribe(() => {
  const s = reviews.get();
  const uid = s.shared && s.session?.email ? s.session.userId : null;
  if (uid !== me) {
    me = uid;
    void load();
  }
});

let poll: number | null = null;
export const invites = {
  subscribe(fn: () => void) {
    listeners.add(fn);
    if (poll === null) {
      poll = window.setInterval(() => {
        if (me && document.visibilityState === "visible") void load();
      }, 45_000);
    }
    return () => {
      listeners.delete(fn);
    };
  },
  get: () => snap,
  reload: () => load(),

  /** Invite friends to a trip (re-sending updates dates and flights and puts it back to pending). */
  async send(trip: Trip, friendIds: string[]): Promise<number> {
    if (!supabase || !me || !friendIds.length) return 0;
    const rows = friendIds.map((to) => ({
      from_user: me!,
      to_user: to,
      place_id: trip.placeId,
      season: trip.season,
      start_date: trip.start,
      end_date: trip.end,
      flights: (trip.flights ?? []).slice(0, 6),
      status: "pending" as const,
    }));
    const { error } = await supabase.from("trip_invites").upsert(rows, { onConflict: "from_user,to_user,place_id,start_date" });
    await load();
    return error ? 0 : rows.length;
  },

  async cancel(id: string) {
    if (!supabase) return;
    await supabase.from("trip_invites").delete().eq("id", id);
    await load();
  },

  async answer(id: string, status: "accepted" | "declined") {
    if (!supabase) return;
    await supabase.from("trip_invites").update({ status }).eq("id", id);
    await load();
  },
};

export function useInvites(): Snap {
  return useSyncExternalStore(invites.subscribe, invites.get, invites.get);
}

/** The trip a recipient gets when they accept an invite. */
export function tripFromInvite(inv: InviteRow, existing?: Trip): Trip {
  const flights = (Array.isArray(inv.flights) ? inv.flights : []).map(sanitizeFlight).filter((f): f is TripFlight => f !== null);
  return {
    id: existing?.id ?? `trip-${inv.place_id}-${inv.start_date}`,
    placeId: inv.place_id,
    season: inv.season,
    start: inv.start_date,
    end: inv.end_date,
    note: existing?.note ?? "",
    friendNetids: Array.from(new Set([...(existing?.friendNetids ?? []), inv.from_user])),
    flights: existing?.flights?.length ? existing.flights : flights.map((f) => ({ ...f, id: `f-${Math.random().toString(36).slice(2, 9)}` })),
    checklist: existing?.checklist ?? [],
  };
}

/** Status of invites you sent for this trip, by friend id. */
export function sentStatus(trip: Trip): Map<string, InviteRow> {
  return new Map(snap.sent.filter((r) => r.place_id === trip.placeId && r.start_date === trip.start).map((r) => [r.to_user, r]));
}
