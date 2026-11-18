import { useEffect, useRef } from "react";
import { useReviewStore } from "../reviews/store";
import { useTripTable } from "../store";
import { syncTrips } from "./plans";

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
      const remoteOnly = await syncTrips(state.trips, userId);
      if (remoteOnly.length) {
        dispatch({
          type: "mergeTrips",
          trips: remoteOnly.map((r) => ({ id: r.id, placeId: r.place_id, season: r.season, start: r.start_date, end: r.end_date, note: "", friendNetids: [] })),
        });
      }
    }, 800);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [state.trips, userId, dispatch]);
}
