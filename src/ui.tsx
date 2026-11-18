import { useEffect, useState } from "react";
import { FindFlightsButton, GroupFlightSummary } from "./flights/FlightsView";
import { PLACE_BY_ID, PLACES } from "./data";
import { account, displayName, useAccount, useMe } from "./account/account";
import { SignInBox } from "./reviews/ReviewSection";
import {
  continentsOf,
  CONTINENTS,
  FEATURES,
  filtersAreDefault,
  formatMoney,
  formatRange,
  friendsAtPlace,
  parseISODate,
  ratingBand,
  scoreOf,
  seasonLabel,
  travelGuidance,
  visitCount,
  defaultWindow,
  SEASONS,
} from "./logic";
import { DEFAULT_FILTERS, useCatalog, useFriends, useTripTable } from "./store";
import type { Place, Season, SortKey } from "./types";
import { ReviewSection } from "./reviews/ReviewSection";
import { PLACE_KEYS, reviews as reviewStore, useReviewStore } from "./reviews/store";

function reviewCount(id: string): number {
  return reviewStore.get().reviews.filter((r) => r.targetType === "place" && r.targetId === id).length;
}
import { seasonYear, useOverlap, usePlans } from "./live/plans";
import { BucketButton } from "./profile/ProfileMenu";
import { isPast, isUpcoming } from "./profile/trips";

export function Rating({ value }: { value: number | null }) {
  if (value === null) return <span className="rate none" title="No reviews yet">—</span>;
  return <span className={`rate ${ratingBand(value)}`}>{value.toFixed(1)}</span>;
}

const fmt = (value: number | null) => (value === null ? "—" : value.toFixed(1));

function Slider({
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (value: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <label className="slider">
      <span className="slider-top">
        <span>{label}</span>
        <span className="slider-value">{display}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        aria-valuetext={display}
        style={{ ["--pct" as string]: `${pct}%` }}
        onChange={(event) => onChange(Math.round(Number(event.target.value) * 10) / 10)}
      />
    </label>
  );
}

function thresholdLabel(value: number): string {
  return value <= 1 ? "Any" : `≥ ${value.toFixed(1)}`;
}

function toggleValue(current: string[], value: string): string[] {
  return current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
}

export function TravelLinks({ name }: { name: string }) {
  const flights = `https://www.google.com/travel/flights?q=${encodeURIComponent(`Flights to ${name}`)}`;
  return (
    <p className="travel-links">
      <a href={flights} target="_blank" rel="noreferrer">
        Book travel
      </a>
      <a href="https://www.yideshare.com/" target="_blank" rel="noreferrer">
        YiDeShare rides
      </a>
    </p>
  );
}

function activeCount(f: typeof DEFAULT_FILTERS): number {
  return (
    Number(f.overall > 1) + Number(f.affordability > 1) + Number(f.safety > 1) + Number(f.beauty > 1) + Number(f.minYalies > 0) + f.features.length + f.continents.length
  );
}

export function FilterRail({ open, onPick }: { open: boolean; onPick: () => void }) {
  const { state, dispatch } = useTripTable();
  const { rows } = useCatalog();
  const filters = state.filters;
  return (
    <aside className={open ? "rail open" : "rail"}>
      <div className="rail-head">
        <p className="lede">Where Yalies are going, counted from students' saved trips. Names stay private.</p>
        <div className="seg" role="tablist" aria-label="Map scope">
          {(
            [
              ["all", "All"],
              ["countries", "Countries"],
              ["us", "U.S."],
            ] as const
          )
            .map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={filters.scope === id}
              aria-label={id === "us" ? "United States" : label}
              className={filters.scope === id ? "active" : ""}
              onClick={() => {
                dispatch({ type: "patchFilters", patch: { scope: id } });
                if (id === "us") dispatch({ type: "select", id: "us" });
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="sort-row">
          <span>{rows.length} places</span>
          <select
            aria-label="Sort places"
            value={state.sort}
            onChange={(event) => dispatch({ type: "setSort", sort: event.target.value as typeof state.sort })}
          >
            <option value="yalies">Most plans</option>
            <option value="overall">Overall</option>
            <option value="affordability">Affordability</option>
            <option value="safety">Safety</option>
            <option value="beauty">Beauty</option>
          </select>
        </div>
      </div>
      <details className="filters-drawer" open>
        <summary>
          Filters
          {activeCount(filters) ? <span className="badge">{activeCount(filters)}</span> : null}
        </summary>
      <div className="filters">
        <Slider label="Overall" min={1} max={5} step={0.1} value={filters.overall} display={thresholdLabel(filters.overall)} onChange={(value) => dispatch({ type: "patchFilters", patch: { overall: value } })} />
        <Slider label="Affordability" min={1} max={5} step={0.1} value={filters.affordability} display={thresholdLabel(filters.affordability)} onChange={(value) => dispatch({ type: "patchFilters", patch: { affordability: value } })} />
        <Slider label="Safety" min={1} max={5} step={0.1} value={filters.safety} display={thresholdLabel(filters.safety)} onChange={(value) => dispatch({ type: "patchFilters", patch: { safety: value } })} />
        <Slider label="Beauty" min={1} max={5} step={0.1} value={filters.beauty} display={thresholdLabel(filters.beauty)} onChange={(value) => dispatch({ type: "patchFilters", patch: { beauty: value } })} />
        <Slider
          label="Minimum plans"
          min={0}
          max={50}
          step={1}
          value={filters.minYalies}
          display={filters.minYalies === 0 ? "Any" : `≥ ${filters.minYalies}`}
          onChange={(value) => dispatch({ type: "patchFilters", patch: { minYalies: value } })}
        />
        <p className="field-label">Features</p>
        <div className="choice-row">
          {FEATURES.map((feature) => (
            <button
              key={feature.id}
              type="button"
              className={filters.features.includes(feature.id) ? "on" : ""}
              onClick={() => dispatch({ type: "patchFilters", patch: { features: toggleValue(filters.features, feature.id) } })}
            >
              {feature.label}
            </button>
          ))}
        </div>
        <p className="field-label">Continent</p>
        <div className="choice-row">
          {CONTINENTS.map((name) => (
            <button
              key={name}
              type="button"
              className={filters.continents.includes(name) ? "on" : ""}
              onClick={() => dispatch({ type: "patchFilters", patch: { continents: toggleValue(filters.continents, name) } })}
            >
              {name}
            </button>
          ))}
        </div>
        <label className="check">
          <input type="checkbox" checked={state.showFriends} onChange={() => dispatch({ type: "toggleFriends" })} />
          Show friends on the map
        </label>
        <button
          className="textlink"
          type="button"
          disabled={filtersAreDefault(filters)}
          onClick={() => dispatch({ type: "patchFilters", patch: { ...DEFAULT_FILTERS, query: filters.query } })}
        >
          Reset filters
        </button>
        <p className="fine">Rating sliders hide places rated below the value. Ratings come only from student reviews.</p>
      </div>
      </details>
      <div className="list" role="listbox" aria-label="Places">
        {rows.length === 0 ? <p className="empty">Nothing clears these filters.</p> : null}
        {rows.map(({ place, count }) => {
          const parent = place.parentId ? PLACE_BY_ID.get(place.parentId) : undefined;
          return (
            <button
              key={place.id}
              type="button"
              role="option"
              aria-selected={state.selectedId === place.id}
              className={state.selectedId === place.id ? "row active" : "row"}
              onClick={() => {
                dispatch({ type: "select", id: place.id });
                onPick();
              }}
            >
              <span className="row-name">{place.name}</span>
              <Rating value={scoreOf(place.id, "overall")} />
              <span className="row-meta">
                {count ? `${count.toLocaleString("en-US")} planning` : "No plans yet"} · {parent ? parent.name : place.region}
              </span>
              {scoreOf(place.id, "overall") !== null ? (
                <span className="row-scores">
                  Afford {fmt(scoreOf(place.id, "affordability"))} · Safety {fmt(scoreOf(place.id, "safety"))} · Beauty {fmt(scoreOf(place.id, "beauty"))}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </aside>
  );
}

export function PlacePanel({ place }: { place: Place }) {
  const { state, dispatch } = useTripTable();
  const friends = useFriends();
  const { passed } = useCatalog();
  const [tab, setTab] = useState<"evals" | "stays" | "history" | "plan">("evals");
  useEffect(() => {
    setTab("evals");
  }, [place.id]);

  const trip = state.trips.find((item) => item.placeId === place.id);
  const relevant = trip && trip.season === state.season ? trip : undefined;
  usePlans();
  const year = seasonYear(state.season);
  const overlapN = useOverlap(relevant ? place.id : null, relevant?.start, relevant?.end);
  const friendHits = friendsAtPlace(place.id, state.season, friends, relevant);
  const planning = visitCount(place, state.season, year);
  const lastYear = visitCount(place, state.season, year - 1);
  const children = PLACES.filter((child) => child.parentId === place.id).sort(
    (a, b) =>
      visitCount(b, state.season) - visitCount(a, state.season) ||
      reviewCount(b.id) - reviewCount(a.id) ||
      a.name.localeCompare(b.name),
  );
  const parent = place.parentId ? PLACE_BY_ID.get(place.parentId) : undefined;

  return (
    <aside className="panel" aria-labelledby="place-title">
      <div className="panel-scroll">
        <div className="panel-head">
          <div>
            {parent ? (
              <button className="textlink back-link" type="button" onClick={() => dispatch({ type: "select", id: parent.id })}>
                ← {parent.name}
              </button>
            ) : null}
            <p className="kicker">
              {place.kind === "country" ? "Country" : "City / destination"} · {place.region}
              {!passed.has(place.id) ? " · Hidden by filters" : ""}
            </p>
            <h2 id="place-title">{place.name}</h2>
          </div>
          <button className="icon-btn" type="button" aria-label="Close place" onClick={() => dispatch({ type: "select", id: null })}>
            ×
          </button>
        </div>
        <p className="blurb">{place.blurb}</p>
        <FindFlightsButton placeId={place.id} />
        <BucketButton kind="place" targetId={place.id} label={place.name} />
        <GuidanceNote iso={place.iso} />
        {children.length > 0 ? (
          <section className="inside-wrap">
            <h3>{place.iso === "US" ? "Cities and destinations in the U.S." : `Cities and destinations in ${place.name}`}</h3>
            <p className="fine">Pick one to read and leave reviews for that specific place.</p>
            <ul className="inside">
              {children.map((child) => (
                <li key={child.id}>
                  <button type="button" onClick={() => dispatch({ type: "select", id: child.id })}>
                    <span>{child.name}</span>
                    <span>
                      {visitCount(child, state.season) ? `${visitCount(child, state.season).toLocaleString("en-US")} planning` : child.blurb.length > 46 ? `${child.blurb.slice(0, 44)}…` : child.blurb}
                      {reviewCount(child.id) ? ` · ${reviewCount(child.id)} ${reviewCount(child.id) === 1 ? "review" : "reviews"}` : ""}
                    </span>
                    <Rating value={scoreOf(child.id, "overall")} />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        <p className="fine">{continentsOf(place).join(" and ")}</p>
        <ul className="tags">
          {place.atlas ? <li className="tag atlas-tag">Micro</li> : null}
          {place.tags.map((tag) => (
            <li key={tag} className="tag">
              {tag}
            </li>
          ))}
        </ul>
        <div className="scoregrid">
          {(
            [
              ["Overall", scoreOf(place.id, "overall")],
              ["Afford", scoreOf(place.id, "affordability")],
              ["Safety", scoreOf(place.id, "safety")],
              ["Beauty", scoreOf(place.id, "beauty")],
            ] as const
          ).map(([label, value]) => (
            <div key={label}>
              <Rating value={value} />
              <span>{label}</span>
            </div>
          ))}
        </div>
        <div className="stats">
          <div>
            <b>{planning.toLocaleString("en-US")}</b>
            <span>
              planning {seasonLabel(state.season)} {year}
            </span>
            <small>{lastYear ? `${lastYear.toLocaleString("en-US")} in ${year - 1}` : "from students' saved trips"}</small>
          </div>
          <div>
            <b>{relevant ? (overlapN ?? "…") : "—"}</b>
            <span>{relevant ? "overlap your dates" : "overlap your dates"}</span>
            <small>{relevant ? "other students, names hidden" : "save your dates to see"}</small>
          </div>
          <div>
            <b>{friendHits.length}</b>
            <span>{friendHits.length === 1 ? "friend going" : "friends going"}</span>
            <small>{friendHits.length ? "only friends you added" : "add friends to see names"}</small>
          </div>
        </div>
        {place.atlas ? <p className="atlas">{place.atlas}</p> : null}
        {place.guide.split("\n\n").map((paragraph) => (
          <p key={paragraph} className="guide">
            {paragraph}
          </p>
        ))}
        {friendHits.length > 0 ? (
          <ul className="friend-hits">
            {friendHits.map((hit) => (
              <li key={`${hit.person.netid}-${hit.trip.start}`}>
                <strong>{hit.person.name}</strong>
                <span>
                  {formatRange(hit.trip.start, hit.trip.end)}
                  {hit.overlapsYou ? " · overlaps you" : ""}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="tabs" role="tablist">
          {(
            [
              ["evals", "Reviews"],
              ["stays", "Stays"],
              ["history", "History"],
              ["plan", trip ? "Your plan" : "Plan"],
            ] as const
          ).map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? "tab active" : "tab"} onClick={() => setTab(id)}>
              {label}
            </button>
          ))}
        </div>
        {tab === "evals" ? (
          <ReviewSection
            targetType="place"
            targetId={place.id}
            keys={PLACE_KEYS}
            terms={SEASONS.map((item) => item.label)}
            prompt="Where you stayed, what it cost, how safe it felt, what you'd tell a friend going next"
          />
        ) : null}
        {tab === "stays" ? (
          <>
          {place.stays.length ? (
            <p className="fine">Places to start looking. Prices are rough estimates, not quotes, and these aren't student reviews.</p>
          ) : (
            <p className="fine">
              No stays listed yet.{" "}
              <a href={`https://www.google.com/maps/search/${encodeURIComponent(`hotels in ${place.name}`)}`} target="_blank" rel="noreferrer">
                Search hotels near {place.name} ↗
              </a>{" "}
              and tell others where you stayed in your review.
            </p>
          )}
          <ul className="stays">
            {place.stays.map((stay) => (
              <li key={stay.name}>
                <div className="stay-top">
                  <strong>{stay.name}</strong>
                </div>
                <div className="stay-meta">
                  {stay.area} · {stay.nightly === 0 ? "Free" : `${formatMoney(stay.nightly)} / night`}
                </div>
              </li>
            ))}
          </ul>
          </>
        ) : null}
        {tab === "history" ? <HistoryChart place={place} season={state.season} /> : null}
        {tab === "plan" ? <PlanForm place={place} /> : null}
      </div>
    </aside>
  );
}

function HistoryChart({ place, season }: { place: Place; season: Season }) {
  usePlans();
  const now = seasonYear(season);
  const rows = [now - 3, now - 2, now - 1, now].map((y) => ({ year: y, count: visitCount(place, season, y) }));
  const max = Math.max(1, ...rows.map((row) => row.count));
  const empty = rows.every((r) => r.count === 0);
  return (
    <div className="history">
      <p className="fine">
        Yale students who saved a {seasonLabel(season)} trip here while signed in. {now} is plans so far.
      </p>
      {empty ? <p className="empty">No trips logged here yet. Plan yours to be the first.</p> : null}
      {rows.map((row) => (
        <div className="bar-row" key={row.year}>
          <span>
            {row.year}
            {row.year === now ? " plans" : ""}
          </span>
          <span className="bar">
            <span style={{ width: `${(row.count / max) * 100}%` }} />
          </span>
          <span className="bar-n">{row.count.toLocaleString("en-US")}</span>
        </div>
      ))}
    </div>
  );
}

function PlanForm({ place, onDone }: { place: Place; onDone?: () => void }) {
  const { state, dispatch } = useTripTable();
  const friends = useFriends();
  const existing = state.trips.find((trip) => trip.placeId === place.id);
  const initialSeason = existing?.season ?? state.season;
  const initialWindow = defaultWindow(initialSeason);
  const [season, setSeason] = useState<Season>(initialSeason);
  const [start, setStart] = useState(existing?.start ?? initialWindow[0]);
  const [end, setEnd] = useState(existing?.end ?? initialWindow[1]);
  const [note, setNote] = useState(existing?.note ?? "");
  const [withIds, setWithIds] = useState<string[]>(existing?.friendNetids ?? []);

  useEffect(() => {
    const nextSeason = existing?.season ?? state.season;
    const win = defaultWindow(nextSeason);
    setSeason(nextSeason);
    setStart(existing?.start ?? win[0]);
    setEnd(existing?.end ?? win[1]);
    setNote(existing?.note ?? "");
    setWithIds(existing?.friendNetids ?? []);
  }, [place.id, existing, state.season]);

  const invalid = parseISODate(end) < parseISODate(start);
  const blocked = travelGuidance(place.iso).level === "blocked";

  function useBreak() {
    const win = defaultWindow(season);
    setStart(win[0]);
    setEnd(win[1]);
  }

  return (
    <form
      className="plan"
      onSubmit={(event) => {
        event.preventDefault();
        if (invalid || blocked) return;
        dispatch({
          type: "saveTrip",
          trip: {
            id: existing?.id ?? `trip-${place.id}`,
            placeId: place.id,
            season,
            start,
            end,
            note,
            friendNetids: withIds,
          },
        });
        onDone?.();
      }}
    >
      <label>
        Season
        <select value={season} onChange={(event) => setSeason(event.target.value as Season)}>
          {SEASONS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      <div className="date-row">
        <label>
          Start
          <input type="date" value={start} onChange={(event) => setStart(event.target.value)} required />
        </label>
        <label>
          End
          <input type="date" value={end} onChange={(event) => setEnd(event.target.value)} required />
        </label>
      </div>
      <button className="textlink" type="button" onClick={useBreak}>
        Use the Yale break dates
      </button>
      {invalid ? <p className="form-error">End date is before the start date.</p> : null}
      {blocked ? <p className="form-error">Yale College will not sponsor undergraduate travel here.</p> : null}
      <label>
        Note
        <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} placeholder="Where you are staying, who has the reservation" />
      </label>
      <fieldset>
        <legend>Share with friends</legend>
        {friends.length === 0 ? <p className="fine">Add friends first. Their names show up here.</p> : null}
        {friends.map((person) => (
          <label key={person.netid} className="check">
            <input
              type="checkbox"
              checked={withIds.includes(person.netid)}
              onChange={() =>
                setWithIds((current) => (current.includes(person.netid) ? current.filter((id) => id !== person.netid) : [...current, person.netid]))
              }
            />
            {person.name}
            <span className="fine">
              {person.college} '{person.year.slice(2)}
            </span>
          </label>
        ))}
      </fieldset>
      <div className="plan-actions">
        <button className="primary" type="submit" disabled={invalid || blocked}>
          {existing ? "Update itinerary" : "Add to itinerary"}
        </button>
        {existing ? (
          <button className="textlink danger" type="button" onClick={() => dispatch({ type: "removeTrip", id: existing.id })}>
            Remove
          </button>
        ) : null}
      </div>
    </form>
  );
}

function GuidanceNote({ iso }: { iso: string }) {
  const guidance = travelGuidance(iso);
  return (
    <p className={`guidance ${guidance.level}`}>
      <strong>{guidance.title}.</strong> {guidance.detail}
    </p>
  );
}

export function EmptyPanel({ geo }: { geo: { iso: string; name: string } }) {
  const { dispatch } = useTripTable();
  return (
    <aside className="panel">
      <div className="panel-scroll">
        <div className="panel-head">
          <div>
            <p className="kicker">Country</p>
            <h2>{geo.name}</h2>
          </div>
          <button className="icon-btn" type="button" aria-label="Close place" onClick={() => dispatch({ type: "select", id: null })}>
            ×
          </button>
        </div>
        <GuidanceNote iso={geo.iso} />
        <p className="guide">No Yale trips are logged here yet. The public map only colors places students have rated.</p>
      </div>
    </aside>
  );
}

function yalieBand(count: number): "great" | "good" | "ok" | "low" {
  if (count >= 100) return "great";
  if (count >= 40) return "good";
  if (count >= 15) return "ok";
  return "low";
}

function SortHeader({ label, sort }: { label: string; sort: SortKey }) {
  const { state, dispatch } = useTripTable();
  const active = state.sort === sort;
  return (
    <th aria-sort={active ? (state.sortDir === "desc" ? "descending" : "ascending") : "none"}>
      <button className={active ? "sort-head active" : "sort-head"} type="button" onClick={() => dispatch({ type: "setSort", sort })}>
        {label}
        {active ? (state.sortDir === "desc" ? " ↓" : " ↑") : ""}
      </button>
    </th>
  );
}

export function CatalogView() {
  const { state, dispatch } = useTripTable();
  const { rows } = useCatalog();
  const [adding, setAdding] = useState<Place | null>(null);
  return (
    <div className="catalog">
      {rows.length === 0 ? <p className="empty">Nothing clears these filters.</p> : null}
      <table className="catalog-table">
        <thead>
          <tr>
            <th>Place</th>
            <SortHeader label="Plans" sort="yalies" />
            <SortHeader label="Overall" sort="overall" />
            <SortHeader label="Afford" sort="affordability" />
            <SortHeader label="Safety" sort="safety" />
            <SortHeader label="Beauty" sort="beauty" />
            <th>Yale rules</th>
            <th aria-label="Add" />
          </tr>
        </thead>
        <tbody>
          {rows.map(({ place, count }) => {
            const guidance = travelGuidance(place.iso);
            return (
              <tr key={place.id} className={state.selectedId === place.id ? "active" : ""} onClick={() => dispatch({ type: "select", id: place.id })}>
                <td>
                  <strong>{place.name}</strong>
                  <span className="fine">
                    {continentsOf(place).join(" · ")} · {place.kind === "country" ? "Country" : "Spot"}
                  </span>
                </td>
                <td className="num">
                  <span className={`rate ${yalieBand(count)}`}>{count.toLocaleString("en-US")}</span>
                </td>
                <td className="num">
                  <Rating value={scoreOf(place.id, "overall")} />
                </td>
                <td className="num">
                  <Rating value={scoreOf(place.id, "affordability")} />
                </td>
                <td className="num">
                  <Rating value={scoreOf(place.id, "safety")} />
                </td>
                <td className="num">
                  <Rating value={scoreOf(place.id, "beauty")} />
                </td>
                <td>{guidance.level === "blocked" ? "Not sponsored" : guidance.level === "regional" ? "Partial ban" : "Safe to travel"}</td>
                <td>
                  <button
                    className="plus"
                    type="button"
                    aria-label={`Add ${place.name} to itinerary`}
                    onClick={(event) => {
                      event.stopPropagation();
                      setAdding(place);
                    }}
                  >
                    +
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {adding ? (
        <div className="modal-back" onClick={() => setAdding(null)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="add-title" onClick={(event) => event.stopPropagation()}>
            <div className="panel-head">
              <h2 id="add-title">Add {adding.name}</h2>
              <button className="icon-btn" type="button" aria-label="Close" onClick={() => setAdding(null)}>
                ×
              </button>
            </div>
            <PlanForm place={adding} onDone={() => setAdding(null)} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function FriendsView() {
  const { state, dispatch } = useTripTable();
  const me = useMe();
  const { friends, requests } = useAccount();
  const [draft, setDraft] = useState("");
  const [msg, setMsg] = useState<{ kind: "error" | "ok"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const active = friends.find((person) => person.netid === state.friendFocus) ?? friends[0];
  const incoming = requests.filter((r) => r.incoming);
  const outgoing = requests.filter((r) => !r.incoming);

  if (!me.signedIn) {
    return (
      <div className="friends-page guest">
        <section className="friend-col">
          <h2>Friends</h2>
          <p className="fine">Sign in with your Yale account to add friends, see each other's trips and plan together. Everyone else only ever sees anonymous totals.</p>
          <SignInBox />
        </section>
      </div>
    );
  }

  async function add() {
    const q = draft.trim().toLowerCase();
    if (!q) return;
    if (q === me.email.toLowerCase()) return setMsg({ kind: "error", text: "That's you." });
    setBusy(true);
    const found = await account.find(q);
    if (!found) {
      setBusy(false);
      return setMsg({ kind: "error", text: "No TripTable account with that Yale email yet. Ask them to sign in once, then try again." });
    }
    const err = await account.request(found.id);
    setBusy(false);
    if (err) return setMsg({ kind: "error", text: err });
    setDraft("");
    setMsg({ kind: "ok", text: `Request sent to ${displayName(found)}.` });
  }

  return (
    <div className="friends-page">
      <section className="friend-col">
        <h2>Friends</h2>
        <p className="fine">Add friends by their Yale email. You'll see each other's saved trips; everyone else sees only totals.</p>
        <form
          className="add-friend"
          onSubmit={(event) => {
            event.preventDefault();
            void add();
          }}
        >
          <input
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              setMsg(null);
            }}
            placeholder="first.last@yale.edu"
            aria-label="Friend's Yale email"
          />
          <button className="primary" type="submit" disabled={busy}>
            Add
          </button>
        </form>
        {msg ? <p className={msg.kind === "error" ? "form-error" : "fine ok-line"}>{msg.text}</p> : null}

        {incoming.length ? (
          <div className="req-block">
            <p className="field-label">Requests for you</p>
            {incoming.map((r) => (
              <div key={r.id} className="req-row">
                <span>
                  <strong>{displayName(r.other)}</strong>
                  <small>{r.other.email}</small>
                </span>
                <span className="req-actions">
                  <button className="primary" type="button" onClick={() => void account.accept(r.id)}>
                    Accept
                  </button>
                  <button className="textlink" type="button" onClick={() => void account.removeRequest(r.id)}>
                    Decline
                  </button>
                </span>
              </div>
            ))}
          </div>
        ) : null}

        {friends.length ? (
          <ul className="friend-list">
            {friends.map((person) => (
              <li key={person.netid}>
                <button type="button" className={active?.netid === person.netid ? "active" : ""} onClick={() => dispatch({ type: "focusFriend", netid: person.netid })}>
                  <strong>{person.name}</strong>
                  <span>
                    {person.college}
                    {person.year ? ` '${person.year.slice(-2)}` : ""} · {person.trips.length} {person.trips.length === 1 ? "trip" : "trips"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty">No friends yet. Add someone by their Yale email above.</p>
        )}

        {outgoing.length ? (
          <div className="req-block">
            <p className="field-label">Waiting for them to accept</p>
            {outgoing.map((r) => (
              <div key={r.id} className="req-row">
                <span>
                  <strong>{displayName(r.other)}</strong>
                  <small>{r.other.email}</small>
                </span>
                <button className="textlink" type="button" onClick={() => void account.removeRequest(r.id)}>
                  Cancel
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </section>
      <section className="friend-detail">
        {active ? (
          <>
            <header>
              <div>
                <h2>{active.name}</h2>
                <p>
                  {active.college}
                  {active.year ? ` · Class of ${active.year}` : ""}
                </p>
              </div>
              <button
                className="textlink danger"
                type="button"
                onClick={() => {
                  if (window.confirm(`Remove ${active.name} as a friend?`)) void account.remove(active.netid);
                }}
              >
                Remove friend
              </button>
            </header>
            <h3>Their trips</h3>
            {active.trips.length === 0 ? <p className="empty">{active.name.split(" ")[0]} hasn't saved any trips yet.</p> : null}
            <ul className="trip-list">
              {active.trips.map((trip) => {
                const place = PLACE_BY_ID.get(trip.placeId);
                if (!place) return null;
                return (
                  <li key={`${trip.placeId}-${trip.start}`}>
                    <div className="trip-main">
                      <strong>{place.name}</strong>
                      <span>
                        {seasonLabel(trip.season)} · {formatRange(trip.start, trip.end)}
                      </span>
                    </div>
                    <div className="plan-actions">
                      <button
                        type="button"
                        onClick={() => {
                          dispatch({ type: "setSeason", season: trip.season });
                          dispatch({ type: "setView", view: "map" });
                          dispatch({ type: "select", id: place.id });
                        }}
                      >
                        On the map
                      </button>
                      <button
                        className="primary"
                        type="button"
                        onClick={() => {
                          const current = state.trips.find((item) => item.placeId === place.id && item.start === trip.start);
                          dispatch({
                            type: "saveTrip",
                            message: `Planned with ${active.name}`,
                            trip: {
                              id: current?.id ?? `trip-${place.id}-${trip.start}`,
                              placeId: place.id,
                              season: trip.season,
                              start: trip.start,
                              end: trip.end,
                              note: current?.note ?? "",
                              friendNetids: Array.from(new Set([...(current?.friendNetids ?? []), active.netid])),
                            },
                          });
                        }}
                      >
                        Plan together
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <div className="empty-card">
            <p>Your friends' trips show up here once they accept your request.</p>
          </div>
        )}
      </section>
    </div>
  );
}

function OverlapLine({ placeId, start, end, names }: { placeId: string; start: string; end: string; names: string[] }) {
  const n = useOverlap(placeId, start, end);
  return (
    <p className="overlap-line">
      {n === null ? "Overlap shows once you're signed in" : n === 0 ? "No other Yalies have saved these dates yet" : <><b>{n}</b> other {n === 1 ? "Yalie overlaps" : "Yalies overlap"} these dates</>}
      {names.length ? ` · with ${names.join(" and ")}` : ""}
    </p>
  );
}

export function ItineraryView() {
  const { state, dispatch } = useTripTable();
  useReviewStore();
  const upcoming = state.trips.filter(isUpcoming).sort((a, b) => a.start.localeCompare(b.start));
  const pastCount = state.trips.filter(isPast).length;
  const friends = useFriends();
  return (
    <div className="itinerary">
      <header>
        <div>
          <h2>Upcoming trips</h2>
          <p>Your plans, who else is going, and how to get there.</p>
        </div>
      </header>
      {upcoming.length === 0 ? (
        <div className="empty-card">
          <p>No upcoming trips yet.</p>
          <button className="primary" type="button" onClick={() => dispatch({ type: "setView", view: "map" })}>
            Find a place on the map
          </button>
        </div>
      ) : null}
      {pastCount ? (
        <button type="button" className="textlink" onClick={() => dispatch({ type: "openProfile", tab: "history" })}>
          {pastCount} past {pastCount === 1 ? "trip" : "trips"} in your trip history →
        </button>
      ) : null}
      <ul className="cards">
        {upcoming.map((trip) => {
          const place = PLACE_BY_ID.get(trip.placeId);
          if (!place) return null;
          const names = trip.friendNetids
            .map((id) => friends.find((person) => person.netid === id)?.name)
            .filter((name): name is string => Boolean(name));
          return (
            <li key={trip.id} className="card">
              <div className="card-top">
                <div>
                  <p className="kicker">{seasonLabel(trip.season)}</p>
                  <h3>{place.name}</h3>
                  <p>{formatRange(trip.start, trip.end)}</p>
                </div>
                <Rating value={scoreOf(place.id, "overall")} />
              </div>
              {trip.note ? <p>{trip.note}</p> : null}
              <GroupFlightSummary trip={trip} />
              <OverlapLine placeId={place.id} start={trip.start} end={trip.end} names={names} />
              <TravelLinks name={place.name} />
              <div className="plan-actions">
                <button
                  type="button"
                  onClick={() => {
                    dispatch({ type: "setSeason", season: trip.season });
                    dispatch({ type: "select", id: place.id });
                  }}
                >
                  View on map
                </button>
                <button className="textlink danger" type="button" onClick={() => dispatch({ type: "removeTrip", id: trip.id })}>
                  Remove
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
