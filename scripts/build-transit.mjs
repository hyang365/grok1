// Builds public/transit-static.json from the official GTFS schedule files, so live feeds
// (which only carry IDs) can be shown with stop names, route numbers and destinations.
// Runs in CI before `vite build`. Never fails the build: if a download breaks, the site
// falls back to the small built-in tables in src/transit/fallback.ts.
//
//   node scripts/build-transit.mjs            download and build
//   node scripts/build-transit.mjs --ct a.zip --mnr b.zip   use local zips (testing)

import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CT_URL = "https://www.cttransit.com/sites/default/files/gtfs/googlect_transit.zip";
const MNR_URL = "https://rrgtfsfeeds.s3.amazonaws.com/gtfsmnr.zip";

// Places Yale students wait for buses. Stops within RADIUS of any of these are kept.
const ANCHORS = [
  { name: "Old Campus", lat: 41.3083, lng: -72.9279 },
  { name: "Cross Campus", lat: 41.3115, lng: -72.9265 },
  { name: "Science Hill", lat: 41.3165, lng: -72.923 },
  { name: "Medical campus", lat: 41.3036, lng: -72.9341 },
  { name: "Union Station", lat: 41.2975, lng: -72.9265 },
];
const RADIUS_M = 450;
const MNR_STOPS = new Set(["149", "151"]); // New Haven Union Station, New Haven State St

const args = process.argv.slice(2);
const local = (flag) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : null;
};

function meters(a, b) {
  const r = (x) => (x * Math.PI) / 180;
  const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

// Minimal CSV parser that handles quoted fields with commas and doubled quotes.
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  const header = (rows.shift() ?? []).map((h) => h.replace(/^﻿/, "").trim());
  return rows.map((r) => Object.fromEntries(header.map((h, i) => [h, (r[i] ?? "").trim()])));
}

function readZip(zip, file) {
  try {
    return execFileSync("unzip", ["-p", zip, file], { maxBuffer: 1024 * 1024 * 1024 }).toString("utf8");
  } catch {
    return "";
  }
}

async function download(url, dir, name) {
  const path = join(dir, name);
  const res = await fetch(url, { headers: { "User-Agent": "TripTable build (github.com/hyang365/grok1)" } });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  writeFileSync(path, Buffer.from(await res.arrayBuffer()));
  return path;
}

function buildCt(zip) {
  const stops = parseCsv(readZip(zip, "stops.txt"));
  const near = stops
    .map((s) => ({ s, d: Math.min(...ANCHORS.map((a) => meters(a, { lat: Number(s.stop_lat), lng: Number(s.stop_lon) }))) }))
    .filter(({ d, s }) => d <= RADIUS_M && s.location_type !== "1")
    .sort((a, b) => a.d - b.d)
    .slice(0, 60)
    .map(({ s }) => ({ id: s.stop_id, name: s.stop_name, lat: Number(s.stop_lat), lng: Number(s.stop_lon) }));
  const nearIds = new Set(near.map((s) => s.id));

  const routes = {};
  for (const r of parseCsv(readZip(zip, "routes.txt"))) {
    routes[r.route_id] = { short: r.route_short_name || r.route_id, long: r.route_long_name || "", color: r.route_color ? `#${r.route_color}` : "" };
  }

  const tripIds = new Set();
  const stopTimes = readZip(zip, "stop_times.txt");
  const lines = stopTimes.split(/\r?\n/);
  const head = (lines[0] ?? "").replace(/^﻿/, "").split(",");
  const ti = head.indexOf("trip_id");
  const si = head.indexOf("stop_id");
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    if (nearIds.has(cols[si])) tripIds.add(cols[ti]);
  }

  const trips = {};
  for (const t of parseCsv(readZip(zip, "trips.txt"))) {
    if (tripIds.has(t.trip_id)) trips[t.trip_id] = [t.route_id, t.trip_headsign || ""];
  }
  const usedRoutes = Object.fromEntries(Object.entries(routes).filter(([id]) => Object.values(trips).some(([r]) => r === id)));
  return { stops: near, routes: Object.keys(usedRoutes).length ? usedRoutes : routes, trips };
}

function buildMnr(zip) {
  const stops = {};
  for (const s of parseCsv(readZip(zip, "stops.txt"))) stops[s.stop_id] = s.stop_name;
  const tripIds = new Set();
  const lines = readZip(zip, "stop_times.txt").split(/\r?\n/);
  const head = (lines[0] ?? "").replace(/^﻿/, "").split(",");
  const ti = head.indexOf("trip_id");
  const si = head.indexOf("stop_id");
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    if (MNR_STOPS.has(cols[si])) tripIds.add(cols[ti]);
  }
  const trips = {};
  for (const t of parseCsv(readZip(zip, "trips.txt"))) {
    if (tripIds.has(t.trip_id)) trips[t.trip_id] = [t.trip_headsign || "", t.trip_short_name || ""];
  }
  return { stops, trips };
}

async function main() {
  const dir = mkdtempSync(join(tmpdir(), "gtfs-"));
  const out = { generatedAt: new Date().toISOString(), ct: null, mnr: null };
  try {
    const zip = local("--ct") ?? (await download(CT_URL, dir, "ct.zip"));
    out.ct = buildCt(zip);
    console.log(`CTtransit: ${out.ct.stops.length} stops near campus, ${Object.keys(out.ct.trips).length} trips`);
  } catch (e) {
    console.warn("CTtransit schedule skipped:", e.message);
  }
  try {
    const zip = local("--mnr") ?? (await download(MNR_URL, dir, "mnr.zip"));
    out.mnr = buildMnr(zip);
    console.log(`Metro-North: ${Object.keys(out.mnr.trips).length} trips through New Haven`);
  } catch (e) {
    console.warn("Metro-North schedule skipped:", e.message);
  }
  if (!out.ct && !out.mnr) {
    console.warn("No schedules built; the site will use its built-in fallback tables.");
    return;
  }
  if (!existsSync("public")) mkdirSync("public");
  writeFileSync("public/transit-static.json", JSON.stringify(out));
  console.log("wrote public/transit-static.json");
}

main().catch((e) => {
  console.warn("build-transit failed (non-fatal):", e.message);
});
