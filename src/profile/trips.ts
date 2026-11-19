import { todayISO } from "../flights/engine";
import { lookupPlace } from "../data";
import type { Season, Trip } from "../types";

/** A trip is history once its last day has passed. */
export function isPast(trip: Trip): boolean {
  return trip.end < todayISO();
}

export function isUpcoming(trip: Trip): boolean {
  return !isPast(trip);
}

/** Country ISO for a trip, whether it's to a country or a spot inside one. */
export function countryOf(trip: Trip): string | null {
  const place = lookupPlace(trip.placeId);
  if (!place) return null;
  return place.iso;
}

export function seasonFor(dateISO: string): Season {
  const m = Number(dateISO.slice(5, 7));
  if (m === 3) return "spring";
  if (m >= 5 && m <= 8) return "summer";
  if (m === 10) return "fall";
  if (m === 12 || m === 1) return "winter";
  return "weekend";
}
