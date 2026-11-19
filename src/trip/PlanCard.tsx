import { useEffect, useState } from "react";
import { BREAKS, addDays, daysBetween, duration, googleFlights, resolveDestination, todayISO } from "../flights/engine";
import { flightStore } from "../flights/flightStore";
import { defaultWindow, formatMoney, formatRange, parseISODate, SEASONS, seasonLabel, travelGuidance } from "../logic";
import { useFriends, useTripTable } from "../store";
import type { Place, Season, Trip } from "../types";
import { leaveByLine, countdownLabel } from "./TripDetail";
import "./trip.css";

const BREAK_SEASON: Record<string, Season> = { nov: "fall", win: "winter", spr: "spring", sum: "summer" };

/** The "Plan a trip" card at the top of a place panel: dates, who's coming, and how to get there, in one place. */
export function PlanCard({ place, startOpen = false, onSaved }: { place: Place; startOpen?: boolean; onSaved?: () => void }) {
  const { state, dispatch } = useTripTable();
  const friends = useFriends();
  const existing = state.trips.find((t) => t.placeId === place.id && daysBetween(todayISO(), t.end) >= 0);
  const [open, setOpen] = useState(startOpen);
  const blocked = travelGuidance(place.iso).level === "blocked";

  useEffect(() => setOpen(startOpen), [place.id, startOpen]);

  if (blocked) return null;
  if (existing && !open) return <YourTrip trip={existing} place={place} onEdit={() => setOpen(true)} />;

  return (
    <PlanForm
      place={place}
      existing={existing}
      expanded={open}
      onExpand={() => setOpen(true)}
      onDone={() => {
        setOpen(false);
        onSaved?.();
      }}
      friends={friends}
      state={state}
      dispatch={dispatch}
    />
  );
}

function YourTrip({ trip, place, onEdit }: { trip: Trip; place: Place; onEdit: () => void }) {
  const { dispatch } = useTripTable();
  const friends = useFriends();
  const names = trip.friendNetids.map((id) => friends.find((f) => f.netid === id)?.name).filter((n): n is string => Boolean(n));
  const leave = leaveByLine(trip);
  return (
    <section className="pc pc-trip">
      <div className="pc-top">
        <div>
          <p className="kicker">Your trip · {countdownLabel(trip)}</p>
          <h3>{formatRange(trip.start, trip.end)}</h3>
          <p className="fine">{names.length ? `With ${names.join(", ")}` : "Just you so far"}</p>
        </div>
      </div>
      {leave ? <p className="pc-leave">{leave}</p> : <p className="fine">Next: add your flight to get a leave-by time from campus.</p>}
      <div className="plan-actions">
        <button className="primary" type="button" onClick={() => dispatch({ type: "openTrip", id: trip.id })}>
          Open trip details
        </button>
        <button className="textlink" type="button" onClick={onEdit}>
          Change dates or people
        </button>
      </div>
      <GettingThere place={place} start={trip.start} end={trip.end} />
    </section>
  );
}

type FormProps = {
  place: Place;
  existing?: Trip;
  expanded: boolean;
  onExpand: () => void;
  onDone: () => void;
  friends: ReturnType<typeof useFriends>;
  state: ReturnType<typeof useTripTable>["state"];
  dispatch: ReturnType<typeof useTripTable>["dispatch"];
};

function PlanForm({ place, existing, expanded, onExpand, onDone, friends, state, dispatch }: FormProps) {
  const upcoming = BREAKS.filter((b) => daysBetween(todayISO(), b.start) > 0);
  const [season, setSeason] = useState<Season>(existing?.season ?? state.season);
  const [win, setWin] = useState<[string, string]>(existing ? [existing.start, existing.end] : defaultWindow(state.season));
  const [withIds, setWithIds] = useState<string[]>(existing?.friendNetids ?? []);

  useEffect(() => {
    setSeason(existing?.season ?? state.season);
    setWin(existing ? [existing.start, existing.end] : defaultWindow(state.season));
    setWithIds(existing?.friendNetids ?? []);
  }, [place.id, existing, state.season]);

  const invalid = parseISODate(win[1]) < parseISODate(win[0]);
  const nights = Math.max(0, daysBetween(win[0], win[1]));

  function save() {
    if (invalid) return;
    const id = existing?.id ?? `trip-${place.id}-${win[0]}`;
    dispatch({
      type: "saveTrip",
      message: existing ? "Trip updated" : `${place.name} added to your itinerary`,
      trip: { ...(existing ?? { note: "", flights: [], checklist: [] }), id, placeId: place.id, season, start: win[0], end: win[1], friendNetids: withIds } as Trip,
    });
    onDone();
  }

  if (!expanded && !existing) {
    return (
      <section className="pc pc-cta">
        <div>
          <h3>Plan a trip to {place.name}</h3>
          <p className="fine">Pick dates and friends, then add flights for a "leave campus by" time.</p>
        </div>
        <button className="primary pc-go" type="button" onClick={onExpand}>
          Plan a trip
        </button>
      </section>
    );
  }

  return (
    <section className="pc pc-form">
      <div className="pc-top">
        <h3>{existing ? "Edit your trip" : `Plan a trip to ${place.name}`}</h3>
        <button className="icon-btn" type="button" aria-label="Close" onClick={onDone}>
          ×
        </button>
      </div>

      <p className="field-label">When</p>
      <div className="pc-chips">
        {upcoming.map((b) => {
          const end = b.id === "win" || b.id === "sum" ? addDays(b.start, 10) : b.end;
          const on = win[0] === b.start && win[1] === end;
          return (
            <button
              key={b.id}
              type="button"
              className={on ? "on" : ""}
              onClick={() => {
                setWin([b.start, end]);
                setSeason(BREAK_SEASON[b.id] ?? season);
              }}
            >
              {b.label}
            </button>
          );
        })}
      </div>
      <div className="pc-dates">
        <label>
          <span className="fine">Leave</span>
          <input type="date" value={win[0]} onChange={(e) => e.target.value && setWin([e.target.value, win[1]])} />
        </label>
        <label>
          <span className="fine">Return</span>
          <input type="date" value={win[1]} min={win[0]} onChange={(e) => e.target.value && setWin([win[0], e.target.value])} />
        </label>
        <label>
          <span className="fine">Counts toward</span>
          <select value={season} onChange={(e) => setSeason(e.target.value as Season)}>
            {SEASONS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {invalid ? <p className="form-error">The return date is before the leave date.</p> : <p className="fine">{nights} {nights === 1 ? "night" : "nights"}</p>}

      <p className="field-label">Who's coming</p>
      {friends.length ? (
        <div className="pc-chips">
          {friends.map((f) => {
            const on = withIds.includes(f.netid);
            return (
              <button key={f.netid} type="button" className={on ? "on" : ""} aria-pressed={on} onClick={() => setWithIds(on ? withIds.filter((x) => x !== f.netid) : [...withIds, f.netid])}>
                {on ? "✓ " : "+ "}
                {f.name}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="fine">Add friends on the Friends page, or send an invite link from the trip once it's saved.</p>
      )}

      <div className="plan-actions pc-save">
        <button className="primary" type="button" disabled={invalid} onClick={save}>
          {existing ? "Save changes" : "Add to itinerary"}
        </button>
        {existing ? (
          <button
            className="textlink danger"
            type="button"
            onClick={() => {
              if (window.confirm(`Remove your ${place.name} trip?`)) {
                dispatch({ type: "removeTrip", id: existing.id });
                onDone();
              }
            }}
          >
            Remove trip
          </button>
        ) : null}
      </div>
      <GettingThere place={place} start={win[0]} end={win[1]} />
    </section>
  );
}

/** Compact "how you'd get there from campus" summary, with links out. */
function GettingThere({ place, start, end }: { place: Place; start: string; end: string }) {
  const { dispatch } = useTripTable();
  const dest = resolveDestination(place);
  const ground = [...dest.groundRoutes].sort((a, b) => a.cost - b.cost).slice(0, 2);
  return (
    <div className="pc-there">
      <p className="field-label">Getting there from campus</p>
      {ground.length ? (
        <ul>
          {ground.map((g) => (
            <li key={g.label}>
              <span>{g.label}</span>
              <span className="fine">
                {duration(g.mins)} · {formatMoney(g.cost)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {dest.airport ? (
        <p className="fine">
          Fly into <strong>{dest.airport.city}</strong> ({dest.airport.code}) from JFK, LaGuardia, Newark or Bradley
          {dest.transfer ? `, then ${duration(dest.transfer.mins)} by car or bus` : ""}.{" "}
          <a href={googleFlights("New York", dest.airport.code, start, end)} target="_blank" rel="noreferrer">
            Search flights ↗
          </a>
        </p>
      ) : !ground.length ? (
        <p className="fine">Drive or take transit from campus.</p>
      ) : null}
      <button
        className="textlink"
        type="button"
        onClick={() => {
          flightStore.set({ destId: place.id, out: start, back: end });
          dispatch({ type: "setView", view: "flights" });
        }}
      >
        Compare airports and rides from Yale →
      </button>
    </div>
  );
}

export { seasonLabel };
