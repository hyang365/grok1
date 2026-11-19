import { useEffect, useRef } from "react";
import { useReviewStore } from "../reviews/store";
import { useTripTable } from "../store";
import { syncTrips, type RemoteTrip } from "./plans";
import { sanitizeFlight } from "../trip/tripLogic";
import { gcal } from "../calendar/gcal";
import type { Trip, TripFlight } from "../types";

function toTrip(r: RemoteTrip): Trip {
  const d = r.details ?? {};
  return {
    id: r.id,
    placeId: r.place_id,
    season: r.season,
    start: r.start_date,
    end: r.end_date,
    note: typeof d.note === "string" ? d.note : "",
    friendNetids: Array.isArray(d.friendNetids) ? d.friendNetids.filter((x): x is string => typeof x === "string") : [],
    flights: Array.isArray(d.flights) ? d.flights.map(sanitizeFlight).filter((f): f is TripFlight => f !== null) : [],
    checklist: Array.isArray(d.checklist) ? d.checklist.filter((x): x is string => typeof x === "string") : [],
  };
}

/**
 * Keeps a signed-in Yale student's trips in the database, so they count (anonymously)
 * toward the map's plan totals and follow them across devices.
 */
export function useTripSync() {
  const { state, dispatch } = useTripTable();
  const { session, shared } = useReviewStore();
  const timer = useRef<number | null>(null);
  const userId = shared && session && session.email ? session.userId : null;

  useEffect(() => {
    if (!userId) return;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(async () => {
      const { added, changed } = await syncTrips(state.trips, userId);
      // The database now has these trips: mirror them into Google Calendar if it's connected.
      if (!added.length && !changed.length) gcal.queue(state.trips);
      if (added.length) dispatch({ type: "mergeTrips", trips: added.map(toTrip) });
      for (const r of changed) {
        const t = toTrip(r);
        dispatch({ type: "updateTrip", id: t.id, patch: { placeId: t.placeId, season: t.season, start: t.start, end: t.end, note: t.note, friendNetids: t.friendNetids, flights: t.flights, checklist: t.checklist } });
      }
    }, 800);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [state.trips, userId, dispatch]);
}
