import { useEffect, useRef, useState } from "react";
import { assertData } from "./data";
import { seasonLabel } from "./logic";
import { MapView } from "./MapView";
import { CatalogView, EmptyPanel, FilterRail, FriendsView, ItineraryView, PlacePanel } from "./ui";
import { StoreProvider, useCatalog, useTripTable } from "./store";
import { PLACE_BY_ID } from "./data";
import { AveloToggle, FlightsView } from "./flights/FlightsView";
import { LOGO } from "./logo";
import { AbroadView } from "./abroad/AbroadView";
import { AbroadMapPanel } from "./abroad/AbroadMapPanel";
import { TransitView } from "./transit/TransitView";
import { ProfileMenu } from "./profile/ProfileMenu";
import { ProfileView } from "./profile/ProfileView";
import { isUpcoming } from "./profile/trips";
import "./abroad/abroad.css";

function Shell() {
  const checked = useRef(false);
  if (!checked.current) {
    assertData();
    checked.current = true;
  }
  const { state, dispatch } = useTripTable();
  const { rows, total } = useCatalog();
  const [railOpen, setRailOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const selected = state.selectedId ? (PLACE_BY_ID.get(state.selectedId) ?? null) : null;
  const abroadMap = state.mapMode === "abroad";
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
            const first = rows[0];
            if (!first) return;
            dispatch({ type: "select", id: first.place.id });
            setRailOpen(false);
          }}
        />
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
        <nav className="nav">
          <button className="filters-toggle" type="button" onClick={() => setRailOpen((open) => !open)}>
            Filters
          </button>
          <button className={state.view === "map" ? "nav-btn active" : "nav-btn"} type="button" onClick={() => dispatch({ type: "setView", view: "map" })}>
            Map
          </button>
          <button className={state.view === "catalog" ? "nav-btn active" : "nav-btn"} type="button" onClick={() => dispatch({ type: "setView", view: "catalog" })}>
            Catalog
          </button>
          <button className={state.view === "flights" ? "nav-btn active" : "nav-btn"} type="button" onClick={() => dispatch({ type: "setView", view: "flights" })}>
            Flights
          </button>
          <button className={state.view === "abroad" ? "nav-btn active" : "nav-btn"} type="button" onClick={() => dispatch({ type: "setView", view: "abroad" })}>
            Study Abroad
          </button>
          <button className={state.view === "transit" ? "nav-btn active" : "nav-btn"} type="button" onClick={() => dispatch({ type: "setView", view: "transit" })}>
            Transit
          </button>
          <button
            className={state.view === "friends" ? "nav-btn active" : "nav-btn"}
            type="button"
            onClick={() => dispatch({ type: "setView", view: "friends" })}
          >
            Friends
          </button>
          <button
            className={state.view === "itinerary" ? "nav-btn active" : "nav-btn"}
            type="button"
            onClick={() => dispatch({ type: "setView", view: "itinerary" })}
          >
            Itinerary
            <span className="badge">{state.trips.filter(isUpcoming).length}</span>
          </button>
          <AveloToggle />
          <button
            className="nav-btn theme-btn"
            type="button"
            aria-label={state.theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
            title={state.theme === "light" ? "Dark mode" : "Light mode"}
            onClick={() => dispatch({ type: "setTheme", theme: state.theme === "light" ? "dark" : "light" })}
          >
            {state.theme === "light" ? (
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7Z" fill="currentColor" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <circle cx="12" cy="12" r="4.5" fill="currentColor" />
                <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" />
                </g>
              </svg>
            )}
          </button>
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
                <div className="legend-title">{seasonLabel(state.season)} 2026</div>
                <div className="legend-scale">
                  <span>Fewer</span>
                  <i className="legend-bar" />
                  <span>180+</span>
                </div>
                <div className="legend-total">
                  {total.toLocaleString("en-US")} {state.filters.scope === "us" ? "U.S. plans in view" : "plans"} · sample counts
                </div>
              </div>
            )}
            <div className="map-actions">
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
            <CatalogView />
            {selected ? <PlacePanel place={selected} /> : null}
          </div>
        </div>
      ) : null}
      {state.view === "flights" ? <FlightsView /> : null}
      {state.view === "abroad" ? <AbroadView /> : null}
      {state.view === "transit" ? <TransitView /> : null}
      {state.view === "profile" ? <ProfileView /> : null}
      {state.view === "friends" ? <FriendsView /> : null}
      {state.view === "itinerary" ? <ItineraryView /> : null}
      {state.toast ? (
        <div className="toast" role="status">
          {state.toast}
        </div>
      ) : null}
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
