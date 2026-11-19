// Each page has its own address, so the browser's back and forward buttons move between them.
// Routes are one path segment plus a query (triptable.io/catalog?type=study-abroad), which keeps the
// relative asset paths working at both triptable.io/ and hyang365.github.io/grok1/. 404.html is a
// copy of index.html, so a reload on any page still opens the app.

import type { MapMode, ProfileTab, ViewName } from "./types";

export type Route = {
  view: ViewName;
  mapMode?: MapMode;
  tripId?: string | null;
  profileTab?: ProfileTab;
  programId?: string | null;
};

const PROFILE_TABS = new Set<ProfileTab>(["history", "bucket", "reviews", "settings", "moderation"]);
const SEGMENTS: Record<string, ViewName> = {
  "": "map",
  map: "map",
  maps: "map",
  catalog: "catalog",
  friends: "friends",
  itinerary: "itinerary",
  flights: "flights",
  transit: "transit",
  profile: "profile",
};

/** The folder the app is served from: "/" on triptable.io, "/grok1/" on GitHub Pages. */
export function appBase(): string {
  return location.pathname.replace(/[^/]*$/, "");
}

export function parseRoute(): Route | null {
  const segment = decodeURIComponent(location.pathname.slice(appBase().length));
  const view = SEGMENTS[segment];
  if (!view) return null;
  const q = new URLSearchParams(location.search);
  if (view === "map") return { view, mapMode: q.get("layer") === "study-abroad" ? "abroad" : "travel" };
  if (view === "catalog") {
    if (q.get("type") === "study-abroad") return { view: "abroad", programId: q.get("program") };
    return { view };
  }
  if (view === "itinerary") return { view, tripId: q.get("trip") };
  if (view === "profile") {
    const tab = q.get("tab") as ProfileTab | null;
    return { view, profileTab: tab && PROFILE_TABS.has(tab) ? tab : "history" };
  }
  return { view };
}

/** The address for the page the app is showing (path and query, no hash). */
export function routeUrl(s: { view: ViewName; mapMode: MapMode; openTripId: string | null; profileTab: ProfileTab; abroadProgramId: string | null }): string {
  const base = appBase();
  const q = new URLSearchParams();
  let segment = "";
  switch (s.view) {
    case "map":
      segment = "maps";
      if (s.mapMode === "abroad") q.set("layer", "study-abroad");
      break;
    case "catalog":
      segment = "catalog";
      break;
    case "abroad":
      segment = "catalog";
      q.set("type", "study-abroad");
      if (s.abroadProgramId) q.set("program", s.abroadProgramId);
      break;
    case "itinerary":
      segment = "itinerary";
      if (s.openTripId) q.set("trip", s.openTripId);
      break;
    case "profile":
      segment = "profile";
      if (s.profileTab !== "history") q.set("tab", s.profileTab);
      break;
    default:
      segment = s.view;
  }
  const qs = q.toString();
  return `${base}${segment}${qs ? `?${qs}` : ""}`;
}
