// Thumbs up / down on reviews. Totals are public and arrive live over the "review-votes" broadcast;
// who voted is never sent to the browser (only whether you did).

import { useSyncExternalStore } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "./backend";
import { reviews } from "./store";

export type Tally = { up: number; down: number; mine: -1 | 1 | null };

let tallies = new Map<string, Tally>();
let version = 0;
const listeners = new Set<() => void>();
function emit() {
  version += 1;
  listeners.forEach((fn) => fn());
}
function put(id: string, t: Tally) {
  const cur = tallies.get(id);
  if (cur && cur.up === t.up && cur.down === t.down && cur.mine === t.mine) return false;
  tallies = new Map(tallies).set(id, t);
  return true;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const wanted = new Set<string>();
let batch: number | null = null;

async function fetchTallies(ids: string[]) {
  if (!supabase || !ids.length) return;
  for (let i = 0; i < ids.length; i += 100) {
    const { data, error } = await supabase.rpc("review_votes_for", { p_ids: ids.slice(i, i + 100) });
    if (error || !Array.isArray(data)) return;
    let changed = false;
    for (const r of data as { review_id: string; up: number; down: number; mine: number | null }[]) {
      changed = put(r.review_id, { up: r.up, down: r.down, mine: r.mine === 1 || r.mine === -1 ? r.mine : null }) || changed;
    }
    if (changed) emit();
  }
}

let channel: RealtimeChannel | null = null;
function listen() {
  if (channel || !supabase) return;
  channel = supabase
    .channel("review-votes")
    .on("broadcast", { event: "votes" }, ({ payload }) => {
      const p = payload as { id?: string; up?: number; down?: number };
      if (!p.id || typeof p.up !== "number" || typeof p.down !== "number") return;
      const cur = tallies.get(p.id);
      if (!cur && !wanted.has(p.id)) return; // not on screen for this visitor
      if (put(p.id, { up: p.up, down: p.down, mine: cur?.mine ?? null })) emit();
    })
    .subscribe();
}

// Signing in or out changes which votes are "yours": reload what's on screen.
let lastUser: string | null | undefined;
reviews.subscribe(() => {
  const uid = reviews.get().session?.userId ?? null;
  if (uid === lastUser) return;
  const first = lastUser === undefined;
  lastUser = uid;
  if (!first && wanted.size) void fetchTallies([...wanted]);
});

export const votes = {
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
  get: () => version,
  tally: (id: string): Tally | undefined => tallies.get(id),

  /** Load totals for reviews that just appeared on screen, and start listening for live changes. */
  ensure(ids: string[]) {
    const fresh = ids.filter((id) => UUID.test(id) && !wanted.has(id));
    if (!fresh.length) return;
    fresh.forEach((id) => wanted.add(id));
    listen();
    if (batch) window.clearTimeout(batch);
    batch = window.setTimeout(() => {
      batch = null;
      void fetchTallies([...wanted].filter((id) => !tallies.has(id)));
    }, 30);
  },

  /** Vote up or down; voting the same way again takes the vote back. Returns an error message, if any. */
  async cast(id: string, dir: 1 | -1): Promise<string | null> {
    if (!supabase) return "Voting needs the shared database.";
    const before = tallies.get(id) ?? { up: 0, down: 0, mine: null };
    const next: -1 | 1 | null = before.mine === dir ? null : dir;
    // Show it right away; the server's totals replace this a moment later.
    const optimistic: Tally = {
      up: before.up - (before.mine === 1 ? 1 : 0) + (next === 1 ? 1 : 0),
      down: before.down - (before.mine === -1 ? 1 : 0) + (next === -1 ? 1 : 0),
      mine: next,
    };
    if (put(id, optimistic)) emit();
    const { data, error } = await supabase.rpc("vote_review", { p_review: id, p_vote: next ?? 0 });
    const row = Array.isArray(data) ? (data[0] as { up: number; down: number; mine: number | null } | undefined) : undefined;
    if (error || !row) {
      if (put(id, before)) emit();
      return error?.code === "P0001" && error.message ? error.message : "Couldn't save your vote. Try again.";
    }
    if (put(id, { up: row.up, down: row.down, mine: row.mine === 1 || row.mine === -1 ? row.mine : null })) emit();
    return null;
  },
};

export function useVotes(): number {
  return useSyncExternalStore(votes.subscribe, votes.get, votes.get);
}
