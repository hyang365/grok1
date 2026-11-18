import * as am5 from "@amcharts/amcharts5";
import * as am5map from "@amcharts/amcharts5/map";
import worldHigh from "@amcharts/amcharts5-geodata/worldHigh";
import { useEffect, useRef } from "react";
import { COUNTRY_BY_ISO, PLACE_BY_ID, PLACES } from "./data";
import { heatColor, seasonLabel, visitCount } from "./logic";
import { useCatalog, useFriends, useTripTable } from "./store";
import { usePlans } from "./live/plans";
import { ABROAD_CITIES, maxPerCountry, offeredIn, programsIn } from "./abroad/data";

type PointDatum = {
  latitude: number;
  longitude: number;
  placeId: string;
  tooltip: string;
  radius: number;
  fill: number;
  iso?: string;
};

type Api = {
  root: am5.Root;
  chart: am5map.MapChart;
  polygons: am5map.MapPolygonSeries;
  spots: am5map.MapPointSeries;
  pals: am5map.MapPointSeries;
  background: am5.Rectangle;
  ready: boolean;
  seen: Set<string>;
};

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
  const panelOpen = abroad ? Boolean(state.abroadIso) : Boolean(state.selectedId || state.emptyGeo);
  const selected = state.selectedId ? PLACE_BY_ID.get(state.selectedId) : undefined;

  paintRef.current = () => {
    const api = apiRef.current;
    if (!api?.ready) return;
    const dark = state.theme === "dark";
    const seasonName = seasonLabel(state.season);
    api.background.set("fill", am5.color(dark ? 0x121820 : 0xe8f1fb));
    if (abroad) {
      const term = state.abroadTerm;
      const maxN = maxPerCountry(term);
      const termLabel = term === "Summer" ? "summer" : `${term.toLowerCase()} semester`;
      api.polygons.mapPolygons.each((polygon) => {
        const ctx = polygon.dataItem?.dataContext as { id?: string; name?: string } | undefined;
        const n = ctx?.id ? programsIn(ctx.id, term).length : 0;
        const isSelected = Boolean(ctx?.id && ctx.id === state.abroadIso);
        polygon.set("fill", am5.color(n ? heatColor(n, maxN, dark) : dark ? 0x2a2a2a : 0xf3f3f3));
        polygon.set("stroke", am5.color(isSelected ? (dark ? 0xffffff : 0x141414) : dark ? 0x1a1a1a : 0xffffff));
        polygon.set("strokeWidth", isSelected ? 1.8 : 0.55);
        polygon.set("tooltipText", n ? `${ctx?.name ?? ""}\n${n} ${termLabel} ${n === 1 ? "program" : "programs"}` : (ctx?.name ?? ""));
      });
      const spots: PointDatum[] = [];
      for (const city of ABROAD_CITIES) {
        const progs = city.programs.filter((p) => offeredIn(p, term));
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
      api.spots.data.setAll(spots);
      api.pals.data.setAll([]);
      return;
    }
    api.polygons.mapPolygons.each((polygon) => {
      const ctx = polygon.dataItem?.dataContext as { id?: string; name?: string } | undefined;
      const country = ctx?.id ? COUNTRY_BY_ISO.get(ctx.id) : undefined;
      const count = country ? visitCount(country, state.season) : 0;
      const on = Boolean(country && passed.has(country.id));
      const isSelected = country?.id === state.selectedId;
      polygon.set("fill", am5.color(on && country && count > 0 ? heatColor(count, maxCountry, dark) : dark ? 0x2a2a2a : 0xf3f3f3));
      polygon.set("stroke", am5.color(isSelected ? (dark ? 0xffffff : 0x141414) : dark ? 0x1a1a1a : 0xffffff));
      polygon.set("strokeWidth", isSelected ? 1.8 : 0.55);
      polygon.set(
        "tooltipText",
        on && country ? `${country.name}\n${count ? `${count.toLocaleString("en-US")} planning` : "No plans yet"} · ${seasonName}` : (ctx?.name ?? ""),
      );
    });

    const spotCounts = PLACES.filter((place) => place.kind === "spot").map((place) => visitCount(place, state.season));
    const maxSpot = Math.max(1, ...spotCounts);
    const spots: PointDatum[] = [];
    for (const place of PLACES) {
      if (place.kind !== "spot" || !passed.has(place.id)) continue;
      const show =
        place.iso === "US" ||
        Boolean(selected && (place.parentId === selected.id || place.parentId === selected.parentId || place.id === selected.id));
      if (!show) continue;
      const count = visitCount(place, state.season);
      const scale = Math.sqrt(count / maxSpot);
      spots.push({
        latitude: place.lat,
        longitude: place.lng,
        placeId: place.id,
        tooltip: `${place.name}\n${count ? `${count.toLocaleString("en-US")} planning` : "No plans yet"}`,
        radius: (place.id === state.selectedId ? 8 : 4) + scale * 7,
        fill: place.id === state.selectedId ? 0x0b3d91 : 0x163e78,
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
          const place = PLACE_BY_ID.get(trip.placeId);
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
    api.spots.data.setAll(spots);
    api.pals.data.setAll(friendDots);
  };

  zoomRef.current = () => {
    const api = apiRef.current;
    if (!api?.ready) return;
    const token = (zoomToken.current += 1);
    api.chart.set("paddingRight", panelOpen ? 430 : 20);
    // Padding changes the plot size on the next frame. Zoom after that so a
    // small country lands in the map beside the panel, not underneath it.
    requestAnimationFrame(() => {
      if (token !== zoomToken.current || !apiRef.current?.ready) return;
      const chart = api.chart;
      if (abroad) {
        const item = state.abroadIso ? polygonItem(api.polygons, state.abroadIso) : undefined;
        if (item) api.polygons.zoomToDataItem(item);
        else if (state.homeTick > 0 || !state.abroadIso) chart.goHome(400);
        return;
      }
      if (state.emptyGeo) {
        const item = polygonItem(api.polygons, state.emptyGeo.iso);
        if (item) api.polygons.zoomToDataItem(item);
        return;
      }
      if (!selected) {
        if (state.homeTick > 0) chart.goHome(400);
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
        panX: "translateX",
        panY: "translateY",
        wheelY: "zoom",
        pinchZoom: true,
        zoomStep: 1.08,
        maxZoomLevel: 40,
        minZoomLevel: 1,
        homeGeoPoint: { longitude: -18, latitude: 18 },
        homeZoomLevel: 1,
      }),
    );
    const background = am5.Rectangle.new(root, { fill: am5.color(0xe8f1fb), fillOpacity: 1 });
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
      fill: am5.color(0xf3f3f3),
      stroke: am5.color(0xffffff),
      strokeWidth: 0.55,
      tooltipText: "{name}",
    });
    polygons.mapPolygons.template.states.create("hover", { fillOpacity: 0.86 });
    polygons.mapPolygons.template.events.on("click", (event) => {
      if (Date.now() - pointGuard.current < 50) return;
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

    const spots = chart.series.push(am5map.MapPointSeries.new(root, { latitudeField: "latitude", longitudeField: "longitude" }));
    const pals = chart.series.push(am5map.MapPointSeries.new(root, { latitudeField: "latitude", longitudeField: "longitude" }));
    const attach = (series: am5map.MapPointSeries) => {
      series.bullets.push((bulletRoot) => {
        const circle = am5.Circle.new(bulletRoot, {
          radius: 5,
          fill: am5.color(0x163e78),
          stroke: am5.color(0xffffff),
          strokeWidth: 1.5,
          cursorOverStyle: "pointer",
          tooltipText: "{tooltip}",
        });
        circle.adapters.add("radius", (_radius, target) => {
          const ctx = target.dataItem?.dataContext as PointDatum | undefined;
          return ctx?.radius ?? 5;
        });
        circle.adapters.add("fill", (_fill, target) => {
          const ctx = target.dataItem?.dataContext as PointDatum | undefined;
          return am5.color(ctx?.fill ?? 0x163e78);
        });
        circle.events.on("click", (event) => {
          pointGuard.current = Date.now();
          const ctx = event.target.dataItem?.dataContext as PointDatum | undefined;
          if (ctx?.iso) dispatch({ type: "selectAbroad", iso: ctx.iso });
          else if (ctx?.placeId) dispatch({ type: "select", id: ctx.placeId });
        });
        return am5.Bullet.new(bulletRoot, { sprite: circle });
      });
    };
    attach(spots);
    attach(pals);

    const api: Api = { root, chart, polygons, spots, pals, background, ready: false, seen: new Set() };
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
      zoomRef.current();
    });

    return () => {
      root.dispose();
      apiRef.current = null;
    };
  }, [dispatch]);

  useEffect(() => {
    paintRef.current();
  }, [state.theme, state.season, state.filters, state.showFriends, state.selectedId, state.mapMode, state.abroadIso, state.abroadTerm, passed, friends, maxCountry, plansVersion]);

  useEffect(() => {
    zoomRef.current();
  }, [state.selectedId, state.emptyGeo, state.homeTick, state.mapMode, state.abroadIso, panelOpen, selected]);

  return <div className="map" ref={hostRef} />;
}
