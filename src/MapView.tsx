import * as am5 from "@amcharts/amcharts5";
import * as am5map from "@amcharts/amcharts5/map";
// Same world map with the Great Lakes cut out, so they show as water.
import worldHigh from "@amcharts/amcharts5-geodata/worldGreatLakesHigh";
import usaLow from "@amcharts/amcharts5-geodata/usaLow";
import { useEffect, useRef } from "react";
import { COUNTRY_BY_ISO, lookupPlace, PLACES } from "./data";
import { passesFilters, ratingColor, scoreOf, seasonLabel, visitCount } from "./logic";
import { useCatalog, useFriends, useTripTable } from "./store";
import { usePlans } from "./live/plans";
import { summaryAvg, useReviewStore } from "./reviews/store";
import { ABROAD_CITIES, offeredIn, programsIn } from "./abroad/data";
import { matchesQuery, passesAbroad } from "./abroad/filters";
import { HARVARD_ID } from "./fun/harvard";

type PointDatum = {
  latitude: number;
  longitude: number;
  placeId: string;
  tooltip: string;
  radius: number;
  fill: number;
  iso?: string;
  label?: string;
  icon?: "city" | "park" | "landmark" | "nope";
};

// 12x12 icon paths drawn in white on a colored badge.
const ICON_PATH: Record<NonNullable<PointDatum["icon"]>, string> = {
  nope: "M2.2 1L6 4.8 9.8 1 11 2.2 7.2 6 11 9.8 9.8 11 6 7.2 2.2 11 1 9.8 4.8 6 1 2.2z",
  city: "M1 11V6h3v5zM5 11V1.5h3V11zM9 11V4h2.5v7z",
  park: "M6 0.5L10 6H8L11 10H7V11.8H5V10H1L4 6H2Z",
  landmark: "M6 0.4l1.7 3.6 3.9.5-2.9 2.7.8 3.9L6 9.2l-3.5 1.9.8-3.9L.4 4.5l3.9-.5z",
};
const ICON_FILL: Record<NonNullable<PointDatum["icon"]>, number> = { city: 0x0b3d91, park: 0x2f7d32, landmark: 0xd9822b, nope: 0xa51c30 };
// Water is a quiet blue and unrated land is warm paper, so the coast reads without a neon sea.
const SEA = { light: 0x7ea4c8, dark: 0x0b1824 };
const LAND = { light: 0xf6f3ec, dark: 0x3c3a36 };
const LINE = { light: 0xd3c9bb, dark: 0x514e48 };
const PROGRAM_LAND = { light: 0xd7e3f4, dark: 0x243044 };
// Zoomed out, only these major tourism destinations get a dot.
const MAJOR = new Set(
  "nyc la sf miami nola chicago lasvegas dc honolulu grandcanyon yosemite orlando sanjuan cancun cdmx tulum rome florence venice amalfi paris nice barcelona madrid london edinburgh lisbon amsterdam berlin prague dubrovnik athens santorini istanbul reykjavik marrakech cairo tokyo kyoto seoul beijing shanghai greatwall bangkok phuket ubud hanoi sydney cartagena machupicchu toronto montreal vancouver banff nassau puntacana montegobay interlaken dublin lafortuna harvard".split(" "),
);

// Labeled on the U.S. map (others show their name on hover so the Northeast stays readable).
const US_LABELS = new Set(["nyc", "boston", "dc", "chicago", "la", "sf", "seattle", "miami", "nola", "austin", "denver", "lasvegas", "atlanta", "nashville", "sandiego", "portlandor", "saltlake", "anchorage", "honolulu", "houston", "minneapolis", "orlando", "santafe"]);

type Api = {
  root: am5.Root;
  chart: am5map.MapChart;
  polygons: am5map.MapPolygonSeries;
  spots: am5map.MapPointSeries;
  pals: am5map.MapPointSeries;
  states: am5map.MapPolygonSeries;
  background: am5.Rectangle;
  ready: boolean;
  seen: Set<string>;
  /** What the point series last drew, so a refresh that changes nothing doesn't redraw (and flash) the dots. */
  drawn: { spots: string; pals: string };
};

function setPoints(api: Api, which: "spots" | "pals", data: PointDatum[]) {
  const sig = JSON.stringify(data);
  if (api.drawn[which] === sig) return;
  api.drawn[which] = sig;
  api[which].data.setAll(data);
}

function mapCenter(chart: am5map.MapChart) {
  const width = chart.innerWidth();
  const height = chart.innerHeight();
  if (width <= 0 || height <= 0) return null;
  const point = chart.invert({ x: width / 2, y: height / 2 });
  if (!point || !Number.isFinite(point.longitude) || !Number.isFinite(point.latitude)) return null;
  return point;
}

/** True when the chart is already on the fitted world a logo click would ask for. */
function resting(chart: am5map.MapChart): boolean {
  const center = mapCenter(chart);
  if (!center) return false;
  const zoom = chart.get("zoomLevel", 1) ?? 1;
  const rotation = chart.get("rotationX", 0) ?? 0;
  if (zoom > 1.02 || Math.abs(rotation) > 0.6) return false;
  const home = chart.homeGeoPoint();
  const lon = Math.abs(center.longitude - home.longitude);
  return Math.min(lon, 360 - lon) < 0.8 && Math.abs(center.latitude - home.latitude) < 0.8;
}

function polygonItem(series: am5map.MapPolygonSeries, iso: string) {
  let found: am5.DataItem<am5map.IMapPolygonSeriesDataItem> | undefined;
  series.mapPolygons.each((polygon) => {
    const ctx = polygon.dataItem?.dataContext as { id?: string } | undefined;
    if (ctx?.id === iso && polygon.dataItem) {
      found = polygon.dataItem as am5.DataItem<am5map.IMapPolygonSeriesDataItem>;
    }
  });
  return found;
}

export function MapView() {
  const { state, dispatch } = useTripTable();
  const { passed, maxCountry } = useCatalog();
  const { version: reviewsVersion } = useReviewStore();
  const friends = useFriends();
  const { version: plansVersion } = usePlans();
  const hostRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<Api | null>(null);
  const paintRef = useRef<() => void>(() => {});
  const zoomRef = useRef<() => void>(() => {});
  const pointGuard = useRef(0);
  const zoomToken = useRef(0);

  const abroad = state.mapMode === "abroad";
  const modeRef = useRef(state.mapMode);
  modeRef.current = state.mapMode;
  const abroadTermRef = useRef(state.abroadTerm);
  abroadTermRef.current = state.abroadTerm;
  const openRef = useRef(false);
  openRef.current = Boolean(state.selectedId || state.emptyGeo || state.abroadIso);
  const panelOpen = abroad ? Boolean(state.abroadIso) : Boolean(state.selectedId || state.emptyGeo);
  const selected = state.selectedId ? lookupPlace(state.selectedId) : undefined;
  const focusedRef = useRef(false);
  const prevModeRef = useRef(state.mapMode);
  const prevHomeRef = useRef(state.homeTick);

  paintRef.current = () => {
    const api = apiRef.current;
    if (!api?.ready) return;
    const dark = state.theme === "dark";
    const seasonName = seasonLabel(state.season);
    const sea = dark ? SEA.dark : SEA.light;
    const land = dark ? LAND.dark : LAND.light;
    const line = dark ? LINE.dark : LINE.light;
    api.background.set("fill", am5.color(sea));
    if (abroad) {
      const term = state.abroadTerm;
      const termLabel = term === "All" ? "" : term === "Summer" ? "summer " : `${term.toLowerCase()} semester `;
      const q = state.filters.query.trim().toLowerCase();
      const keep = (p: (typeof ABROAD_CITIES)[number]["programs"][number]) => passesAbroad(p, state.abroadFilters) && matchesQuery(p, q);
      api.polygons.mapPolygons.each((polygon) => {
        const ctx = polygon.dataItem?.dataContext as { id?: string; name?: string } | undefined;
        const progs = ctx?.id ? programsIn(ctx.id, term).filter(keep) : [];
        const n = progs.length;
        const isSelected = Boolean(ctx?.id && ctx.id === state.abroadIso);
        polygon.set("interactive", true);
        // Shaded by the average overall rating of that country's programs this term.
        const rating = summaryAvg("program", progs.map((p) => p.id), "overall");
        polygon.set(
          "fill",
          am5.color(rating !== null ? ratingColor(rating, dark) : n ? (dark ? PROGRAM_LAND.dark : PROGRAM_LAND.light) : land),
        );
        polygon.set("stroke", am5.color(isSelected ? (dark ? 0xffffff : 0x141414) : line));
        polygon.set("strokeWidth", isSelected ? 1.8 : 0.7);
        polygon.set(
          "tooltipText",
          n
            ? `${ctx?.name ?? ""}\n${n} ${termLabel}${n === 1 ? "program" : "programs"} · ${rating !== null ? `rated ${rating.toFixed(1)} overall` : "not rated yet"}`
            : (ctx?.name ?? ""),
        );
      });
      const spots: PointDatum[] = [];
      for (const city of ABROAD_CITIES) {
        const progs = city.programs.filter((p) => offeredIn(p, term) && keep(p));
        if (!progs.length) continue;
        const names = progs.slice(0, 6).map((p) => p.name);
        if (progs.length > 6) names.push(`+${progs.length - 6} more`);
        spots.push({
          latitude: city.lat,
          longitude: city.lng,
          placeId: "",
          iso: city.iso,
          tooltip: `${city.city}\n${names.join("\n")}`,
          radius: (city.iso === state.abroadIso ? 7 : 4) + Math.min(5, progs.length),
          fill: 0x0b3d91,
        });
      }
      setPoints(api, "spots", spots);
      setPoints(api, "pals", []);
      return;
    }
    api.polygons.mapPolygons.each((polygon) => {
      const ctx = polygon.dataItem?.dataContext as { id?: string; name?: string } | undefined;
      const country = ctx?.id ? COUNTRY_BY_ISO.get(ctx.id) : undefined;
      const count = country ? visitCount(country, state.season) : 0;
      const on = Boolean(country && passed.has(country.id));
      const isSelected = country?.id === state.selectedId;
      polygon.set("interactive", true);
      // Countries are shaded by their overall rating (the country plus its cities); unrated stays warm paper.
      const rating = country ? scoreOf(country.id, "overall") : null;
      polygon.set("fill", am5.color(on && rating !== null ? ratingColor(rating, dark) : land));
      polygon.set("stroke", am5.color(isSelected ? (dark ? 0xffffff : 0x141414) : line));
      polygon.set("strokeWidth", isSelected ? 1.8 : 0.7);
      polygon.set(
        "tooltipText",
        on && country
          ? `${country.name}\n${rating !== null ? `Rated ${rating.toFixed(1)} overall` : "No ratings yet"} · ${count ? `${count.toLocaleString("en-US")} planning` : "no plans yet"}`
          : (ctx?.name ?? ""),
      );
    });

    const usFocus = state.filters.scope === "us" || selected?.iso === "US";
    api.states.set("visible", usFocus);
    const spotCounts = PLACES.filter((place) => place.kind === "spot").map((place) => visitCount(place, state.season));
    const maxSpot = Math.max(1, ...spotCounts);
    const spots: PointDatum[] = [];
    for (const place of PLACES) {
      if (place.kind !== "spot") continue;
      // A selected country (or one of its places) always shows its cities and destinations.
      const related = Boolean(selected && (place.parentId === selected.id || place.parentId === selected.parentId || place.id === selected.id));
      // Every city, park and landmark shows on the map; "Countries" only changes the list, not the pins.
      // Zoomed out: a plain dot on major tourism destinations only. Open a country (or the U.S. view)
      // to see all of its cities, parks and landmarks with icons.
      const detailed = related || usFocus;
      const visible =
        (detailed && (related || place.iso === "US")) ||
        (MAJOR.has(place.id) &&
          (passed.has(place.id) || passesFilters(place, visitCount(place, state.season), { ...state.filters, scope: "all" })));
      if (!visible) continue;
      const iconed = detailed && (related || place.iso === "US");
      const count = visitCount(place, state.season);
      const scale = Math.sqrt(count / maxSpot);
      if (place.id === HARVARD_ID) {
        // Crimson, with an X. Rated −5.0, permanently.
        spots.push({
          latitude: place.lat,
          longitude: place.lng,
          placeId: place.id,
          tooltip: "Harvard\nRated −5.0 on everything. Don't.",
          radius: iconed ? (place.id === state.selectedId ? 10 : 7.5) : 4,
          fill: ICON_FILL.nope,
          icon: iconed ? "nope" : undefined,
          label: usFocus ? "Harvard (ew)" : undefined,
        });
        continue;
      }
      spots.push({
        latitude: place.lat,
        longitude: place.lng,
        placeId: place.id,
        tooltip: `${place.name}\n${count ? `${count.toLocaleString("en-US")} planning` : "No plans yet"}`,
        radius: iconed ? (place.id === state.selectedId ? 10 : 7.5) + scale * 5 : 3.5 + scale * 4,
        fill: iconed && place.cat ? ICON_FILL[place.cat] : 0x163e78,
        icon: iconed ? place.cat : undefined,
        label: usFocus && place.iso === "US" && (US_LABELS.has(place.id) || place.id === state.selectedId) ? place.name : undefined,
      });
    }
    for (const place of PLACES) {
      if (place.kind !== "country" || !passed.has(place.id) || api.seen.has(place.iso)) continue;
      const count = visitCount(place, state.season);
      spots.push({
        latitude: place.lat,
        longitude: place.lng,
        placeId: place.id,
        tooltip: `${place.name}\n${count ? `${count.toLocaleString("en-US")} planning` : "No plans yet"} · ${seasonName}`,
        radius: place.id === state.selectedId ? 12 : 8,
        fill: 0x0b3d91,
      });
    }

    const friendDots: PointDatum[] = [];
    if (state.showFriends) {
      const stacks = new Map<string, number>();
      for (const person of friends) {
        for (const trip of person.trips) {
          if (trip.season !== state.season) continue;
          const place = lookupPlace(trip.placeId);
          if (!place) continue;
          const index = stacks.get(place.id) ?? 0;
          stacks.set(place.id, index + 1);
          friendDots.push({
            latitude: place.lat + index * 0.04,
            longitude: place.lng + 0.05,
            placeId: place.id,
            tooltip: `${person.name}\n${place.name}`,
            radius: 7,
            fill: 0xe39b12,
          });
        }
      }
    }
    setPoints(api, "spots", spots);
    setPoints(api, "pals", friendDots);
  };

  zoomRef.current = () => {
    const api = apiRef.current;
    if (!api?.ready) return;
    const token = (zoomToken.current += 1);
    const mode = state.mapMode;
    const homeChanged = state.homeTick !== prevHomeRef.current;
    api.chart.set("paddingRight", panelOpen ? 430 : 20);
    // Padding changes the plot size on the next frame. Zoom after that so a
    // small country lands in the map beside the panel, not underneath it.
    requestAnimationFrame(() => {
      if (token !== zoomToken.current || !apiRef.current?.ready) return;
      prevModeRef.current = mode;
      prevHomeRef.current = state.homeTick;
      const chart = api.chart;
      // rotateX brings the other hemisphere in when you drag or scroll past the edge.
      chart.set("panX", "rotateX");
      chart.set("wheelX", "rotateX");
      chart.set("wheelSensitivity", 0.7);
      if (mode === "abroad") {
        const item = state.abroadIso ? polygonItem(api.polygons, state.abroadIso) : undefined;
        if (item) {
          focusedRef.current = true;
          api.polygons.zoomToDataItem(item);
          return;
        }
        if (focusedRef.current || (homeChanged && !resting(chart))) chart.goHome(400);
        focusedRef.current = false;
        return;
      }
      if (state.emptyGeo) {
        focusedRef.current = true;
        const item = polygonItem(api.polygons, state.emptyGeo.iso);
        if (item) api.polygons.zoomToDataItem(item);
        return;
      }
      if (!selected) {
        if (focusedRef.current || (homeChanged && !resting(chart))) chart.goHome(400);
        focusedRef.current = false;
        return;
      }
      focusedRef.current = true;
      if (selected.kind === "country" && selected.iso === "US") {
        // The lower 48 (Alaska and Hawaii would zoom the map out to half the world).
        chart.zoomToGeoBounds({ left: -126, right: -66, top: 50, bottom: 23.5 }, 450);
        return;
      }
      if (selected.kind === "country") {
        const item = polygonItem(api.polygons, selected.iso);
        if (item) {
          api.polygons.zoomToDataItem(item);
          return;
        }
        chart.zoomToGeoPoint({ longitude: selected.lng, latitude: selected.lat }, 6, true, 450);
        return;
      }
      chart.zoomToGeoPoint({ longitude: selected.lng, latitude: selected.lat }, selected.iso === "US" ? 16 : 12, true, 450);
    });
  };

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const root = am5.Root.new(host);
    const chart = root.container.children.push(
      am5map.MapChart.new(root, {
        projection: am5map.geoMercator(),
        panX: "rotateX",
        panY: "translateY",
        wheelX: "rotateX",
        wheelY: "zoom",
        wheelSensitivity: 0.7,
        pinchZoom: true,
        zoomStep: 1.08,
        maxZoomLevel: 800,
        minZoomLevel: 1,
        // 0 keeps a zoomed-out world from sliding off the frame. A slide leaves a
        // rectangle of the ocean background where the continents were.
        maxPanOut: 0,
        homeZoomLevel: 1,
      }),
    );
    // The sphere clip is cached in screen space. Turning the map leaves it behind,
    // so a rectangle of ocean shows where a continent should be. Redraw it on every move.
    const refreshClip = () => {
      const mask = (chart as unknown as { _outlineMask?: { set(key: string, value: unknown): void } })._outlineMask;
      const path = chart.getPrivate("geoPath");
      if (!mask || !path) return;
      mask.set("draw", (display: unknown) => {
        const geo = path as unknown as { context(value: unknown): void; (feature: { type: string }): void };
        geo.context(display);
        geo({ type: "Sphere" });
        geo.context(null);
      });
    };
    chart.on("rotationX", refreshClip);
    chart.on("zoomLevel", refreshClip);
    chart.on("translateX", refreshClip);
    chart.on("translateY", refreshClip);
    const background = am5.Rectangle.new(root, { fill: am5.color(SEA.light), fillOpacity: 1, interactive: true });
    chart.set("background", background);
    chart.set("zoomControl", am5map.ZoomControl.new(root, { x: 12, centerX: 0, y: 12, centerY: 0 }));

    const polygons = chart.series.push(
      am5map.MapPolygonSeries.new(root, {
        geoJSON: worldHigh,
        exclude: ["AQ"],
      }),
    );
    polygons.mapPolygons.template.setAll({
      interactive: true,
      cursorOverStyle: "pointer",
      fill: am5.color(LAND.light),
      stroke: am5.color(LINE.light),
      strokeWidth: 0.7,
      tooltipText: "{name}",
    });
    polygons.mapPolygons.template.states.create("hover", { fillOpacity: 0.86 });
    const dropOrDismiss = () => {
      if (Date.now() - pointGuard.current < 120) return;
      if (!openRef.current) return;
      if (modeRef.current === "abroad") dispatch({ type: "selectAbroad", iso: null });
      else dispatch({ type: "select", id: null });
    };
    polygons.mapPolygons.template.events.on("click", (event) => {
      pointGuard.current = Date.now();
      const ctx = event.target.dataItem?.dataContext as { id?: string; name?: string } | undefined;
      if (!ctx?.id) return;
      if (modeRef.current === "abroad") {
        dispatch({ type: "selectAbroad", iso: programsIn(ctx.id, abroadTermRef.current).length ? ctx.id : null });
        return;
      }
      const country = COUNTRY_BY_ISO.get(ctx.id);
      if (country) dispatch({ type: "select", id: country.id });
      else dispatch({ type: "selectEmpty", iso: ctx.id, name: ctx.name ?? ctx.id });
    });
    background.events.on("click", () => dropOrDismiss());

    // U.S. state borders, shown when you're looking at the United States.
    const states = chart.series.push(am5map.MapPolygonSeries.new(root, { geoJSON: usaLow, visible: false }));
    states.mapPolygons.template.setAll({ interactive: false, fillOpacity: 0, stroke: am5.color(0x9aa7b8), strokeWidth: 0.6, strokeOpacity: 0.9 });

    const spots = chart.series.push(am5map.MapPointSeries.new(root, { latitudeField: "latitude", longitudeField: "longitude" }));
    const pals = chart.series.push(am5map.MapPointSeries.new(root, { latitudeField: "latitude", longitudeField: "longitude" }));
    const attach = (series: am5map.MapPointSeries) => {
      series.bullets.push((bulletRoot, _series, dataItem) => {
        const ctx = dataItem.dataContext as PointDatum | undefined;
        const r = ctx?.radius ?? 5;
        const box = am5.Container.new(bulletRoot, { cursorOverStyle: "pointer", tooltipText: "{tooltip}", interactive: true });
        box.children.push(
          am5.Circle.new(bulletRoot, {
            radius: r,
            fill: am5.color(ctx?.fill ?? 0x163e78),
            stroke: am5.color(0xffffff),
            strokeWidth: 1.5,
          }),
        );
        if (ctx?.icon) {
          const size = Math.max(7, r * 1.15);
          box.children.push(
            am5.Graphics.new(bulletRoot, {
              svgPath: ICON_PATH[ctx.icon],
              fill: am5.color(0xffffff),
              scale: size / 12,
              dx: -size / 2,
              dy: -size / 2,
            }),
          );
        }
        if (ctx?.label) {
          box.children.push(
            am5.Label.new(bulletRoot, {
              text: ctx.label,
              fontSize: 11,
              fontWeight: "600",
              fill: am5.color(0x1b2430),
              centerY: am5.p50,
              dx: r + 3,
              background: am5.RoundedRectangle.new(bulletRoot, { fill: am5.color(0xffffff), fillOpacity: 0.8, cornerRadiusTL: 3, cornerRadiusTR: 3, cornerRadiusBL: 3, cornerRadiusBR: 3 }),
              paddingLeft: 3,
              paddingRight: 3,
              paddingTop: 1,
              paddingBottom: 1,
            }),
          );
        }
        box.events.on("click", () => {
          pointGuard.current = Date.now();
          if (ctx?.iso) dispatch({ type: "selectAbroad", iso: ctx.iso });
          else if (ctx?.placeId) dispatch({ type: "select", id: ctx.placeId });
        });
        return am5.Bullet.new(bulletRoot, { sprite: box });
      });
    };
    attach(spots);
    attach(pals);

    const api: Api = { root, chart, polygons, spots, pals, states, background, ready: false, seen: new Set(), drawn: { spots: "", pals: "" } };
    apiRef.current = api;
    polygons.events.on("datavalidated", () => {
      const seen = new Set<string>();
      polygons.mapPolygons.each((polygon) => {
        const id = (polygon.dataItem?.dataContext as { id?: string } | undefined)?.id;
        if (id) seen.add(id);
      });
      api.seen = seen;
      api.ready = true;
      paintRef.current();
      // A freshly mounted map (e.g. opened from "Reviews of …" on a trip) settles its size and home
      // position over its first frames; zooming before that lands in the wrong place. Wait for it.
      root.events.once("frameended", () => window.setTimeout(() => zoomRef.current(), 60));
    });

    return () => {
      root.dispose();
      apiRef.current = null;
    };
  }, [dispatch]);

  useEffect(() => {
    paintRef.current();
  }, [state.theme, state.season, state.filters, state.showFriends, state.selectedId, state.mapMode, state.abroadIso, state.abroadTerm, state.abroadFilters, passed, friends, maxCountry, plansVersion, reviewsVersion]);

  useEffect(() => {
    zoomRef.current();
  }, [state.selectedId, state.emptyGeo, state.homeTick, state.mapMode, state.abroadIso, panelOpen, selected]);

  return <div className="map" ref={hostRef} />;
}
