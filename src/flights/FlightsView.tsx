import { useEffect, useMemo, useRef, useState } from "react";
import { lookupPlace, PLACES } from "../data";
import { account } from "../account/account";

const SELF = "me";
import { defaultWindow, formatMoney, formatRange, travelGuidance } from "../logic";
import { useFriends, useTripTable } from "../store";
import type { FlightLeg, GroupFlight, Place, Season, Trip } from "../types";
import {
  BREAKS,
  GATEWAYS,
  GROUND_LINKS,
  addDays,
  clock,
  daysBetween,
  directions,
  duration,
  flightStatus,
  googleExactFlight,
  googleFlights,
  normalizeFlight,
  resolveDestination,
  todayISO,
  type Destination,
  type Gateway,
} from "./engine";
import { ALL_GATEWAYS, flightStore, useFlights } from "./flightStore";
import "./flights.css";
import { NextTrains } from "../transit/TransitView";

const SEARCHABLE = PLACES.filter((p) => p.id !== "us");

// ---------- small exported pieces used elsewhere in the app ----------

/** Top-bar switch. Hides Tweed (served almost entirely by Avelo) and reminds you to skip Avelo on Google Flights. */
export function AveloToggle() {
  const fs = useFlights();
  const { dispatch } = useTripTable();
  return (
    <label className={fs.boycottAvelo ? "fl-avelo on" : "fl-avelo"} title="Skip Avelo, Tweed's main airline">
      <input
        type="checkbox"
        checked={fs.boycottAvelo}
        onChange={(e) => {
          flightStore.set({ boycottAvelo: e.target.checked });
          dispatch({ type: "toast", message: e.target.checked ? "Avelo boycott on. Tweed hidden from your airports." : "Tweed is back in your airports" });
        }}
      />
      <span className="fl-switch" aria-hidden="true" />
      <span className="fl-avelo-text">{fs.boycottAvelo ? "Boycotting Avelo" : "Boycott Avelo"}</span>
    </label>
  );
}

/** Button for the place panel: jumps to the Flights tab with this place filled in. */
export function FindFlightsButton({ placeId }: { placeId: string }) {
  const { dispatch } = useTripTable();
  return (
    <button
      type="button"
      className="primary fl-find"
      onClick={() => {
        flightStore.set({ destId: placeId, out: null, back: null });
        dispatch({ type: "setView", view: "flights" });
      }}
    >
      ✈ Plan getting there from Yale
    </button>
  );
}

/** One-line group flight status for itinerary cards. */
export function GroupFlightSummary({ trip }: { trip: Trip }) {
  const g = trip.groupFlight;
  if (!g) return null;
  const people = travelersOf(trip);
  const done = people.filter((id) => g.booked.includes(id)).length;
  return (
    <p className={done === people.length ? "fl-gsum ok" : "fl-gsum"}>
      ✈ Group flight {g.outbound.flight} {g.outbound.from}→{g.outbound.to}
      {g.ret ? ` · back ${g.ret.flight}` : ""} · {done}/{people.length} booked
    </p>
  );
}

// ---------- helpers ----------
function rollForward(start: string, end: string): [string, string] {
  let s = start;
  let e = end;
  const today = todayISO();
  for (let i = 0; i < 5 && daysBetween(today, s) < 1; i++) {
    s = `${Number(s.slice(0, 4)) + 1}${s.slice(4)}`;
    e = `${Number(e.slice(0, 4)) + 1}${e.slice(4)}`;
  }
  return [s, e];
}

function defaultDates(place: Place, trips: Trip[], season: string): [string, string] {
  const trip = trips.find((t) => t.placeId === place.id || t.placeId === place.parentId);
  if (trip) return rollForward(trip.start, trip.end);
  if (season) return defaultWindow(season as Season);
  const spring = BREAKS.find((b) => b.id === "spr");
  return spring ? [spring.start, addDays(spring.start, 7)] : [addDays(todayISO(), 30), addDays(todayISO(), 37)];
}

function travelersOf(trip: Trip): string[] {
  return [SELF, ...trip.friendNetids.filter((id) => id !== SELF)];
}

function nameOf(netid: string): string {
  if (netid === SELF) return "You";
  return account.get().friends.find((p) => p.netid === netid)?.name ?? "A former friend";
}

function timeLabel(hhmm: string): string {
  const m = hhmm.match(/^(\d{1,2}):(\d{2})$/);
  return m ? clock(Number(m[1]) * 60 + Number(m[2])) : "";
}

function legLine(leg: FlightLeg): string {
  const when = `${formatRange(leg.date, leg.date).replace(/–\d+$/, "")}${leg.time ? ` ${timeLabel(leg.time)}` : ""}`;
  return `${leg.flight} ${leg.from}→${leg.to}, ${when}`;
}

function groupMessage(place: Place, g: GroupFlight): string {
  return [
    `Flights for ${place.name}. Let's all book these exact ones:`,
    `Out: ${legLine(g.outbound)}`,
    g.ret ? `Back: ${legLine(g.ret)}` : null,
    g.link ? `Google Flights: ${g.link}` : `Find it: ${googleExactFlight(g.outbound.flight, g.outbound.from, g.outbound.to, g.outbound.date)}`,
    "Tick yourself off as booked in TripTable once you have a confirmation.",
  ]
    .filter(Boolean)
    .join("\n");
}

function fastest(gw: Gateway) {
  return gw.ground.reduce((a, b) => (b.mins < a.mins ? b : a));
}

// ---------- main view ----------
export function FlightsView() {
  const { state } = useTripTable();
  const fs = useFlights();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const place: Place | null = (fs.destId ? lookupPlace(fs.destId) : null) ?? (state.trips[0] ? lookupPlace(state.trips[0].placeId) ?? null : null);

  const [out, back] = useMemo<[string, string]>(() => {
    if (fs.out && fs.back && daysBetween(todayISO(), fs.out) >= 1) return [fs.out, fs.back];
    if (!place) return [addDays(todayISO(), 30), addDays(todayISO(), 37)];
    return defaultDates(place, state.trips, state.season);
  }, [fs.out, fs.back, place, state.trips, state.season]);

  const dest = useMemo(() => (place ? resolveDestination(place) : null), [place]);
  const guidance = place ? travelGuidance(place.iso) : null;
  const blocked = guidance?.level === "blocked";
  const trip = place ? state.trips.find((t) => t.placeId === place.id) : undefined;
  const friends = useFriends();
  const crewSize = fs.crew.filter((id) => friends.some((f) => f.netid === id)).length + 1;

  const overlapping = useMemo(() => {
    if (!place) return [];
    return friends.flatMap((person) =>
      person.trips
        .filter((t) => {
          const p = lookupPlace(t.placeId);
          const same = t.placeId === place.id || p?.parentId === place.id || place.parentId === t.placeId;
          if (!same) return false;
          const [s, e] = rollForward(t.start, t.end);
          return daysBetween(s, back) >= 0 && daysBetween(out, e) >= 0;
        })
        .map((t) => ({ person, trip: t, isFriend: true })),
    );
  }, [place, out, back, friends]);

  const matches = query.trim()
    ? SEARCHABLE.filter((p) => {
        const q = query.trim().toLowerCase();
        return p.name.toLowerCase().includes(q) || p.aliases.some((a) => a.includes(q));
      }).slice(0, 8)
    : SEARCHABLE.filter((p) => state.trips.some((t) => t.placeId === p.id)).concat(SEARCHABLE.slice(0, 6)).slice(0, 8);

  function setDates(o: string, b: string) {
    flightStore.set({ out: o, back: daysBetween(o, b) >= 0 ? b : addDays(o, 7) });
  }

  const gateways = GATEWAYS.filter((g) => fs.gateways.includes(g.code) && !(fs.boycottAvelo && g.code === "HVN"));
  const upcomingBreaks = BREAKS.filter((b) => daysBetween(todayISO(), b.end) > 0);
  const destCode = dest?.airport?.code ?? "";

  return (
    <div className="fl-page">
      <header className="fl-head">
        <div>
          <h2>Flights</h2>
          <p className="lede">
            Pick the airport and the ride from Old Campus here, then search and book on Google Flights. Lock the exact flight on your trip so the whole group books the same one.
          </p>
        </div>
      </header>

      <section className="fl-search">
        <div className="fl-field fl-dest">
          <span className="field-label">To</span>
          <input
            value={open ? query : place ? place.name : query}
            placeholder="Where to? Try Puerto Rico, Lisbon, Tokyo"
            onFocus={() => {
              setOpen(true);
              setQuery("");
            }}
            onBlur={() => window.setTimeout(() => setOpen(false), 150)}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && matches[0]) {
                flightStore.set({ destId: matches[0].id, out: null, back: null });
                setOpen(false);
                (e.target as HTMLInputElement).blur();
              }
            }}
          />
          {open ? (
            <ul className="fl-drop">
              {matches.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onMouseDown={() => {
                      flightStore.set({ destId: p.id, out: null, back: null });
                      setOpen(false);
                    }}
                  >
                    <span>{p.name}</span>
                    <span className="fl-muted">{p.kind === "country" ? "Country" : p.region}</span>
                  </button>
                </li>
              ))}
              {!matches.length ? <li className="fl-muted fl-pad">No match in TripTable yet</li> : null}
            </ul>
          ) : null}
        </div>
        <label className="fl-field">
          <span className="field-label">Leave</span>
          <input type="date" value={out} min={addDays(todayISO(), 1)} onChange={(e) => e.target.value && setDates(e.target.value, back)} />
        </label>
        <label className="fl-field">
          <span className="field-label">Return</span>
          <input type="date" value={back} min={out} onChange={(e) => e.target.value && setDates(out, e.target.value)} />
        </label>
        <div className="fl-breaks">
          {upcomingBreaks.map((b) => (
            <button key={b.id} type="button" className={out === b.start ? "on" : ""} onClick={() => setDates(b.start, b.id === "win" || b.id === "sum" ? addDays(b.start, 14) : b.end)}>
              {b.label}
            </button>
          ))}
        </div>
      </section>

      <section className="fl-toolbar">
        <CrewPicker />
        <AveloToggle />
        <div className="fl-crew">
          <span className="field-label">Airports</span>
          {GATEWAYS.map((g) => {
            const on = fs.gateways.includes(g.code);
            const avelo = g.code === "HVN" && fs.boycottAvelo;
            return (
              <button
                key={g.code}
                type="button"
                disabled={avelo}
                className={on && !avelo ? "fl-chip on" : "fl-chip"}
                title={avelo ? "Hidden by your Avelo boycott" : `${g.name}, ${g.city}`}
                onClick={() =>
                  flightStore.set((s) => {
                    const next = on ? s.gateways.filter((x) => x !== g.code) : [...s.gateways, g.code];
                    return { gateways: next.length ? next : s.gateways };
                  })
                }
              >
                {g.code}
              </button>
            );
          })}
        </div>
      </section>

      {!place || !dest ? (
        <p className="fl-empty">Pick a destination above, or open any place on the map and press “Plan getting there”.</p>
      ) : blocked && guidance ? (
        <div className="guidance blocked fl-blocked">
          <strong>{guidance.title}.</strong> {guidance.detail} Flight planning is off for {place.name}.
        </div>
      ) : (
        <div className="fl-grid">
          <div className="fl-results">
            <p className="fl-summary">
              Yale to <strong>{place.name}</strong>
              {dest.airport ? ` (${dest.airport.code}, ${dest.airport.city})` : ""} · {formatRange(out, back)}
              {fs.crew.length ? ` · ${crewSize} people, rides split` : ""}
            </p>
            {guidance && guidance.level === "regional" ? <div className="guidance regional">{guidance.title}. {guidance.detail}</div> : null}
            {overlapping.length ? (
              <div className="fl-overlap">
                {overlapping.slice(0, 3).map(({ person, trip: t, isFriend }) => (
                  <div key={person.netid + t.start}>
                    <strong>{isFriend ? person.name : `A ${person.college} student`}</strong> is there {formatRange(...rollForward(t.start, t.end))}.
                    {isFriend && !fs.crew.includes(person.netid) ? (
                      <button type="button" className="textlink" onClick={() => flightStore.set((s) => ({ crew: [...s.crew, person.netid] }))}>
                        Fly together
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}

            {dest.groundRoutes.length ? <GroundCards dest={dest} crewSize={crewSize} /> : null}
            {dest.groundRoutes.length || gateways.some((g) => g.code !== "HVN" && g.code !== "BDL") ? <NextTrains /> : null}

            {dest.airport ? (
              <>
                {fs.boycottAvelo ? <p className="fl-hidden">✊ Tweed is hidden. On Google Flights, untick Avelo under Airlines too.</p> : null}
                <div className="fl-allairports">
                  <div>
                    <strong>Compare every nearby airport at once</strong>
                    <p className="fl-muted fl-small">Opens Google Flights with all New York airports, then try Hartford and Boston below.</p>
                  </div>
                  <a className="primary fl-book" href={googleFlights("New York", destCode, out, back)} target="_blank" rel="noreferrer">
                    Search NYC airports ↗
                  </a>
                </div>
                <ul className="fl-list">
                  {gateways.map((gw) => (
                    <GatewayCard key={gw.code} gw={gw} dest={dest} out={out} back={back} crewSize={crewSize} />
                  ))}
                </ul>
                {gateways.length < ALL_GATEWAYS.length - (fs.boycottAvelo ? 1 : 0) ? (
                  <button type="button" className="textlink" onClick={() => flightStore.set({ gateways: ALL_GATEWAYS })}>
                    Show all airports
                  </button>
                ) : null}
                {dest.transfer ? (
                  <p className="fl-muted fl-small">
                    On arrival: {dest.transfer.label}, about {duration(dest.transfer.mins)} and {formatMoney(dest.transfer.cost)}.
                  </p>
                ) : null}
              </>
            ) : null}
          </div>

          <aside className="fl-side">
            <GroupFlightCard key={`${place.id}-${trip?.groupFlight?.setAt ?? ""}`} place={place} dest={dest} trip={trip} out={out} back={back} />
            {dest.airport ? <TipsCard domestic={dest.domestic} /> : null}
          </aside>
        </div>
      )}
    </div>
  );
}

// ---------- pieces ----------
/** "Flying with" as a compact dropdown checklist of your friends. */
function CrewPicker() {
  const friends = useFriends();
  const fs = useFlights();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);
  const chosen = friends.filter((f) => fs.crew.includes(f.netid));
  const label = chosen.length === 0 ? "Just me" : chosen.length <= 2 ? chosen.map((f) => f.name.split(" ")[0]).join(", ") : `${chosen.length} friends`;
  return (
    <div className="fl-crewpick" ref={ref}>
      <button type="button" className={open ? "fl-ghost on" : "fl-ghost"} aria-haspopup="true" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <span className="fl-muted">Flying with:</span> {label} ▾
      </button>
      {open ? (
        <div className="fl-crewmenu" role="menu">
          {friends.length === 0 ? (
            <p className="fl-muted fl-small">Add friends on the Friends tab to split rides and plan flights together.</p>
          ) : (
            <>
              {friends.map((f) => (
                <label key={f.netid} className="check fl-crewitem">
                  <input
                    type="checkbox"
                    checked={fs.crew.includes(f.netid)}
                    onChange={() => flightStore.set((s) => ({ crew: s.crew.includes(f.netid) ? s.crew.filter((x) => x !== f.netid) : [...s.crew, f.netid] }))}
                  />
                  <span>{f.name}</span>
                  <span className="fl-muted fl-small">{f.college}</span>
                </label>
              ))}
              <div className="fl-crewfoot">
                <button type="button" className="textlink" onClick={() => flightStore.set({ crew: friends.map((f) => f.netid) })}>
                  Everyone
                </button>
                <button type="button" className="textlink" onClick={() => flightStore.set({ crew: [] })}>
                  Clear
                </button>
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

function GatewayCard({ gw, dest, out, back, crewSize }: { gw: Gateway; dest: Destination; out: string; back: string; crewSize: number }) {
  const to = dest.airport?.code ?? "";
  const quick = fastest(gw);
  const leaveBefore = quick.mins + gw.security;
  return (
    <li className="fl-opt">
      <div>
        <div className="fl-opt-title">
          <strong>
            {gw.code} · {gw.name}
          </strong>
          <span className="fl-muted fl-small">{gw.city}</span>
        </div>
        <div className="fl-legs">
          {gw.ground.map((leg) => {
            const each = leg.splittable ? leg.cost / crewSize : leg.cost;
            return (
              <span key={leg.id} className="fl-leg">
                {leg.label} · ~{duration(leg.mins)} · ~{formatMoney(Math.round(each))}
                {leg.splittable && crewSize > 1 ? " each" : ""}
              </span>
            );
          })}
        </div>
        <div className="fl-meta">
          <span>
            Leave campus about <b>{duration(leaveBefore)}</b> before departure
          </span>
          <a href={directions(`${gw.name} Airport`)} target="_blank" rel="noreferrer">
            Directions from Old Campus ↗
          </a>
        </div>
      </div>
      <div className="fl-opt-side">
        <a className="primary fl-book" href={googleFlights(gw.code, to, out, back)} target="_blank" rel="noreferrer">
          {gw.code} → {to} on Google Flights ↗
        </a>
        <span className="fl-muted fl-small">Prices and booking on Google</span>
      </div>
    </li>
  );
}

function GroundCards({ dest, crewSize }: { dest: Destination; crewSize: number }) {
  return (
    <div className="fl-card">
      <h3>Skip the airport</h3>
      <p className="fl-muted fl-small">{dest.place.name} is close enough by train, bus or car. Times and prices are rough estimates.</p>
      <ul className="fl-ground">
        {dest.groundRoutes.map((r) => {
          const each = r.splittable ? r.cost / crewSize : r.cost;
          return (
            <li key={r.label}>
              <div>
                <strong>{r.label}</strong>
                <span className="fl-muted fl-small">
                  {" "}
                  · ~{duration(r.mins)} · ~{formatMoney(Math.round(each))}
                  {r.splittable && crewSize > 1 ? " each" : ""} one way
                </span>
              </div>
              <div className="fl-actions">
                {GROUND_LINKS[r.kind].map((l) => (
                  <a key={l.label} className="textlink" href={l.url} target="_blank" rel="noreferrer">
                    {l.label} ↗
                  </a>
                ))}
              </div>
            </li>
          );
        })}
      </ul>
      <a className="primary fl-book" href={directions(dest.place.name, "transit")} target="_blank" rel="noreferrer">
        Transit directions from Old Campus ↗
      </a>
    </div>
  );
}

function emptyLeg(date: string, from: string, to: string): { flight: string; date: string; time: string; from: string; to: string } {
  return { flight: "", date, time: "", from, to };
}

function GroupFlightCard({ place, dest, trip, out, back }: { place: Place; dest: Destination; trip: Trip | undefined; out: string; back: string }) {
  const { state, dispatch } = useTripTable();
  const fs = useFlights();
  const g = trip?.groupFlight;
  const destCode = dest.airport?.code ?? "";
  const firstGw = fs.gateways.find((c) => !(fs.boycottAvelo && c === "HVN")) ?? "JFK";
  const [editing, setEditing] = useState(false);
  const [outLeg, setOutLeg] = useState(() => g?.outbound ?? emptyLeg(out, firstGw, destCode));
  const [retLeg, setRetLeg] = useState(() => g?.ret ?? emptyLeg(back, destCode, firstGw));
  const [link, setLink] = useState(g?.link ?? "");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  if (!dest.airport) {
    return (
      <div className="fl-card">
        <h3>Group travel</h3>
        <p className="fl-muted fl-small">No flight needed for {place.name}. Agree on a train or bus time in the group chat and add it to the trip note.</p>
      </div>
    );
  }

  function save() {
    const outNo = normalizeFlight(outLeg.flight);
    if (!outNo) {
      setError("Enter the outbound flight number like B6 1503.");
      return;
    }
    const retNo = retLeg.flight.trim() ? normalizeFlight(retLeg.flight) : null;
    if (retLeg.flight.trim() && !retNo) {
      setError("The return flight number doesn't look right. Try UA 2214.");
      return;
    }
    if (link.trim() && !/^https:\/\/(www\.)?(google\.[a-z.]+\/travel|goo\.gl|g\.co)\//i.test(link.trim())) {
      setError("Paste a Google Flights share link, or leave it blank.");
      return;
    }
    const base: Trip = trip ?? {
      id: `trip-${place.id}-${Date.now()}`,
      placeId: place.id,
      season: state.season,
      start: out,
      end: back,
      note: "",
      friendNetids: fs.crew,
    };
    const friendNetids = Array.from(new Set([...base.friendNetids, ...fs.crew]));
    const groupFlight: GroupFlight = {
      outbound: { ...outLeg, flight: outNo, from: outLeg.from.toUpperCase(), to: outLeg.to.toUpperCase() },
      ret: retNo ? { ...retLeg, flight: retNo, from: retLeg.from.toUpperCase(), to: retLeg.to.toUpperCase() } : null,
      link: link.trim(),
      setBy: SELF,
      booked: [],
      setAt: new Date().toISOString(),
    };
    dispatch({ type: "saveTrip", trip: { ...base, start: outLeg.date, end: retNo ? retLeg.date : base.end, friendNetids, groupFlight }, message: `Locked ${outNo} for the group` });
    setEditing(false);
    setError("");
  }

  if (g && trip && !editing) {
    const people = travelersOf(trip);
    const done = people.filter((id) => g.booked.includes(id));
    return (
      <div className="fl-card fl-group">
        <h3>Group flight</h3>
        <p className="fl-muted fl-small">Everyone books these exact flights. Set by {nameOf(g.setBy)}.</p>
        {[g.outbound, g.ret].filter((leg): leg is FlightLeg => Boolean(leg)).map((leg, i) => (
          <div key={i} className="fl-legcard">
            <div>
              <span className="field-label">{i === 0 ? "Out" : "Back"}</span>
              <strong>{legLine(leg)}</strong>
            </div>
            <div className="fl-actions">
              <a className="textlink" href={googleExactFlight(leg.flight, leg.from, leg.to, leg.date)} target="_blank" rel="noreferrer">Find on Google Flights ↗</a>
              <a className="textlink" href={flightStatus(leg.flight, leg.date)} target="_blank" rel="noreferrer">Status ↗</a>
            </div>
          </div>
        ))}
        {g.link ? (
          <a className="primary fl-book" href={g.link} target="_blank" rel="noreferrer">Open the shared Google Flights link ↗</a>
        ) : null}
        <button
          type="button"
          className="fl-ghost"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(groupMessage(place, g));
              setCopied(true);
              window.setTimeout(() => setCopied(false), 2000);
            } catch {
              window.prompt("Copy this to your group chat:", groupMessage(place, g));
            }
          }}
        >
          {copied ? "Copied" : "Copy message for the group chat"}
        </button>
        <span className="field-label">Booked? {done.length}/{people.length}</span>
        <ul className="fl-booked">
          {people.map((id) => (
            <li key={id}>
              <label className="check">
                <input
                  type="checkbox"
                  checked={g.booked.includes(id)}
                  onChange={(e) => {
                    const booked = e.target.checked ? [...g.booked, id] : g.booked.filter((x) => x !== id);
                    dispatch({ type: "saveTrip", trip: { ...trip, groupFlight: { ...g, booked } }, message: e.target.checked ? `${nameOf(id)} booked` : "Unmarked" });
                  }}
                />
                {nameOf(id)}
              </label>
            </li>
          ))}
        </ul>
        {done.length < people.length ? <p className="fl-muted fl-small">Waiting on {people.filter((id) => !g.booked.includes(id)).map(nameOf).join(", ")}.</p> : <p className="fl-ok">Everyone's on the same flight.</p>}
        <button
          type="button"
          className="textlink"
          onClick={() => {
            if (g.booked.length && !window.confirm("Changing the flight clears everyone's booked status. Continue?")) return;
            setEditing(true);
          }}
        >
          Change flight
        </button>
      </div>
    );
  }

  const legFields = (leg: typeof outLeg, set: (l: typeof outLeg) => void, label: string) => (
    <fieldset className="fl-legform">
      <legend>{label}</legend>
      <div className="fl-legrow">
        <label>
          Flight
          <input value={leg.flight} placeholder="B6 1503" onChange={(e) => set({ ...leg, flight: e.target.value })} />
        </label>
        <label>
          From
          <input value={leg.from} maxLength={3} onChange={(e) => set({ ...leg, from: e.target.value.toUpperCase() })} />
        </label>
        <label>
          To
          <input value={leg.to} maxLength={3} onChange={(e) => set({ ...leg, to: e.target.value.toUpperCase() })} />
        </label>
      </div>
      <div className="fl-legrow">
        <label>
          Date
          <input type="date" value={leg.date} onChange={(e) => set({ ...leg, date: e.target.value })} />
        </label>
        <label>
          Departs
          <input type="time" value={leg.time} onChange={(e) => set({ ...leg, time: e.target.value })} />
        </label>
      </div>
    </fieldset>
  );

  return (
    <div className="fl-card fl-group">
      <h3>Lock the group flight</h3>
      <p className="fl-muted fl-small">
        Once someone picks a flight on Google Flights, enter its flight numbers here. They're saved on your {place.name} trip with a message to send the group and a booked checklist, so nobody ends up on a different flight.
      </p>
      {legFields(outLeg, setOutLeg, "Out")}
      {legFields(retLeg, setRetLeg, "Back (optional)")}
      <label className="fl-field">
        <span className="field-label">Google Flights share link (optional)</span>
        <input value={link} placeholder="https://www.google.com/travel/flights/s/…" onChange={(e) => setLink(e.target.value)} />
      </label>
      {error ? <p className="form-error">{error}</p> : null}
      <div className="fl-actions">
        <button type="button" className="primary" onClick={save}>
          {trip ? "Lock flight on trip" : "Save trip and lock flight"}
        </button>
        {editing ? (
          <button type="button" className="textlink" onClick={() => setEditing(false)}>
            Cancel
          </button>
        ) : null}
      </div>
    </div>
  );
}

function TipsCard({ domestic }: { domestic: boolean }) {
  return (
    <div className="fl-card">
      <h3>Booking on Google Flights</h3>
      <ul className="fl-tips">
        <li>Set the number of travelers before you compare, so the price shown is for the whole group.</li>
        <li>Use <b>Date grid</b> and <b>Price graph</b> to find cheaper days around your break.</li>
        <li>Turn on <b>Track prices</b> for an email when the fare moves.</li>
        <li>{domestic ? "For domestic trips, book a few weeks to a couple of months out, earlier for Thanksgiving and spring break." : "For international trips, start looking a few months out, earlier for peak summer and winter break."}</li>
        <li>One person picks the flight, the group locks it here, then everyone books it themselves.</li>
      </ul>
    </div>
  );
}
