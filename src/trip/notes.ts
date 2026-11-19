// Shared trip notes: what friends on the same trip saved in their notes. Your own note syncs with
// your trip (trips.details.note); trip_notes() returns only friends linked to this trip.

import { useEffect, useState } from "react";
import { supabase } from "../reviews/backend";
import { useReviewStore } from "../reviews/store";
import type { Trip } from "../types";

export type SharedNote = { user_id: string; name: string; note: string; updated_at: string };

export function useTripNotes(trip: Trip): SharedNote[] {
  const { session } = useReviewStore();
  const signedIn = Boolean(session?.email);
  const [notes, setNotes] = useState<SharedNote[]>([]);
  useEffect(() => {
    if (!supabase || !signedIn) {
      setNotes([]);
      return;
    }
    let alive = true;
    let last = "";
    const load = async () => {
      if (document.visibilityState !== "visible") return;
      const { data, error } = await supabase!.rpc("trip_notes", { p_place: trip.placeId, p_start: trip.start, p_end: trip.end });
      if (!alive || error || !Array.isArray(data)) return;
      const sig = JSON.stringify(data);
      if (sig === last) return; // unchanged: no re-render, nothing moves
      last = sig;
      setNotes(data as SharedNote[]);
    };
    void load();
    // While the trip is open: every 45 seconds, and as soon as you come back to the tab.
    const timer = window.setInterval(load, 45_000);
    document.addEventListener("visibilitychange", load);
    return () => {
      alive = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", load);
    };
  }, [trip.placeId, trip.start, trip.end, signedIn]);
  return notes;
}
