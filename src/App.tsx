import { useEffect, useRef, useState } from "react";
import { assertData } from "./data";
import { seasonLabel } from "./logic";
import { MapView } from "./MapView";
import { CatalogView, EmptyPanel, FilterRail, FriendsView, ItineraryView, PlacePanel } from "./ui";
import { StoreProvider, useCatalog, useTripTable } from "./store";
import { PLACE_BY_ID } from "./data";
import { FlightsView } from "./flights/FlightsView";
import { useTripSync } from "./live/useTripSync";
import { seasonYear } from "./live/plans";
import type { ViewName } from "./types";
import { LOGO } from "./logo";
import { AbroadView } from "./abroad/AbroadView";
import { AbroadMapPanel } from "./abroad/AbroadMapPanel";
import { TransitView } from "./transit/TransitView";
import { ProfileMenu } from "./profile/ProfileMenu";
import { BudgetFinder } from "./budget/BudgetFinder";
import { ProfileView } from "./profile/ProfileView";
import { isUpcoming } from "./profile/trips";
import "./abroad/abroad.css";
import { reviews as reviewApi, useReviewStore } from "./reviews/store";
import { useAccount } from "./account/account";

const NAV: [ViewName, string][] = [
  ["map", "Map"],
  ["catalog", "Catalog"],
  ["abroad", "Study Abroad"],
  ["friends", "Friends"],
  ["itinerary", "Itinerary"],
];

const TRIP_TABS: [ViewName, string][] = [
  ["itinerary", "Trips"],
  ["flights", "Flights"],
  ["transit", "Buses & trains"],
];

function TripsShell() {
  const { state, dispatch } = useTripTable();
  return (
    <div className="trips-shell">
      <div className="trips-tabs" role="tablist" aria-label="Itinerary">
        {TRIP_TABS.map(([view, label]) => (
          <button key={view} type="button" role="tab" aria-selected={state.view === view} className={state.view === view ? "active" : ""} onClick={() => dispatch({ type: "setView", view })}>
            {label}
          </button>
        ))}
      </div>
      {state.view === "itinerary" ? <ItineraryView /> : null}
      {state.view === "flights" ? <FlightsView /> : null}
      {state.view === "transit" ? <TransitView /> : null}
    </div>
  );
}

function Shell() {
  const checked = useRef(false);
  if (!checked.current) {
    assertData();
    checked.current = true;
  }
  const { state, dispatch } = useTripTable();
  const { rows, total } = useCatalog();
  const [railOpen, setRailOpen] = useState(false);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const selected = state.selectedId ? (PLACE_BY_ID.get(state.selectedId) ?? null) : null;
  const abroadMap = state.mapMode === "abroad";
  const placesView = state.view === "map" || state.view === "catalog";
  const tripsView = state.view === "itinerary" || state.view === "flights" || state.view === "transit";
  const upcomingCount = state.trips.filter(isUpcoming).length;
  useTripSync();
  const panelOpen = abroadMap ? Boolean(state.abroadIso) : Boolean(selected || state.emptyGeo);

  useEffect(() => {
    document.title = `TripTable · ${seasonLabel(state.season)}`;
  }, [state.season]);

  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>("link[rel='icon']") ?? document.createElement("link");
    link.rel = "icon";
    link.href = LOGO;
    if (!link.parentElement) document.head.appendChild(link);
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT");
      if (event.key === "/" && !typing) {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === "Escape") {
        if (state.selectedId || state.emptyGeo) dispatch({ type: "select", id: null });
        setRailOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dispatch, state.emptyGeo, state.selectedId]);

  return (
    <div className="app">
      <header className="topbar">
        <button className="brand" type="button" onClick={() => dispatch({ type: "world" })}>
          <img className="brand-mark" src={LOGO} alt="" />
          <span className="brand-name">triptable</span>
        </button>
        {placesView ? (
        <input
          ref={searchRef}
          className="search"
          type="search"
          placeholder="Search places, countries, or spots"
          aria-label="Search places"
          value={state.filters.query}
          onChange={(event) => dispatch({ type: "patchFilters", patch: { query: event.target.value } })}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            const q = state.filters.query.trim().toLowerCase();
            const first = rows.find((row) => row.place.name.toLowerCase() === q) ?? rows.find((row) => row.place.name.toLowerCase().startsWith(q)) ?? rows[0];
            if (!first) return;
            dispatch({ type: "select", id: first.place.id });
            setRailOpen(false);
          }}
        />
        ) : (
          <span className="topbar-spacer" />
        )}
        {placesView ? (
        <label className="season-wrap">
          {abroadMap && state.view === "map" ? (
            <>
              <span className="sr">Term</span>
              <select
                className="season"
                aria-label="Study abroad term"
                value={state.abroadTerm}
                onChange={(event) => dispatch({ type: "setAbroadTerm", term: event.target.value as typeof state.abroadTerm })}
              >
                <option value="Fall">Fall semester</option>
                <option value="Spring">Spring semester</option>
                <option value="Summer">Summer</option>
              </select>
            </>
          ) : (
            <>
              <span className="sr">Season</span>
              <select
                className="season"
                aria-label="Season"
                value={state.season}
                onChange={(event) => dispatch({ type: "setSeason", season: event.target.value as typeof state.season })}
              >
                <option value="spring">Spring Break</option>
                <option value="summer">Summer</option>
                <option value="fall">Fall Break</option>
                <option value="winter">Winter</option>
                <option value="weekend">Weekends</option>
              </select>
            </>
          )}
        </label>
        ) : null}
        {placesView && !(abroadMap && state.view === "map") ? (
          <button type="button" className="nav-btn budget-btn" onClick={() => setBudgetOpen(true)} title="Find trips that fit your budget">
            $ Trip finder
          </button>
        ) : null}
        <nav className="nav">
          {NAV.map(([view, label]) => {
            const active = view === "itinerary" ? tripsView : state.view === view;
            return (
              <button key={view} className={active ? "nav-btn active" : "nav-btn"} type="button" onClick={() => dispatch({ type: "setView", view })}>
                {view === "abroad" ? (
                  <>
                    <span className="nav-long">Study Abroad</span>
                    <span className="nav-short">Abroad</span>
                  </>
                ) : (
                  label
                )}
                {view === "itinerary" && upcomingCount ? <span className="badge">{upcomingCount}</span> : null}
              </button>
            );
          })}
        </nav>
        <ProfileMenu />
      </header>

      {state.view === "map" ? (
        <div className={abroadMap ? "workspace no-rail" : "workspace"}>
          {abroadMap ? null : <FilterRail open={railOpen} onPick={() => setRailOpen(false)} />}
          <div className={panelOpen ? "map-stage panel-open" : "map-stage"}>
            <MapView />
            <div className="map-mode" role="group" aria-label="Map layer">
              <button type="button" aria-pressed={!abroadMap} className={abroadMap ? "" : "active"} onClick={() => dispatch({ type: "setMapMode", mode: "travel" })}>
                Travel
              </button>
              <button type="button" aria-pressed={abroadMap} className={abroadMap ? "active" : ""} onClick={() => dispatch({ type: "setMapMode", mode: "abroad" })}>
                Study abroad
              </button>
            </div>
            {abroadMap ? (
              <div className="legend">
                <div className="legend-title">{state.abroadTerm === "Summer" ? "Summer" : `${state.abroadTerm} semester`} programs</div>
                <div className="legend-scale">
                  <span>1</span>
                  <i className="legend-bar" />
                  <span>More</span>
                </div>
                <div className="legend-total">Yale-run and Yale-approved programs offered this term</div>
              </div>
            ) : (
              <div className="legend">
                <div className="legend-title">
                  {seasonLabel(state.season)} {seasonYear(state.season)}
                </div>
                <div className="legend-scale">
                  <span>Fewer</span>
                  <i className="legend-bar" />
                  <span>More</span>
                </div>
                {state.filters.scope === "us" || selected?.iso === "US" ? (
                  <div className="legend-icons">
                    <span><i className="li city" />City</span>
                    <span><i className="li park" />National park</span>
                    <span><i className="li landmark" />Landmark</span>
                  </div>
                ) : null}
                <div className="legend-total">
                  {total
                    ? `${total.toLocaleString("en-US")} ${total === 1 ? "student plan" : "student plans"}${state.filters.scope === "us" ? " in the U.S." : ""}`
                    : "No plans saved yet. Add yours from any place."}
                </div>
              </div>
            )}
            <div className="map-actions">
              {abroadMap ? null : (
                <button className="filters-toggle" type="button" onClick={() => setRailOpen((open) => !open)}>
                  Filters
                </button>
              )}
              <button type="button" onClick={() => dispatch({ type: "world" })}>
                World
              </button>
            </div>
            {abroadMap ? (
              state.abroadIso ? <AbroadMapPanel iso={state.abroadIso} /> : null
            ) : (
              <>
                {selected ? <PlacePanel place={selected} /> : null}
                {state.emptyGeo ? <EmptyPanel geo={state.emptyGeo} /> : null}
              </>
            )}
          </div>
        </div>
      ) : null}
      {state.view === "catalog" ? (
        <div className="workspace">
          <FilterRail open={railOpen} onPick={() => setRailOpen(false)} />
          <div className={panelOpen ? "map-stage catalog-stage panel-open" : "map-stage catalog-stage"}>
            <div className="map-actions catalog-actions">
              <button className="filters-toggle" type="button" onClick={() => setRailOpen((open) => !open)}>
                Filters
              </button>
            </div>
            <CatalogView />
            {selected ? <PlacePanel place={selected} /> : null}
          </div>
        </div>
      ) : null}
      {state.view === "abroad" ? <AbroadView /> : null}
      {state.view === "profile" ? <ProfileView /> : null}
      {state.view === "friends" ? <FriendsView /> : null}
      {tripsView ? <TripsShell /> : null}
      {budgetOpen ? <BudgetFinder onClose={() => setBudgetOpen(false)} /> : null}
      <AuthBanner />
      {state.toast ? (
        <div className="toast" role="status">
          {state.toast}
        </div>
      ) : null}
    </div>
  );
}

/** Shows a failed sign-in once, and welcomes a new account the first time it signs in. */
function AuthBanner() {
  const { authError } = useReviewStore();
  const { me } = useAccount();
  const { dispatch } = useTripTable();
  const greeted = useRef<string | null>(null);
  useEffect(() => {
    if (!me || greeted.current === me.id) return;
    greeted.current = me.id;
    try {
      if (sessionStorage.getItem("triptable-greeted") === me.id) return;
      sessionStorage.setItem("triptable-greeted", me.id);
    } catch {
      /* storage blocked */
    }
    const first = (me.full_name || me.email).split(/[\s.@]/)[0];
    dispatch({ type: "toast", message: `Signed in as ${first ? first[0].toUpperCase() + first.slice(1) : "you"}` });
  }, [me, dispatch]);
  if (!authError) return null;
  return (
    <div className="auth-banner" role="alert">
      <span>{authError}</span>
      <button type="button" className="textlink" onClick={() => reviewApi.clearAuthError()}>
        Dismiss
      </button>
    </div>
  );
}

export function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
