// Your TripTable account: profile, friends and friend requests, all from Supabase.
// Signed out you are a guest: nothing loads and nothing is shared.

import { useSyncExternalStore } from "react";
import { supabase } from "../reviews/backend";
import { reviews } from "../reviews/store";
import type { Person, PersonTrip, Season } from "../types";

export type Profile = { id: string; email: string; full_name: string; avatar_url: string | null; college: string; class_year: string };
export type Request = { id: string; other: Profile; incoming: boolean };

type Snapshot = {
  me: Profile | null;
  friends: Person[];
  requests: Request[];
  loading: boolean;
  version: number;
};

let snap: Snapshot = { me: null, friends: [], requests: [], loading: false, version: 0 };
const listeners = new Set<() => void>();
function emit(patch: Partial<Snapshot>) {
  snap = { ...snap, ...patch, version: snap.version + 1 };
  listeners.forEach((fn) => fn());
}

let currentUser: string | null = null;

export function displayName(p: Pick<Profile, "full_name" | "email"> | null | undefined): string {
  if (!p) return "Guest";
  if (p.full_name.trim()) return p.full_name.trim();
  const local = p.email.split("@")[0] ?? "";
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

function toPerson(p: Profile, trips: PersonTrip[]): Person {
  return { netid: p.id, name: displayName(p), college: p.college || "Yale", year: p.class_year || "", trips };
}

async function load() {
  if (!supabase || !currentUser) {
    emit({ me: null, friends: [], requests: [], loading: false });
    return;
  }
  emit({ loading: true });
  const uid = currentUser;
  const [{ data: meRow }, { data: links }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
    supabase.from("friendships").select("id,requester,addressee,status"),
  ]);
  const rows = (links ?? []) as { id: string; requester: string; addressee: string; status: string }[];
  const otherIds = [...new Set(rows.map((r) => (r.requester === uid ? r.addressee : r.requester)))];
  const { data: others } = otherIds.length ? await supabase.from("profiles").select("*").in("id", otherIds) : { data: [] };
  const byId = new Map(((others ?? []) as Profile[]).map((p) => [p.id, p]));

  const acceptedIds = rows.filter((r) => r.status === "accepted").map((r) => (r.requester === uid ? r.addressee : r.requester));
  const { data: tripRows } = acceptedIds.length
    ? await supabase.from("trips").select("user_id,place_id,season,start_date,end_date").in("user_id", acceptedIds)
    : { data: [] };
  const tripsBy = new Map<string, PersonTrip[]>();
  for (const t of (tripRows ?? []) as { user_id: string; place_id: string; season: Season; start_date: string; end_date: string }[]) {
    tripsBy.set(t.user_id, [...(tripsBy.get(t.user_id) ?? []), { placeId: t.place_id, season: t.season, start: t.start_date, end: t.end_date }]);
  }

  const friends = acceptedIds.map((id) => byId.get(id)).filter((p): p is Profile => Boolean(p)).map((p) => toPerson(p, tripsBy.get(p.id) ?? []));
  const requests: Request[] = rows
    .filter((r) => r.status === "pending")
    .map((r) => {
      const otherId = r.requester === uid ? r.addressee : r.requester;
      const other = byId.get(otherId);
      return other ? { id: r.id, other, incoming: r.addressee === uid } : null;
    })
    .filter((r): r is Request => r !== null);

  let me = (meRow as Profile | null) ?? null;
  if (!me) {
    // Profiles are created by a database trigger on sign-up; this covers accounts made before it existed.
    const session = reviews.get().session;
    const { data } = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle();
    me = (data as Profile | null) ?? (session ? { id: uid, email: session.email, full_name: "", avatar_url: null, college: "", class_year: "" } : null);
  }
  emit({ me, friends, requests, loading: false });
}

// Follow sign-in state from the review store (it owns the Supabase session).
reviews.subscribe(() => {
  const s = reviews.get();
  const uid = s.shared && s.session && s.session.email ? s.session.userId : null;
  if (uid !== currentUser) {
    currentUser = uid;
    void load();
  }
});

let poll: number | null = null;
export const account = {
  subscribe(fn: () => void) {
    listeners.add(fn);
    if (poll === null) {
      poll = window.setInterval(() => {
        if (currentUser && document.visibilityState === "visible") void load();
      }, 60_000);
    }
    return () => {
      listeners.delete(fn);
    };
  },
  get: () => snap,
  reload: () => load(),

  async updateProfile(patch: Partial<Pick<Profile, "full_name" | "college" | "class_year">>): Promise<string | null> {
    if (!supabase || !currentUser) return "Sign in first.";
    const { error } = await supabase.from("profiles").update(patch).eq("id", currentUser);
    if (error) return error.message;
    await load();
    return null;
  },

  async find(q: string): Promise<Profile | null> {
    if (!supabase || !currentUser) return null;
    const { data } = await supabase.rpc("find_student", { q });
    const row = Array.isArray(data) ? (data[0] as Partial<Profile> | undefined) : undefined;
    return row && row.id ? { id: row.id, email: row.email ?? "", full_name: row.full_name ?? "", avatar_url: null, college: row.college ?? "", class_year: row.class_year ?? "" } : null;
  },

  async request(otherId: string): Promise<string | null> {
    if (!supabase || !currentUser) return "Sign in first.";
    const { error } = await supabase.from("friendships").insert({ requester: currentUser, addressee: otherId });
    if (error) return error.code === "23505" ? "You already have a request with this person." : error.message;
    await load();
    return null;
  },

  async accept(requestId: string) {
    if (!supabase) return;
    await supabase.from("friendships").update({ status: "accepted" }).eq("id", requestId);
    await load();
  },

  async remove(otherId: string) {
    if (!supabase || !currentUser) return;
    await supabase
      .from("friendships")
      .delete()
      .or(`and(requester.eq.${currentUser},addressee.eq.${otherId}),and(requester.eq.${otherId},addressee.eq.${currentUser})`);
    await load();
  },

  async removeRequest(requestId: string) {
    if (!supabase) return;
    await supabase.from("friendships").delete().eq("id", requestId);
    await load();
  },
};

export function useAccount(): Snapshot {
  return useSyncExternalStore(account.subscribe, account.get, account.get);
}

/** The person using the site: a signed-in profile, or a guest. */
export function useMe() {
  const { me } = useAccount();
  return {
    signedIn: Boolean(me),
    id: me?.id ?? "me",
    name: me ? displayName(me) : "Guest",
    email: me?.email ?? "",
    college: me?.college ?? "",
    classYear: me?.class_year ?? "",
    avatar: me?.avatar_url ?? null,
  };
}

export function initialsOf(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}
