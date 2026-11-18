// Supabase Edge Function: a small, allow-listed proxy for live transit feeds that browsers
// can't call directly (no CORS). Decodes GTFS-realtime protobuf to JSON.
// Deploy: supabase functions deploy transit --no-verify-jwt
//
//   GET /functions/v1/transit?feed=ct-trips | ct-vehicles | mnr | amtrak-station | amtrak-train&id=171-18

import GtfsRealtimeBindings from "npm:gtfs-realtime-bindings@1.1.1";

const FeedMessage = GtfsRealtimeBindings.transit_realtime.FeedMessage;

const PB: Record<string, string> = {
  "ct-trips": "https://cttprdtmgtfs.ctttrpcloud.com/TMGTFSRealTimeWebService/TripUpdate/TripUpdates.pb",
  "ct-vehicles": "https://cttprdtmgtfs.ctttrpcloud.com/TMGTFSRealTimeWebService/Vehicle/VehiclePositions.pb",
  mnr: "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/mnr%2Fgtfs-mnr",
};

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const cache = new Map<string, { at: number; body: string }>();
const TTL_MS = 20_000;

function json(body: string, status = 200) {
  return new Response(body, { status, headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "public, max-age=15" } });
}

async function load(feed: string, id: string | null): Promise<string> {
  if (feed in PB) {
    const res = await fetch(PB[feed]);
    if (!res.ok) throw new Error(`${feed} upstream ${res.status}`);
    const msg = FeedMessage.decode(new Uint8Array(await res.arrayBuffer()));
    const obj = FeedMessage.toObject(msg, { longs: Number }) as { entity?: { tripUpdate?: { stopTimeUpdate?: { stopId?: string }[] } }[] };
    if (feed === "mnr" && obj.entity) {
      // Only trains that call at New Haven (149) or State Street (151).
      obj.entity = obj.entity.filter((e) => e.tripUpdate?.stopTimeUpdate?.some((s) => s.stopId === "149" || s.stopId === "151"));
    }
    return JSON.stringify(obj);
  }
  if (feed === "amtrak-station") {
    const res = await fetch("https://api-v3.amtraker.com/v3/stations/NHV");
    if (!res.ok) throw new Error(`amtrak upstream ${res.status}`);
    return await res.text();
  }
  if (feed === "amtrak-train" && id && /^[0-9A-Za-z-]{1,20}$/.test(id)) {
    const res = await fetch(`https://api-v3.amtraker.com/v3/trains/${id}`);
    if (!res.ok) throw new Error(`amtrak upstream ${res.status}`);
    return await res.text();
  }
  throw new Error("unknown feed");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  const url = new URL(req.url);
  const feed = url.searchParams.get("feed") ?? "";
  const id = url.searchParams.get("id");
  const key = `${feed}:${id ?? ""}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return json(hit.body);
  try {
    const body = await load(feed, id);
    cache.set(key, { at: Date.now(), body });
    return json(body);
  } catch (e) {
    return json(JSON.stringify({ error: String((e as Error).message ?? e) }), feed ? 502 : 400);
  }
});
