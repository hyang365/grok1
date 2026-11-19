import { useEffect, useRef, useState } from "react";
import { assertData, lookupPlace } from "./data";
import { seasonLabel } from "./logic";
import { MapView } from "./MapView";
import { CatalogView, EmptyPanel, FilterRail, FriendTripsPicker, FriendsView, ItineraryView, PlacePanel } from "./ui";
import { StoreProvider, useCatalog, useTripTable } from "./store";
import { ABROAD_CITIES } from "./abroad/data";
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
import { JoinTrip } from "./trip/JoinTrip";
import { useInvites } from "./trip/invites";
import { ProfileView } from "./profile/ProfileView";
import { isUpcoming } from "./profile/trips";
import "./abroad/abroad.css";
import { reviews as reviewApi, useReviewStore } from "./reviews/store";
import { useAccount } from "./account/account";
import { parseRoute, routeUrl } from "./router";
import { Confetti, GameBanner } from "./fun/Fun";
import { PROGRAM_BY_ID } from "./abroad/data";
import type { State } from "./store";

const NAV: [ViewName, string][] = [
  ["map", "Map"],
  ["catalog", "Catalog"],
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
  // Click the logo five times quickly: Boola boola.
  const logoClicks = useRef<number[]>([]);
  const [boola, setBoola] = useState(0);
  const selected = state.selectedId ? (lookupPlace(state.selectedId) ?? null) : null;
  const abroadMap = state.mapMode === "abroad";
  const placesView = state.view === "map" || state.view === "catalog";
  const tripsView = state.view === "itinerary" || state.view === "flights" || state.view === "transit";
  const upcomingCount = state.trips.filter(isUpcoming).length;
  const inviteCount = useInvites().incoming.length;
  useTripSync();
  const panelOpen = abroadMap ? Boolean(state.abroadIso) : Boolean(selected || state.emptyGeo);

  useRouteSync(state, dispatch);
  const title = pageTitle(state);
  useEffect(() => {
    document.title = title;
  }, [title]);

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
        if (state.abroadIso) dispatch({ type: "selectAbroad", iso: null });
        else if (state.selectedId || state.emptyGeo) dispatch({ type: "select", id: null });
        setRailOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dispatch, state.emptyGeo, state.selectedId, state.abroadIso]);

  return (
    <div className="app">
      <header className="topbar">
        <button
          className="brand"
          type="button"
          onClick={() => {
            dispatch({ type: "world" });
            const now = Date.now();
            logoClicks.current = [...logoClicks.current.filter((t) => now - t < 2000), now];
            if (logoClicks.current.length >= 5) {
              logoClicks.current = [];
              setBoola((n) => n + 1);
              dispatch({ type: "toast", message: "Boola boola! 🐶" });
            }
          }}
        >
          <img className="brand-mark" src={LOGO} alt="" />
          <span className="brand-name">triptable</span>
        </button>
        {placesView ? (
        <input
          ref={searchRef}
          className="search"
          type="search"
          placeholder={abroadMap && state.view === "map" ? "Search programs or countries" : "Search places, countries, or spots"}
          aria-label="Search places"
          value={state.filters.query}
          onChange={(event) => dispatch({ type: "patchFilters", patch: { query: event.target.value } })}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            const q = state.filters.query.trim().toLowerCase();
            if (abroadMap && state.view === "map") {
              const city = ABROAD_CITIES.find((item) => item.city.toLowerCase().includes(q) || item.programs.some((program) => program.country.toLowerCase().includes(q) || program.name.toLowerCase().includes(q)));
              if (city) dispatch({ type: "selectAbroad", iso: city.iso });
              setRailOpen(false);
              return;
            }
            const first = rows.find((row) => row.place.name.toLowerCase() === q) ?? rows.find((row) => row.place.name.toLowerCase().startsWith(q)) ?? rows[0];
            if (!first) return;
            dispatch({ type: "select", id: first.place.id });
            if (q.includes("harvard")) dispatch({ type: "toast", message: "Did you mean: Yale?" });
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
                <option value="All">All terms</option>
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
            const active = view === "itinerary" ? tripsView : view === "catalog" ? state.view === "catalog" || state.view === "abroad" : state.view === view;
            return (
              <button key={view} className={active ? "nav-btn active" : "nav-btn"} type="button" onClick={() => {
                if (view === "itinerary") dispatch({ type: "openTrip", id: null });
                // Catalog keeps whichever side (travel or study abroad) you were on.
                if (view === "catalog" && (state.view === "catalog" || state.view === "abroad")) return;
                dispatch({ type: "setView", view });
              }}>
                {label}
                {view === "itinerary" && (upcomingCount || inviteCount) ? <span className={inviteCount ? "badge badge-alert" : "badge"}>{inviteCount || upcomingCount}</span> : null}
              </button>
            );
          })}
        </nav>
        <ProfileMenu />
      </header>
      <GameBanner />

      {state.view === "map" ? (
        <div className="workspace">
          <FilterRail open={railOpen} onPick={() => setRailOpen(false)} />
          <div className={panelOpen ? "map-stage panel-open" : "map-stage"}>
            <MapView />
            <div className="map-mode" role="group" aria-label="Map layer">
              <button type="button" aria-pressed={state.mapMode === "travel"} className={state.mapMode === "travel" ? "active" : ""} onClick={() => dispatch({ type: "setMapMode", mode: "travel" })}>
                Travel
              </button>
              <button type="button" aria-pressed={abroadMap} className={abroadMap ? "active" : ""} onClick={() => dispatch({ type: "setMapMode", mode: "abroad" })}>
                <span className="nav-long">Study abroad</span>
                <span className="nav-short">Abroad</span>
              </button>
            </div>
            {abroadMap ? (
              <div className="legend">
                <div className="legend-title">Program rating · {state.abroadTerm === "All" ? "All terms" : state.abroadTerm === "Summer" ? "Summer" : `${state.abroadTerm} semester`}</div>
                <div className="legend-scale">
                  <span>1</span>
                  <i className="legend-bar" />
                  <span>5</span>
                </div>
                <div className="legend-total legend-gray">
                  <i className="legend-swatch has-programs" /> Programs, not rated yet
                </div>
              </div>
            ) : (
              <div className="legend">
                <div className="legend-title">Overall rating</div>
                <div className="legend-scale">
                  <span>1</span>
                  <i className="legend-bar" />
                  <span>5</span>
                </div>
                <div className="legend-total legend-gray">
                  <i className="legend-swatch" /> Not rated yet
                </div>
                {selected || state.filters.scope === "us" ? (
                  <div className="legend-icons">
                    <span><i className="li city" />City</span>
                    <span><i className="li park" />Park / nature</span>
                    <span><i className="li landmark" />Landmark</span>
                  </div>
                ) : null}
                <FriendTripsPicker />
                <div className="legend-total">
                  {total
                    ? `${total.toLocaleString("en-US")} ${total === 1 ? "student plan" : "student plans"} for ${seasonLabel(state.season)} ${seasonYear(state.season)}${state.filters.scope === "us" ? " in the U.S." : ""}`
                    : `No ${seasonLabel(state.season)} plans saved yet.`}
                </div>
              </div>
            )}
            <div className="map-actions">
              <button className="filters-toggle" type="button" onClick={() => setRailOpen((open) => !open)}>
                Filters
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
            <CatalogToggle />
            <CatalogView />
            {selected ? <PlacePanel place={selected} /> : null}
          </div>
        </div>
      ) : null}
      {state.view === "abroad" ? <AbroadView toggle={<CatalogToggle />} /> : null}
      {state.view === "profile" ? <ProfileView /> : null}
      {state.view === "friends" ? <FriendsView /> : null}
      {tripsView ? <TripsShell /> : null}
      {budgetOpen ? <BudgetFinder onClose={() => setBudgetOpen(false)} /> : null}
      <Confetti burst={boola} />
      <AuthBanner />
      <JoinTrip />
      {state.toast ? (
        <div className="toast" role="status">
          {state.toast}
        </div>
      ) : null}
    </div>
  );
}

/** Switches the catalog between travel places and study abroad programs. */
function CatalogToggle() {
  const { state, dispatch } = useTripTable();
  const abroad = state.view === "abroad";
  return (
    <div className="catalog-bar">
    <div className="seg catalog-toggle" role="tablist" aria-label="Catalog">
      <button type="button" role="tab" aria-selected={!abroad} className={!abroad ? "active" : ""} onClick={() => dispatch({ type: "setView", view: "catalog" })}>
        Travel
      </button>
      <button type="button" role="tab" aria-selected={abroad} className={abroad ? "active" : ""} onClick={() => dispatch({ type: "setView", view: "abroad" })}>
        Study abroad
      </button>
    </div>
    </div>
  );
}

/** The browser tab title for the page you're on. */
function pageTitle(state: State): string {
  const place = (id: string | null | undefined) => (id ? lookupPlace(id)?.name : undefined);
  let page: string;
  switch (state.view) {
    case "map":
      page = state.mapMode === "abroad" ? "Study abroad map" : place(state.selectedId) ?? `Map · ${seasonLabel(state.season)}`;
      break;
    case "catalog":
      page = "Travel catalog";
      break;
    case "abroad": {
      const program = state.abroadProgramId ? PROGRAM_BY_ID.get(state.abroadProgramId) : undefined;
      page = program ? `${program.name} · Study abroad` : "Study abroad catalog";
      break;
    }
    case "friends":
      page = "Friends";
      break;
    case "itinerary": {
      const trip = state.openTripId ? state.trips.find((t) => t.id === state.openTripId) : undefined;
      page = trip ? `${place(trip.placeId) ?? "Trip"} trip` : "Your trips";
      break;
    }
    case "flights":
      page = "Flights";
      break;
    case "transit":
      page = "Buses & trains";
      break;
    case "profile":
      page = "Profile";
      break;
    default:
      page = "";
  }
  return page ? `${page} · TripTable` : "TripTable";
}

/** Keeps the address bar in step with the page, and the back and forward buttons in step with the app. */
function useRouteSync(state: State, dispatch: (a: { type: "route"; route: NonNullable<ReturnType<typeof parseRoute>> }) => void) {
  const url = routeUrl(state);
  const first = useRef(true);
  useEffect(() => {
    const here = location.pathname + location.search;
    if (url === here) {
      first.current = false;
      return;
    }
    try {
      // The first fix-up replaces the entry (and keeps any sign-in #hash); later page changes add one.
      if (first.current) history.replaceState(null, "", url + location.hash);
      else history.pushState(null, "", url);
    } catch {
      /* ignore */
    }
    first.current = false;
  }, [url]);
  useEffect(() => {
    const onPop = () => {
      const route = parseRoute();
      if (route) dispatch({ type: "route", route });
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [dispatch]);
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
