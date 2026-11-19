import { useMemo, useState } from "react";
import { lookupPlace } from "../data";
import { useAccount, useMe } from "../account/account";
import { estimate } from "../budget";
import { flightStatus, googleFlights, resolveDestination, GATEWAYS } from "../flights/engine";
import { useOverlap } from "../live/plans";
import { formatMoney, formatRange, parseISODate, scoreOf, seasonLabel, travelGuidance } from "../logic";
import { useFriends, useTripTable } from "../store";
import type { Trip, TripFlight } from "../types";
import {
  AIRLINES,
  checklistFor,
  clock,
  dayLabel,
  daysUntil,
  downloadCalendar,
  duration,
  flightLabel,
  gatewayOf,
  homePlans,
  inviteLink,
  isDomestic,
  leavePlans,
} from "./tripLogic";
import "./trip.css";

export function countdownLabel(trip: Trip): string {
  const d = daysUntil(trip.start);
  const left = daysUntil(trip.end);
  if (d > 1) return `In ${d} days`;
  if (d === 1) return "Tomorrow";
  if (d === 0) return "Today";
  if (left >= 0) return "Happening now";
  return "Past trip";
}

/** The first outbound flight's recommended "leave campus by" line, for summaries. */
export function leaveByLine(trip: Trip): string | null {
  const out = (trip.flights ?? []).filter((f) => f.dir === "out").sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))[0];
  if (!out) return null;
  const lp = leavePlans(out, !isDomestic(trip));
  const base = `✈ ${flightLabel(out)} from ${out.airport}${out.time ? ` · ${dayLabel(out.date)} ${clock(toMins(out.time))}` : ""}`;
  if (!lp) return base;
  const pick = lp.plans.find((p) => p.tags.includes("Cheapest")) ?? lp.plans[0];
  return `${base} · leave campus by ${clock(pick.leaveMins)}`;
}
const toMins = (t: string) => Number(t.split(":")[0]) * 60 + Number(t.split(":")[1]);

export function TripDetail({ trip }: { trip: Trip }) {
  const { dispatch } = useTripTable();
  const place = lookupPlace(trip.placeId);
  const friends = useFriends();
  const me = useMe();
  const { requests } = useAccount();
  const [editingDates, setEditingDates] = useState(false);
  const [start, setStart] = useState(trip.start);
  const [end, setEnd] = useState(trip.end);
  const [adding, setAdding] = useState<"out" | "back" | null>(null);
  const [note, setNote] = useState(trip.note);
  const [copied, setCopied] = useState(false);
  const overlap = useOverlap(trip.placeId, trip.start, trip.end);
  if (!place) return null;

  const intl = !isDomestic(trip);
  const flights = [...(trip.flights ?? [])].sort((a, b) => (a.dir === b.dir ? (a.date + a.time).localeCompare(b.date + b.time) : a.dir === "out" ? -1 : 1));
  const people = trip.friendNetids.map((id) => ({ id, person: friends.find((f) => f.netid === id) }));
  const addable = friends.filter((f) => !trip.friendNetids.includes(f.netid));
  const alsoGoing = friends.filter(
    (f) =>
      !trip.friendNetids.includes(f.netid) &&
      f.trips.some((t) => {
        const p = lookupPlace(t.placeId);
        const same = t.placeId === trip.placeId || p?.parentId === trip.placeId || place.parentId === t.placeId;
        return same && parseISODate(t.start) <= parseISODate(trip.end) && parseISODate(t.end) >= parseISODate(trip.start);
      }),
  );
  const checks = checklistFor(trip);
  const done = (trip.checklist ?? []).filter((id) => checks.some((c) => c.id === id)).length;
  const nights = Math.max(1, Math.round((parseISODate(trip.end) - parseISODate(trip.start)) / 86_400_000));
  const cost = estimate(place, nights, people.length + 1);
  const dest = resolveDestination(place);
  const guidance = travelGuidance(place.iso);
  const rating = scoreOf(place.id, "overall");

  const update = (patch: Partial<Trip>, message?: string) => dispatch({ type: "updateTrip", id: trip.id, patch, message });

  async function share() {
    const link = inviteLink(trip, me.signedIn ? me.name : "A friend", me.signedIn ? me.id : "");
    const text = `Join my ${place!.name} trip on TripTable (${formatRange(trip.start, trip.end)})`;
    try {
      if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
        await navigator.share({ title: "TripTable trip", text, url: link });
        return;
      }
    } catch {
      /* fall back to copying */
    }
    try {
      await navigator.clipboard.writeText(`${text}: ${link}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt("Copy this invite link", link);
    }
  }

  return (
    <div className="td">
      <button className="textlink td-back" type="button" onClick={() => dispatch({ type: "openTrip", id: null })}>
        ← All trips
      </button>

      <header className="td-head">
        <div>
          <p className="kicker">
            {seasonLabel(trip.season)} · {place.region}
          </p>
          <h2>{place.name}</h2>
          {editingDates ? (
            <form
              className="td-dates"
              onSubmit={(e) => {
                e.preventDefault();
                if (parseISODate(end) < parseISODate(start)) return;
                update({ start, end }, "Dates updated");
                setEditingDates(false);
              }}
            >
              <input type="date" value={start} onChange={(e) => setStart(e.target.value)} aria-label="Start date" />
              <span>to</span>
              <input type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} aria-label="End date" />
              <button className="primary" type="submit" disabled={parseISODate(end) < parseISODate(start)}>
                Save
              </button>
              <button className="textlink" type="button" onClick={() => setEditingDates(false)}>
                Cancel
              </button>
            </form>
          ) : (
            <p className="td-when">
              {formatRange(trip.start, trip.end)} · {nights} {nights === 1 ? "night" : "nights"}{" "}
              <button className="textlink" type="button" onClick={() => setEditingDates(true)}>
                Edit dates
              </button>
            </p>
          )}
        </div>
        <div className="td-head-side">
          <span className="td-count">{countdownLabel(trip)}</span>
          {rating !== null ? <span className="fine">Rated {rating.toFixed(1)} by students</span> : null}
        </div>
      </header>
      {guidance.level !== "ok" ? (
        <p className={`guidance ${guidance.level}`}>
          <strong>{guidance.title}.</strong> {guidance.detail}
        </p>
      ) : null}

      <div className="td-grid">
        {/* ---------- flights and leave-by ---------- */}
        <section className="td-card td-flights">
          <div className="td-card-head">
            <h3>Flights</h3>
            {!adding ? (
              <div className="td-add-row">
                <button className="primary" type="button" onClick={() => setAdding("out")}>
                  + Add flight details
                </button>
              </div>
            ) : null}
          </div>
          {flights.length === 0 && !adding ? (
            <div className="td-empty">
              <p>Add your flight and we'll tell you exactly when to leave campus and how to get to the airport.</p>
              <p className="fine">
                Haven't booked yet?{" "}
                <a href={googleFlights("New York", dest.airport?.code ?? place.name, trip.start, trip.end)} target="_blank" rel="noreferrer">
                  Search Google Flights ↗
                </a>{" "}
                or{" "}
                <button
                  className="textlink"
                  type="button"
                  onClick={() => {
                    dispatch({ type: "setView", view: "flights" });
                  }}
                >
                  compare airports and rides
                </button>
                .
              </p>
            </div>
          ) : null}
          {adding ? (
            <FlightForm
              trip={trip}
              dir={adding}
              onCancel={() => setAdding(null)}
              onSave={(f) => {
                update({ flights: [...(trip.flights ?? []), f] }, f.dir === "out" ? "Flight added. Your leave-by time is ready." : "Return flight added");
                setAdding(null);
              }}
            />
          ) : null}
          <ul className="td-flight-list">
            {flights.map((f) => (
              <FlightRow key={f.id} f={f} intl={intl} onRemove={() => update({ flights: (trip.flights ?? []).filter((x) => x.id !== f.id) }, "Flight removed")} />
            ))}
          </ul>
          {flights.length > 0 && !adding ? (
            <div className="plan-actions">
              {!flights.some((f) => f.dir === "back") ? (
                <button type="button" onClick={() => setAdding("back")}>
                  + Add return flight
                </button>
              ) : null}
              <button className="textlink" type="button" onClick={() => downloadCalendar(trip)}>
                Add trip and leave-by reminder to my calendar
              </button>
            </div>
          ) : null}
        </section>

        {/* ---------- who's going ---------- */}
        <section className="td-card">
          <div className="td-card-head">
            <h3>Who's going</h3>
            <span className="fine">{people.length + 1} total</span>
          </div>
          <ul className="td-people">
            <li>
              <span className="td-avatar">{me.signedIn ? initials(me.name) : "You"}</span>
              <span>
                <strong>You</strong>
              </span>
            </li>
            {people.map(({ id, person }) => (
              <li key={id}>
                <span className="td-avatar">{person ? initials(person.name) : "?"}</span>
                <span>
                  <strong>{person?.name ?? "Not on your friends list"}</strong>
                  {person?.college ? <small>{person.college}</small> : null}
                </span>
                <button className="icon-btn" type="button" aria-label={`Remove ${person?.name ?? "person"} from this trip`} onClick={() => update({ friendNetids: trip.friendNetids.filter((x) => x !== id) })}>
                  ×
                </button>
              </li>
            ))}
          </ul>
          {addable.length ? (
            <label className="td-addfriend">
              <span className="fine">Add a friend</span>
              <select
                value=""
                onChange={(e) => {
                  if (!e.target.value) return;
                  const who = friends.find((f) => f.netid === e.target.value);
                  update({ friendNetids: [...trip.friendNetids, e.target.value] }, `${who?.name ?? "Friend"} added to the trip`);
                }}
              >
                <option value="">Choose…</option>
                {addable.map((f) => (
                  <option key={f.netid} value={f.netid}>
                    {f.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {alsoGoing.length ? (
            <p className="td-also">
              Also there these dates: {alsoGoing.map((f) => f.name).join(", ")}.{" "}
              <button className="textlink" type="button" onClick={() => update({ friendNetids: [...trip.friendNetids, ...alsoGoing.map((f) => f.netid)] }, "Added to the trip")}>
                Add them
              </button>
            </p>
          ) : null}
          <div className="td-invite">
            <button className="primary" type="button" onClick={() => void share()}>
              {copied ? "Invite link copied ✓" : "Invite friends with a link"}
            </button>
            <p className="fine">
              Anyone at Yale with the link can add this trip{trip.flights?.length ? " and your flights" : ""} to their itinerary
              {me.signedIn ? ", and you'll get a friend request from them" : ". Sign in so they can add you as a friend"}.
            </p>
          </div>
          {requests.some((r) => r.incoming) ? (
            <button className="textlink" type="button" onClick={() => dispatch({ type: "setView", view: "friends" })}>
              You have friend requests waiting →
            </button>
          ) : null}
          <p className="fine td-overlap">
            {overlap === null ? "" : overlap === 0 ? "No other Yalies have saved these dates here yet." : `${overlap} other ${overlap === 1 ? "Yalie overlaps" : "Yalies overlap"} with these dates.`}
          </p>
        </section>

        {/* ---------- checklist ---------- */}
        <section className="td-card">
          <div className="td-card-head">
            <h3>Before you go</h3>
            <span className="fine">
              {done} of {checks.length}
            </span>
          </div>
          <div className="td-progress" aria-hidden="true">
            <i style={{ width: `${(done / checks.length) * 100}%` }} />
          </div>
          <ul className="td-checks">
            {checks.map((c) => {
              const on = (trip.checklist ?? []).includes(c.id);
              return (
                <li key={c.id}>
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => update({ checklist: on ? (trip.checklist ?? []).filter((x) => x !== c.id) : [...(trip.checklist ?? []), c.id] })}
                    />
                    <span>
                      {c.label}
                      {c.hint ? <small>{c.hint}</small> : null}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </section>

        {/* ---------- notes, cost, links ---------- */}
        <section className="td-card">
          <div className="td-card-head">
            <h3>Notes</h3>
          </div>
          <textarea
            className="td-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => note !== trip.note && update({ note }, "Notes saved")}
            rows={4}
            maxLength={2000}
            placeholder="Where you're staying, confirmation numbers, who's booking what"
          />
          <div className="td-cost">
            <p className="field-label">Rough cost per person</p>
            <p>
              <strong>≈ {formatMoney(cost.total)}</strong>{" "}
              <span className="fine">
                {formatMoney(cost.travel)} {cost.how} · {formatMoney(cost.stay)} stay · {formatMoney(cost.daily)} food & fun
              </span>
            </p>
          </div>
          <p className="td-links">
            <a href={`https://www.google.com/maps/search/${encodeURIComponent(`hotels in ${place.name}`)}`} target="_blank" rel="noreferrer">
              Find a place to stay ↗
            </a>
            <a href="https://www.yideshare.com/" target="_blank" rel="noreferrer">
              YiDeShare rides ↗
            </a>
            <button
              className="textlink"
              type="button"
              onClick={() => {
                dispatch({ type: "setSeason", season: trip.season });
                dispatch({ type: "setView", view: "map" });
                dispatch({ type: "select", id: place.id });
              }}
            >
              Reviews of {place.name}
            </button>
          </p>
        </section>
      </div>

      <div className="td-footer">
        <button className="textlink" type="button" onClick={() => downloadCalendar(trip)}>
          Export to calendar
        </button>
        <button
          className="textlink danger"
          type="button"
          onClick={() => {
            if (window.confirm(`Remove your ${place.name} trip?`)) dispatch({ type: "removeTrip", id: trip.id });
          }}
        >
          Remove trip
        </button>
      </div>
    </div>
  );
}

function initials(name: string): string {
  const p = name.split(/\s+/).filter(Boolean);
  return ((p[0]?.[0] ?? "") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase() || "?";
}

function FlightRow({ f, intl, onRemove }: { f: TripFlight; intl: boolean; onRemove: () => void }) {
  const gw = gatewayOf(f.airport);
  const t = f.time ? toMins(f.time) : null;
  const out = f.dir === "out";
  const lp = out ? leavePlans(f, intl) : null;
  const hp = !out ? homePlans(f, intl) : null;
  const label = flightLabel(f);
  const code = f.number ? `${AIRLINES.find((a) => a.name === f.airline)?.code ?? ""} ${f.number}`.trim() : "";
  const pick = lp ? lp.plans.find((p) => p.tags.includes("Cheapest")) ?? lp.plans[0] : null;

  return (
    <li className={`td-flight ${out ? "out" : "back"}`}>
      <div className="td-flight-top">
        <div>
          <p className="kicker">{out ? "Going" : "Coming back"}</p>
          <strong>
            {label} · {out ? "departs" : "lands at"} {gw ? (gw.name === gw.code ? gw.code : `${gw.name} (${gw.code})`) : f.airport}
          </strong>
          <p className="fine">
            {f.date ? dayLabel(f.date) : "Date not set"}
            {t !== null ? ` at ${clock(t)}` : ""}
          </p>
        </div>
        <button className="icon-btn" type="button" aria-label="Remove flight" onClick={onRemove}>
          ×
        </button>
      </div>

      {out && lp && pick ? (
        <div className="td-leave">
          <p className="td-leave-head">
            Leave campus by <strong>{clock(pick.leaveMins)}</strong>
            {pick.leaveDate !== f.date ? <span> the day before ({dayLabel(pick.leaveDate)})</span> : null}
          </p>
          <p className="fine">
            {pick.label}, about {duration(pick.rideMins)}. That gets you to {gw?.code} {lp.buffer} minutes before takeoff
            {intl ? ", which international flights need" : ""}, with 10 minutes to spare.
          </p>
          <table className="td-options">
            <thead>
              <tr>
                <th>Way to get there</th>
                <th>Leave by</th>
                <th>Ride</th>
                <th>Cost</th>
              </tr>
            </thead>
            <tbody>
              {lp.plans.map((p) => (
                <tr key={p.label} className={p === pick ? "on" : ""}>
                  <td>
                    {p.label}
                    {p.tags.map((tag) => (
                      <span key={tag} className="td-tag">
                        {tag}
                      </span>
                    ))}
                  </td>
                  <td>
                    {clock(p.leaveMins)}
                    {p.leaveDate !== f.date ? " (day before)" : ""}
                  </td>
                  <td>{duration(p.rideMins)}</td>
                  <td>
                    {formatMoney(p.cost)}
                    {p.splittable ? <small> split it</small> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="fine">Train and bus times are estimates: check the actual schedule for one that arrives before your leave-by time.</p>
        </div>
      ) : null}
      {out && !gw ? <p className="fine">We can time the trip to campus for Tweed, Bradley, JFK, LaGuardia, Newark and Logan.</p> : null}
      {out && gw && t === null ? <p className="fine">Add the departure time to get your leave-by time.</p> : null}

      {!out && hp ? (
        <div className="td-leave back">
          <p className="td-leave-head">
            Back on campus around <strong>{clock(hp.plans[0].homeMins)}</strong>
            {hp.plans[0].homeDate !== f.date ? <span> ({dayLabel(hp.plans[0].homeDate)})</span> : null}
          </p>
          <p className="fine">
            {hp.plans.map((p) => `${p.label}: ${clock(p.homeMins)} (${formatMoney(p.cost)})`).join(" · ")}
          </p>
        </div>
      ) : null}

      {code && f.date ? (
        <p className="td-flight-links">
          <a href={flightStatus(code, f.date)} target="_blank" rel="noreferrer">
            Flight status ↗
          </a>
          <a href={`https://www.google.com/travel/flights?q=${encodeURIComponent(`${code} on ${f.date}`)}`} target="_blank" rel="noreferrer">
            Find this flight on Google Flights ↗
          </a>
        </p>
      ) : null}
    </li>
  );
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

function FlightForm({ trip, dir, onSave, onCancel }: { trip: Trip; dir: "out" | "back"; onSave: (f: TripFlight) => void; onCancel: () => void }) {
  const [direction, setDirection] = useState<"out" | "back">(dir);
  const [airport, setAirport] = useState("JFK");
  const [other, setOther] = useState("");
  const [airline, setAirline] = useState("JetBlue");
  const [number, setNumber] = useState("");
  const [date, setDate] = useState(dir === "out" ? trip.start : trip.end);
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(0);
  const [ampm, setAmpm] = useState<"AM" | "PM">("AM");
  const time24 = useMemo(() => {
    const h = (hour % 12) + (ampm === "PM" ? 12 : 0);
    return `${String(h).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }, [hour, minute, ampm]);
  const airportCode = airport === "other" ? other.trim().toUpperCase() : airport;

  return (
    <form
      className="td-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (!airportCode || !date) return;
        onSave({ id: `f-${Date.now().toString(36)}`, dir: direction, airport: airportCode, airline, number: number.replace(/\D/g, "").slice(0, 5), date, time: time24 });
      }}
    >
      <div className="td-seg" role="radiogroup" aria-label="Which flight">
        <button type="button" role="radio" aria-checked={direction === "out"} className={direction === "out" ? "on" : ""} onClick={() => { setDirection("out"); setDate(trip.start); }}>
          Going
        </button>
        <button type="button" role="radio" aria-checked={direction === "back"} className={direction === "back" ? "on" : ""} onClick={() => { setDirection("back"); setDate(trip.end); }}>
          Coming back
        </button>
      </div>
      <div className="td-form-grid">
        <label>
          {direction === "out" ? "Leaving from" : "Landing at"}
          <select value={airport} onChange={(e) => setAirport(e.target.value)}>
            {GATEWAYS.map((g) => (
              <option key={g.code} value={g.code}>
                {g.name} ({g.code})
              </option>
            ))}
            <option value="other">Another airport…</option>
          </select>
        </label>
        {airport === "other" ? (
          <label>
            Airport code
            <input value={other} onChange={(e) => setOther(e.target.value)} maxLength={4} placeholder="e.g. PVD" required />
          </label>
        ) : null}
        <label>
          Airline
          <select value={airline} onChange={(e) => setAirline(e.target.value)}>
            {AIRLINES.map((a) => (
              <option key={a.name} value={a.name}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Flight number <span className="fine">(optional)</span>
          <input value={number} onChange={(e) => setNumber(e.target.value)} inputMode="numeric" maxLength={5} placeholder="1503" />
        </label>
        <label>
          Date
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>
        <div className="td-time">
          <span>{direction === "out" ? "Departs at" : "Lands at"}</span>
          <div>
            <select value={hour} onChange={(e) => setHour(Number(e.target.value))} aria-label="Hour">
              {HOURS.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
            <select value={minute} onChange={(e) => setMinute(Number(e.target.value))} aria-label="Minute">
              {MINUTES.map((m) => (
                <option key={m} value={m}>
                  {String(m).padStart(2, "0")}
                </option>
              ))}
            </select>
            <select value={ampm} onChange={(e) => setAmpm(e.target.value as "AM" | "PM")} aria-label="AM or PM">
              <option>AM</option>
              <option>PM</option>
            </select>
          </div>
        </div>
      </div>
      <p className="fine">Use the local time on your ticket.</p>
      <div className="plan-actions">
        <button className="primary" type="submit">
          Save flight
        </button>
        <button className="textlink" type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

