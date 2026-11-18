import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { CAMPUS, clockTime, minsUntil, refreshTransit, useLiveTransit, useNow, type SourceStatus, type TrainDeparture } from "./live";
import "./transit.css";

const LINKS = {
  bus: [
    { label: "CTtransit trip planner", url: "https://www.cttransit.com/" },
    { label: "Transit app", url: "https://transitapp.com/" },
  ],
  metroNorth: [{ label: "MTA TrainTime", url: "https://new.mta.info/agency/metro-north-railroad" }],
  amtrak: [{ label: "Amtrak: track your train", url: "https://www.amtrak.com/track-your-train.html" }],
};

function Status({ status, updatedAt, via, now }: { status: SourceStatus; updatedAt: number | null; via: string; now: number }) {
  if (status === "loading") return <span className="tr-pill">Loading…</span>;
  if (status === "unavailable") return <span className="tr-pill off">Live data unavailable</span>;
  const ago = updatedAt ? Math.max(0, Math.round((now - updatedAt) / 1000)) : 0;
  return (
    <span className="tr-pill live" title={via ? `Source: ${via}` : undefined}>
      <i /> Live · {ago < 5 ? "just now" : `${ago}s ago`}
    </span>
  );
}

function Fallback({ links, what }: { links: { label: string; url: string }[]; what: string }) {
  return (
    <div className="tr-fallback">
      <p>
        Couldn't reach live {what} from your browser. The provider may block direct requests. Once the site's proxy is deployed (see README), this fills in
        automatically.
      </p>
      <div className="tr-links">
        {links.map((l) => (
          <a key={l.label} href={l.url} target="_blank" rel="noreferrer">
            {l.label} ↗
          </a>
        ))}
      </div>
    </div>
  );
}

export function TrainBoard({ departures, now, limit = 8 }: { departures: TrainDeparture[]; now: number; limit?: number }) {
  if (!departures.length) return <p className="fl-muted fl-small">No departures in the feed right now.</p>;
  return (
    <ul className="tr-board">
      {departures.slice(0, limit).map((d) => (
        <li key={d.key}>
          <span className="tr-when">
            <b>{minsUntil(d.at, now)}</b>
            <small>{clockTime(d.at)}</small>
          </span>
          <span className="tr-what">
            <strong>{d.to || d.train}</strong>
            <small>
              {d.train} · {d.station}
            </small>
          </span>
          <span className={d.delayMin && d.delayMin > 1 ? "tr-late" : "tr-ok"}>{d.status}</span>
        </li>
      ))}
    </ul>
  );
}

/** Compact "next trains from New Haven" strip, used on the Flights page. */
export function NextTrains() {
  const live = useLiveTransit();
  const now = useNow();
  const all = [...live.metroNorth.departures, ...live.amtrak.departures].sort((a, b) => a.at - b.at);
  const down = live.metroNorth.status === "unavailable" && live.amtrak.status === "unavailable";
  return (
    <div className="fl-card tr-mini">
      <div className="tr-head">
        <h3>Next trains from New Haven</h3>
        <Status status={down ? "unavailable" : live.metroNorth.status === "loading" ? "loading" : "live"} updatedAt={live.updatedAt} via="" now={now} />
      </div>
      {down ? (
        <div className="tr-links">
          {[...LINKS.metroNorth, ...LINKS.amtrak].map((l) => (
            <a key={l.label} href={l.url} target="_blank" rel="noreferrer">
              {l.label} ↗
            </a>
          ))}
        </div>
      ) : (
        <TrainBoard departures={all} now={now} limit={4} />
      )}
    </div>
  );
}

function BusMap({ vehicles, stops }: { vehicles: ReturnType<typeof useLiveTransit>["bus"]["vehicles"]; stops: ReturnType<typeof useLiveTransit>["stops"] }) {
  const host = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!host.current || map.current) return;
    const m = L.map(host.current, { zoomControl: true, attributionControl: true }).setView([CAMPUS.lat, CAMPUS.lng], 15);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(m);
    L.circleMarker([CAMPUS.lat, CAMPUS.lng], { radius: 6, color: "#0b3d91", fillColor: "#0b3d91", fillOpacity: 1 }).bindTooltip("Old Campus").addTo(m);
    layer.current = L.layerGroup().addTo(m);
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    const g = layer.current;
    if (!g) return;
    g.clearLayers();
    for (const s of stops) {
      L.circleMarker([s.lat, s.lng], { radius: 4, color: "#7a7a7a", weight: 1, fillColor: "#fff", fillOpacity: 1 }).bindTooltip(s.name).addTo(g);
    }
    for (const v of vehicles) {
      const color = v.color || "#d92d20";
      const icon = L.divIcon({
        className: "tr-bus",
        html: `<span style="background:${color}">${v.route.replace(/[<>&"]/g, "")}</span>`,
        iconSize: [34, 20],
        iconAnchor: [17, 10],
      });
      L.marker([v.lat, v.lng], { icon }).bindTooltip(`Route ${v.route}${v.headsign ? ` to ${v.headsign}` : ""}`).addTo(g);
    }
  }, [vehicles, stops]);

  return <div className="tr-map" ref={host} />;
}

export function TransitView() {
  const live = useLiveTransit();
  const now = useNow(5_000);
  const [stopFilter, setStopFilter] = useState("all");

  const byStop = useMemo(() => {
    const groups = new Map<string, typeof live.bus.arrivals>();
    for (const a of live.bus.arrivals) {
      if (stopFilter !== "all" && a.stopId !== stopFilter) continue;
      const list = groups.get(a.stopName) ?? [];
      if (list.length < 6) list.push(a);
      groups.set(a.stopName, list);
    }
    return [...groups.entries()];
  }, [live.bus.arrivals, stopFilter]);

  return (
    <div className="tr-page">
      <header className="tr-top">
        <div>
          <h2>Transit</h2>
          <p className="lede">Live buses near campus and trains out of New Haven, refreshed every 30 seconds.</p>
        </div>
        <button type="button" className="fl-ghost" onClick={refreshTransit}>
          Refresh
        </button>
      </header>

      <div className="tr-grid">
        <section className="fl-card tr-buses">
          <div className="tr-head">
            <h3>Buses near campus</h3>
            <Status status={live.bus.status} updatedAt={live.updatedAt} via={live.bus.via} now={now} />
          </div>
          <BusMap vehicles={live.bus.vehicles} stops={live.stops} />
          {live.bus.status === "unavailable" ? (
            <Fallback links={LINKS.bus} what="CTtransit data" />
          ) : (
            <>
              <div className="tr-row">
                <span className="fl-muted fl-small">{live.bus.vehicles.length} buses on the map</span>
                <select value={stopFilter} onChange={(e) => setStopFilter(e.target.value)} aria-label="Stop">
                  <option value="all">All stops near campus</option>
                  {live.stops.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              {byStop.length === 0 && live.bus.status === "live" ? <p className="fl-muted fl-small">No predicted arrivals at these stops in the next 90 minutes.</p> : null}
              <div className="tr-stops">
                {byStop.map(([stop, list]) => (
                  <div key={stop} className="tr-stop">
                    <strong>{stop}</strong>
                    <ul>
                      {list.map((a) => (
                        <li key={a.key}>
                          <span className="tr-route" style={a.color ? { background: a.color } : undefined}>
                            {a.route}
                          </span>
                          <span className="tr-what">{a.headsign || "—"}</span>
                          <b>{minsUntil(a.at, now)}</b>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        <div className="tr-col">
          <section className="fl-card">
            <div className="tr-head">
              <h3>Metro-North to New York</h3>
              <Status status={live.metroNorth.status} updatedAt={live.updatedAt} via={live.metroNorth.via} now={now} />
            </div>
            <p className="fl-muted fl-small">From New Haven Union Station and State Street.</p>
            {live.metroNorth.status === "unavailable" ? <Fallback links={LINKS.metroNorth} what="Metro-North data" /> : <TrainBoard departures={live.metroNorth.departures} now={now} />}
          </section>
          <section className="fl-card">
            <div className="tr-head">
              <h3>Amtrak from New Haven</h3>
              <Status status={live.amtrak.status} updatedAt={live.updatedAt} via={live.amtrak.via} now={now} />
            </div>
            <p className="fl-muted fl-small">Northeast Regional, Acela, Hartford Line and Vermonter trains through Union Station.</p>
            {live.amtrak.status === "unavailable" ? <Fallback links={LINKS.amtrak} what="Amtrak data" /> : <TrainBoard departures={live.amtrak.departures} now={now} />}
            <p className="fl-muted fl-small">Amtrak positions via the community Amtraker API.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
