import { useMemo, useState } from "react";
import { PLACE_BY_ID, PLACES } from "../data";
import { account, useMe } from "../account/account";
import { PROGRAMS } from "../abroad/data";
import { flightStore, useFlights } from "../flights/flightStore";
import { formatRange, seasonLabel } from "../logic";
import { AUTHOR_KEY, COLLEGES, SignInBox } from "../reviews/ReviewSection";
import { reviews as reviewApi, useReviewStore } from "../reviews/store";
import { useFriends, useTripTable } from "../store";
import type { ProfileTab, Trip } from "../types";
import { initials } from "./ProfileMenu";
import { FeedbackDialog, Moderation, useIsAdmin } from "../admin/admin";
import { countryOf, isPast, seasonFor } from "./trips";

const TABS: { id: ProfileTab; label: string }[] = [
  { id: "history", label: "Trip history" },
  { id: "bucket", label: "Bucket list" },
  { id: "reviews", label: "My reviews" },
  { id: "settings", label: "Settings" },
];

export function ProfileView() {
  const { state, dispatch } = useTripTable();
  const { reviews, session, shared } = useReviewStore();
  const past = state.trips.filter(isPast).sort((a, b) => b.start.localeCompare(a.start));
  const countries = new Set(past.map(countryOf).filter(Boolean));
  const mine = session ? reviews.filter((r) => r.userId === session.userId) : [];
  const me = useMe();
  const admin = useIsAdmin();
  const tabs = admin ? [...TABS, { id: "moderation" as ProfileTab, label: "Moderation" }] : TABS;

  return (
    <div className="pf-page">
      <header className="pf-head">
        <span className="pf-avatar xl">{me.signedIn ? initials(me.name) : "?"}</span>
        <div>
          <h2>{me.name}</h2>
          <p className="fine">
            {me.signedIn
              ? [me.email, me.college, me.classYear ? `Class of ${me.classYear}` : ""].filter(Boolean).join(" · ")
              : shared
                ? "Guest. Sign in with your Yale account to save trips across devices and add friends."
                : "Guest. Everything is saved in this browser."}
          </p>
        </div>
        <dl className="pf-stats">
          <div>
            <dt>Trips taken</dt>
            <dd>{past.length}</dd>
          </div>
          <div>
            <dt>Countries</dt>
            <dd>{countries.size}</dd>
          </div>
          <div>
            <dt>Bucket list</dt>
            <dd>{state.bucket.filter((b) => !b.done).length}</dd>
          </div>
          <div>
            <dt>Reviews</dt>
            <dd>{mine.length}</dd>
          </div>
        </dl>
      </header>
      <nav className="tabs pf-tabs" role="tablist">
        {tabs.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={state.profileTab === t.id} className={state.profileTab === t.id ? "tab active" : "tab"} onClick={() => dispatch({ type: "openProfile", tab: t.id })}>
            {t.label}
          </button>
        ))}
      </nav>
      {state.profileTab === "history" ? <History past={past} /> : null}
      {state.profileTab === "bucket" ? <Bucket /> : null}
      {state.profileTab === "reviews" ? <MyReviews /> : null}
      {state.profileTab === "settings" ? <Settings /> : null}
      {state.profileTab === "moderation" && admin ? <Moderation /> : null}
    </div>
  );
}

function History({ past }: { past: Trip[] }) {
  const { dispatch } = useTripTable();
  const friends = useFriends();
  const [adding, setAdding] = useState(false);
  return (
    <section className="pf-section">
      <div className="pf-row">
        <p className="fine">Trips whose dates have passed land here. Review the places you went so the next Yalie knows what to expect.</p>
        <button type="button" className="primary" onClick={() => setAdding((v) => !v)}>
          {adding ? "Close" : "Log a past trip"}
        </button>
      </div>
      {adding ? <LogTrip onDone={() => setAdding(false)} /> : null}
      {past.length === 0 && !adding ? <p className="empty">No past trips yet. Log one, or come back after your next break.</p> : null}
      <ul className="pf-list">
        {past.map((trip) => {
          const place = PLACE_BY_ID.get(trip.placeId);
          if (!place) return null;
          const names = trip.friendNetids.map((id) => friends.find((f) => f.netid === id)?.name).filter(Boolean);
          return (
            <li key={trip.id}>
              <div>
                <strong>{place.name}</strong>
                <span className="fine">
                  {seasonLabel(trip.season)} · {formatRange(trip.start, trip.end)}
                  {names.length ? ` · with ${names.join(", ")}` : ""}
                </span>
                {trip.note ? <span className="fine">{trip.note}</span> : null}
              </div>
              <div className="plan-actions">
                <button
                  type="button"
                  className="primary"
                  onClick={() => {
                    dispatch({ type: "setSeason", season: trip.season });
                    dispatch({ type: "setView", view: "map" });
                    dispatch({ type: "select", id: place.id });
                  }}
                >
                  Review it
                </button>
                <button className="textlink danger" type="button" onClick={() => dispatch({ type: "removeTrip", id: trip.id })}>
                  Remove
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function LogTrip({ onDone }: { onDone: () => void }) {
  const { dispatch } = useTripTable();
  const friends = useFriends();
  const [query, setQuery] = useState("");
  const [placeId, setPlaceId] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [note, setNote] = useState("");
  const [with_, setWith] = useState<string[]>([]);
  const [error, setError] = useState("");
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || PLACE_BY_ID.get(placeId)?.name === query) return [];
    return PLACES.filter((p) => p.id !== "us" && (p.name.toLowerCase().includes(q) || p.aliases.some((a) => a.includes(q)))).slice(0, 6);
  }, [query, placeId]);

  return (
    <form
      className="pf-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (!PLACE_BY_ID.has(placeId)) return setError("Pick a place from the list.");
        if (!start || !end || end < start) return setError("Add when you went. The end date can't be before the start.");
        if (end >= new Date().toISOString().slice(0, 10)) return setError("That trip hasn't ended yet. Plan upcoming trips from the map instead.");
        dispatch({
          type: "saveTrip",
          message: "Added to your trip history",
          trip: { id: `trip-${placeId}-${start}-${Date.now()}`, placeId, season: seasonFor(start), start, end, note: note.trim(), friendNetids: with_ },
        });
        onDone();
      }}
    >
      <label className="pf-place">
        Where
        <input
          value={query}
          placeholder="Lisbon, Puerto Rico, Montreal…"
          onChange={(e) => {
            setQuery(e.target.value);
            setPlaceId("");
            setError("");
          }}
        />
        {matches.length ? (
          <ul className="fl-drop">
            {matches.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => {
                    setPlaceId(p.id);
                    setQuery(p.name);
                  }}
                >
                  <span>{p.name}</span>
                  <span className="fl-muted">{p.kind === "country" ? "Country" : p.region}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </label>
      <div className="pf-dates">
        <label>
          From
          <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        </label>
        <label>
          To
          <input type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} />
        </label>
      </div>
      {friends.length ? (
        <fieldset>
          <legend>Who came</legend>
          <div className="chips">
            {friends.map((f) => (
              <button
                key={f.netid}
                type="button"
                className={with_.includes(f.netid) ? "fl-chip on" : "fl-chip"}
                onClick={() => setWith((w) => (w.includes(f.netid) ? w.filter((x) => x !== f.netid) : [...w, f.netid]))}
              >
                {f.name.split(" ")[0]}
              </button>
            ))}
          </div>
        </fieldset>
      ) : null}
      <label>
        Note (optional)
        <input value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} placeholder="Where you stayed, the highlight" />
      </label>
      {error ? <p className="form-error">{error}</p> : null}
      <div className="plan-actions">
        <button type="submit" className="primary">
          Add trip
        </button>
      </div>
    </form>
  );
}

function Bucket() {
  const { state, dispatch } = useTripTable();
  const [query, setQuery] = useState("");
  const options = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const places = PLACES.filter((p) => p.id !== "us" && p.name.toLowerCase().includes(q))
      .slice(0, 5)
      .map((p) => ({ kind: "place" as const, id: p.id, name: p.name, sub: p.kind === "country" ? "Place" : p.region }));
    const programs = PROGRAMS.filter((p) => `${p.name} ${p.city} ${p.country}`.toLowerCase().includes(q))
      .slice(0, 5)
      .map((p) => ({ kind: "program" as const, id: p.id, name: p.name, sub: `Study abroad · ${p.city}` }));
    return [...places, ...programs];
  }, [query]);

  const items = [...state.bucket].sort((a, b) => Number(a.done) - Number(b.done) || b.addedAt.localeCompare(a.addedAt));
  return (
    <section className="pf-section">
      <p className="fine">Places to travel and programs to study on. Add from here, or tap ☆ on any place or program.</p>
      <label className="pf-place">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Add a place or study abroad program" aria-label="Add to bucket list" />
        {options.length ? (
          <ul className="fl-drop">
            {options.map((o) => (
              <li key={`${o.kind}-${o.id}`}>
                <button
                  type="button"
                  onClick={() => {
                    if (!state.bucket.some((b) => b.kind === o.kind && b.targetId === o.id)) dispatch({ type: "toggleBucket", kind: o.kind, targetId: o.id, label: o.name });
                    setQuery("");
                  }}
                >
                  <span>{o.name}</span>
                  <span className="fl-muted">{o.sub}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </label>
      {items.length === 0 ? <p className="empty">Your bucket list is empty.</p> : null}
      <ul className="pf-list">
        {items.map((b) => {
          const place = b.kind === "place" ? PLACE_BY_ID.get(b.targetId) : null;
          const program = b.kind === "program" ? PROGRAMS.find((p) => p.id === b.targetId) : null;
          const name = place?.name ?? program?.name;
          if (!name) return null;
          return (
            <li key={b.id} className={b.done ? "done" : ""}>
              <label className="check">
                <input type="checkbox" checked={b.done} onChange={(e) => dispatch({ type: "setBucketDone", id: b.id, done: e.target.checked })} />
                <span>
                  <strong>{name}</strong>
                  <span className="fine">{program ? `Study abroad · ${program.city}, ${program.country}` : place?.region}</span>
                </span>
              </label>
              <div className="plan-actions">
                <button
                  type="button"
                  onClick={() => {
                    if (place) {
                      dispatch({ type: "setView", view: "map" });
                      dispatch({ type: "select", id: place.id });
                    } else if (program) dispatch({ type: "openProgram", id: program.id });
                  }}
                >
                  Open
                </button>
                {place ? (
                  <button
                    type="button"
                    onClick={() => {
                      flightStore.set({ destId: place.id, out: null, back: null });
                      dispatch({ type: "setView", view: "flights" });
                    }}
                  >
                    Plan it
                  </button>
                ) : null}
                <button className="textlink danger" type="button" onClick={() => dispatch({ type: "toggleBucket", kind: b.kind, targetId: b.targetId })}>
                  Remove
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function MyReviews() {
  const { dispatch } = useTripTable();
  const { reviews, session } = useReviewStore();
  if (!session) {
    return (
      <section className="pf-section">
        <p className="fine">Sign in with your Yale email to see and manage your reviews.</p>
        <SignInBox />
      </section>
    );
  }
  const mine = reviews.filter((r) => r.userId === session.userId);
  return (
    <section className="pf-section">
      {mine.length === 0 ? <p className="empty">You haven't written any reviews yet. Open a place or program you've been to and leave one.</p> : null}
      <ul className="pf-list">
        {mine.map((r) => {
          const name = r.targetType === "place" ? PLACE_BY_ID.get(r.targetId)?.name : PROGRAMS.find((p) => p.id === r.targetId)?.name;
          return (
            <li key={r.id}>
              <div>
                <strong>{name ?? r.targetId}</strong>
                <span className="fine">
                  {r.term} {r.year} · overall {r.ratings.overall ?? "—"}/5
                </span>
                <span className="pf-body">{r.body.trim() ? r.body : "Rating only (no written review)"}</span>
              </div>
              <div className="plan-actions">
                <button
                  type="button"
                  onClick={() => {
                    if (r.targetType === "place") {
                      dispatch({ type: "setView", view: "map" });
                      dispatch({ type: "select", id: r.targetId });
                    } else dispatch({ type: "openProgram", id: r.targetId });
                  }}
                >
                  Open
                </button>
                <button className="textlink danger" type="button" onClick={() => void reviewApi.remove(r.id)}>
                  Delete
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Settings() {
  const { state, dispatch } = useTripTable();
  const { shared } = useReviewStore();
  const me = useMe();
  const [feedback, setFeedback] = useState(false);
  const fs = useFlights();
  const saved = (() => {
    try {
      return JSON.parse(localStorage.getItem(AUTHOR_KEY) ?? "{}") as { college?: string; classYear?: string };
    } catch {
      return {};
    }
  })();
  const [name, setName] = useState(me.signedIn ? me.name : "");
  const [college, setCollege] = useState(me.college || saved.college || COLLEGES[0]);
  const [classYear, setClassYear] = useState(me.classYear || saved.classYear || String(new Date().getFullYear() + 2));

  function exportData() {
    const data = { exportedAt: new Date().toISOString(), trips: state.trips, bucket: state.bucket, friends: account.get().friends.map((f) => f.name) };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "triptable-data.json";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <section className="pf-section pf-settings">
      <div className="pf-card">
        <h3>Account</h3>
        {shared ? <SignInBox /> : <p className="fine">Accounts turn on once the site's database is connected. Until then everything is saved in this browser.</p>}
      </div>
      {me.signedIn ? (
      <div className="pf-card">
        <h3>Your profile</h3>
        <p className="fine">
          {me.signedIn ? "Friends see your name, college and class year. " : ""}Reviews are always anonymous and never show any of this.
        </p>
        {me.signedIn ? (
          <label className="pf-name">
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
          </label>
        ) : null}
        <div className="pf-dates">
          <label>
            College
            <select value={college} onChange={(e) => setCollege(e.target.value)}>
              {COLLEGES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            Class of
            <select value={classYear} onChange={(e) => setClassYear(e.target.value)}>
              {Array.from({ length: 10 }, (_, i) => String(new Date().getFullYear() + 4 - i)).map((y) => (
                <option key={y}>{y}</option>
              ))}
            </select>
          </label>
        </div>
        <button
          type="button"
          className="primary"
          onClick={async () => {
            localStorage.setItem(AUTHOR_KEY, JSON.stringify({ college, classYear }));
            const err = me.signedIn ? await account.updateProfile({ full_name: name.trim(), college, class_year: classYear }) : null;
            dispatch({ type: "toast", message: err ? `Couldn't save: ${err}` : "Saved" });
          }}
        >
          Save
        </button>
      </div>
      ) : null}
      <div className="pf-card">
        <h3>Preferences</h3>
        <label className="check">
          <input type="checkbox" checked={state.theme === "dark"} onChange={(e) => dispatch({ type: "setTheme", theme: e.target.checked ? "dark" : "light" })} /> Dark mode
        </label>
        <label className="check">
          <input type="checkbox" checked={fs.boycottAvelo} onChange={(e) => flightStore.set({ boycottAvelo: e.target.checked })} /> Boycott Avelo (hide Tweed in Flights)
        </label>
        <label className="check">
          <input type="checkbox" checked={state.showFriends} onChange={() => dispatch({ type: "toggleFriends" })} /> Show friends on the map
        </label>
      </div>
      <div className="pf-card">
        <h3>Help us fix things</h3>
        <p className="fine">Found a bug, have an idea, or spotted wrong info? It goes straight to the team.</p>
        <div className="plan-actions">
          <button className="primary" type="button" onClick={() => setFeedback(true)}>
            Send feedback
          </button>
        </div>
        {feedback ? <FeedbackDialog onClose={() => setFeedback(false)} /> : null}
      </div>
      <div className="pf-card">
        <h3>Your data</h3>
        <div className="plan-actions">
          <button type="button" onClick={exportData}>
            Download my trips and bucket list
          </button>
          <button
            type="button"
            className="textlink danger"
            onClick={() => {
              if (window.confirm("Reset trips, bucket list and settings on this device?")) dispatch({ type: "reset" });
            }}
          >
            Reset this device
          </button>
        </div>
      </div>
    </section>
  );
}
