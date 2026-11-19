import { useEffect, useState } from "react";
import { lookupPlace } from "../data";
import { account, useAccount, useMe } from "../account/account";
import { formatRange } from "../logic";
import { reviews as reviewApi } from "../reviews/store";
import { useTripTable } from "../store";
import type { Trip } from "../types";
import { clock, dayLabel, flightLabel, readInvite, type Invite } from "./tripLogic";
import "./trip.css";

/** Shown when someone opens an invite link (?join=…): adds the trip to their own itinerary. */
export function JoinTrip() {
  const { state, dispatch } = useTripTable();
  const me = useMe();
  const { friends } = useAccount();
  const [invite, setInvite] = useState<Invite | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const inv = readInvite(params.get("join"));
    if (params.has("join")) {
      try {
        // Keep the link around until they decide, but out of the address bar.
        sessionStorage.setItem("triptable-join", params.get("join") ?? "");
        params.delete("join");
        history.replaceState(null, "", `${location.pathname}${params.toString() ? `?${params}` : ""}${location.hash}`);
      } catch {
        /* ignore */
      }
    }
    const saved = inv ?? readInvite(sessionStorage.getItem("triptable-join"));
    setInvite(saved);
  }, []);

  if (!invite) return null;
  const place = lookupPlace(invite.p);
  if (!place) return null;
  const fromSelf = me.signedIn && invite.i === me.id;
  const already = state.trips.find((t) => t.placeId === invite.p && t.start === invite.a);
  const isFriend = friends.some((f) => f.netid === invite.i);

  function close() {
    try {
      sessionStorage.removeItem("triptable-join");
    } catch {
      /* ignore */
    }
    setInvite(null);
  }

  async function join() {
    if (!invite) return;
    setBusy(true);
    const trip: Trip = {
      id: already?.id ?? `trip-${invite.p}-${invite.a}`,
      placeId: invite.p,
      season: invite.s,
      start: invite.a,
      end: invite.b,
      note: already?.note ?? "",
      friendNetids: Array.from(new Set([...(already?.friendNetids ?? []), ...(invite.i ? [invite.i] : [])])),
      flights: already?.flights?.length ? already.flights : invite.f.map((f) => ({ ...f, id: `f-${Math.random().toString(36).slice(2, 9)}` })),
      checklist: already?.checklist ?? [],
    };
    dispatch({ type: "saveTrip", trip, message: invite.n === "A friend" ? `Joined the ${place!.name} trip` : `Joined ${invite.n}'s ${place!.name} trip` });
    if (me.signedIn && invite.i && !isFriend && invite.i !== me.id) await account.request(invite.i);
    setBusy(false);
    close();
    dispatch({ type: "openTrip", id: trip.id });
  }

  return (
    <div className="bf-overlay" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <section className="fb jt" role="dialog" aria-modal="true" aria-labelledby="jt-title">
        <p className="kicker">Trip invite</p>
        <h2 id="jt-title">
          {fromSelf ? "This is your own invite link" : invite.n === "A friend" ? `You're invited to ${place.name}` : `${invite.n} invited you to ${place.name}`}
        </h2>
        <p>
          {formatRange(invite.a, invite.b)} · {place.region}
        </p>
        {invite.f.length ? (
          <ul className="jt-flights">
            {invite.f.map((f) => (
              <li key={f.id}>
                ✈ {f.dir === "out" ? "Going" : "Back"}: {flightLabel(f)} {f.dir === "out" ? "from" : "into"} {f.airport}
                {f.date ? `, ${dayLabel(f.date)}` : ""}
                {f.time ? ` ${clock(Number(f.time.split(":")[0]) * 60 + Number(f.time.split(":")[1]))}` : ""}
              </li>
            ))}
          </ul>
        ) : null}
        {fromSelf ? (
          <p className="fine">Send it to friends. When they open it, the trip lands in their itinerary.</p>
        ) : (
          <p className="fine">
            Joining adds this trip{invite.f.length ? " and its flights" : ""} to your itinerary so you get your own leave-by time.
            {me.signedIn
              ? invite.i && !isFriend
                ? ` We'll also send ${invite.n} a friend request.`
                : ""
              : " Sign in with your Yale account to also connect as friends."}
          </p>
        )}
        <div className="plan-actions">
          {fromSelf ? (
            <button className="primary" type="button" onClick={close}>
              Got it
            </button>
          ) : (
            <>
              <button className="primary" type="button" disabled={busy} onClick={() => void join()}>
                {already ? "Update my trip" : "Join trip"}
              </button>
              {!me.signedIn ? (
                <button type="button" onClick={() => void reviewApi.signInWithGoogle()}>
                  Sign in first
                </button>
              ) : null}
              <button className="textlink" type="button" onClick={close}>
                Not now
              </button>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
