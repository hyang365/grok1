import { useEffect, useMemo, useState } from "react";
import { PLACE_BY_ID, PLACES } from "../data";
import { estimate, type Estimate } from "../budget";
import { CONTINENTS, FEATURES, averageTempC, continentsOf, formatMoney, scoreOf, seasonLabel, travelGuidance, visitCount } from "../logic";
import { useReviewStore } from "../reviews/store";
import { useTripTable } from "../store";
import type { Place, Season } from "../types";
import "./budget.css";

const NIGHTS: Record<Season, number> = { spring: 7, summer: 10, fall: 4, winter: 7, weekend: 2 };
const PRESETS = [500, 1000, 2000, 3500];

type Pick = { place: Place; est: Estimate; score: number; why: string[] };

function featureHit(place: Place, id: string): boolean {
  const f = FEATURES.find((x) => x.id === id);
  return Boolean(f && f.tags.some((t) => place.tags.includes(t)));
}

export function BudgetFinder({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useTripTable();
  const { version } = useReviewStore();
  const [budget, setBudget] = useState(1500);
  const [nights, setNights] = useState(NIGHTS[state.season]);
  const [travelers, setTravelers] = useState(2);
  const [likes, setLikes] = useState<string[]>([]);
  const [where, setWhere] = useState<string>("");

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  const { fits, stretch } = useMemo(() => {
    const out: Pick[] = [];
    for (const place of PLACES) {
      if (place.kind !== "spot") continue;
      if (travelGuidance(place.iso).level === "blocked") continue;
      if (where && !continentsOf(place).includes(where)) continue;
      const est = estimate(place, nights, travelers);
      if (state.season === "weekend" && est.travel > 700) continue;
      const why: string[] = [];
      let score = 0;
      const matched = likes.filter((id) => featureHit(place, id));
      if (likes.length && matched.length === 0) continue;
      score += matched.length * 2;
      for (const id of matched) why.push(FEATURES.find((f) => f.id === id)?.label ?? id);
      const temp = averageTempC(place.lat, state.season);
      if (featureHit(place, "beach")) {
        if (temp >= 24) {
          score += 1;
          why.push("Beach weather");
        } else if (temp < 18) score -= 1.5;
      }
      const rating = scoreOf(place.id, "overall");
      if (rating !== null) {
        score += (rating - 3) * 0.8;
        why.push(`Rated ${rating.toFixed(1)}`);
      }
      const plans = visitCount(place, state.season);
      if (plans > 0) {
        score += Math.min(2, Math.log10(plans + 1));
        why.push(`${plans} Yale ${plans === 1 ? "plan" : "plans"}`);
      }
      // Prefer trips that use the budget well over ones that are far cheaper or right at the edge.
      const use = est.total / budget;
      score += use <= 1 ? 1 - Math.abs(0.75 - use) : -1;
      out.push({ place, est, score, why });
    }
    out.sort((a, b) => b.score - a.score || a.est.total - b.est.total);
    // Keep the list varied: at most two picks per country.
    const varied = (list: Pick[], n: number) => {
      const per = new Map<string, number>();
      const res: Pick[] = [];
      for (const p of list) {
        const k = p.place.parentId ?? p.place.id;
        if ((per.get(k) ?? 0) >= 2) continue;
        per.set(k, (per.get(k) ?? 0) + 1);
        res.push(p);
        if (res.length >= n) break;
      }
      return res;
    };
    return {
      fits: varied(out.filter((p) => p.est.total <= budget), 12),
      stretch: varied(out.filter((p) => p.est.total > budget && p.est.total <= budget * 1.15), 3),
    };
    // reviews version keeps ratings fresh
  }, [budget, nights, travelers, likes, where, state.season, version]); // eslint-disable-line react-hooks/exhaustive-deps

  function open(place: Place) {
    dispatch({ type: "setView", view: "map" });
    dispatch({ type: "select", id: place.id });
    onClose();
  }

  return (
    <div className="bf-overlay" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section className="bf" role="dialog" aria-modal="true" aria-labelledby="bf-title">
        <header className="bf-head">
          <div>
            <h2 id="bf-title">Trip finder</h2>
            <p className="fine">
              Places that fit your budget for {seasonLabel(state.season)}, counting round-trip travel from New Haven, a shared room, and food and activities.
            </p>
          </div>
          <button className="icon-btn" type="button" aria-label="Close trip finder" onClick={onClose}>
            ×
          </button>
        </header>

        <div className="bf-form">
          <label className="bf-field bf-budget">
            <span>Budget per person</span>
            <div className="bf-money">
              <span>$</span>
              <input type="number" min={100} max={20000} step={50} value={budget} onChange={(e) => setBudget(Math.max(0, Number(e.target.value) || 0))} />
            </div>
            <div className="bf-presets">
              {PRESETS.map((p) => (
                <button key={p} type="button" className={budget === p ? "on" : ""} onClick={() => setBudget(p)}>
                  {formatMoney(p)}
                </button>
              ))}
            </div>
          </label>
          <label className="bf-field">
            <span>
              Nights <strong>{nights}</strong>
            </span>
            <input type="range" min={1} max={14} value={nights} onChange={(e) => setNights(Number(e.target.value))} />
          </label>
          <label className="bf-field">
            <span>Travelers</span>
            <select value={travelers} onChange={(e) => setTravelers(Number(e.target.value))}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <option key={n} value={n}>
                  {n === 1 ? "Just me" : `${n} people`}
                </option>
              ))}
            </select>
          </label>
          <label className="bf-field">
            <span>Where</span>
            <select value={where} onChange={(e) => setWhere(e.target.value)}>
              <option value="">Anywhere</option>
              {CONTINENTS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <div className="bf-field bf-likes">
            <span>Looking for</span>
            <div className="chips">
              {FEATURES.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={likes.includes(f.id) ? "on" : ""}
                  aria-pressed={likes.includes(f.id)}
                  onClick={() => setLikes((l) => (l.includes(f.id) ? l.filter((x) => x !== f.id) : [...l, f.id]))}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bf-results">
          {fits.length === 0 ? (
            <p className="empty">Nothing fits yet. Try a bigger budget, fewer nights, more travelers to split rooms, or fewer filters.</p>
          ) : (
            <ol className="bf-list">
              {fits.map((p) => (
                <PickCard key={p.place.id} pick={p} budget={budget} onOpen={open} />
              ))}
            </ol>
          )}
          {stretch.length ? (
            <>
              <h3 className="bf-sub">A little over budget</h3>
              <ol className="bf-list">
                {stretch.map((p) => (
                  <PickCard key={p.place.id} pick={p} budget={budget} onOpen={open} />
                ))}
              </ol>
            </>
          ) : null}
          <p className="fine bf-note">
            Rough planning estimates, not quotes. Fares change daily, so check real prices with "Plan getting there from Yale" on each place. Places Yale doesn't sponsor are left out.
          </p>
        </div>
      </section>
    </div>
  );
}

function PickCard({ pick, budget, onOpen }: { pick: Pick; budget: number; onOpen: (p: Place) => void }) {
  const { place, est, why } = pick;
  const parent = place.parentId ? PLACE_BY_ID.get(place.parentId) : undefined;
  const diff = budget - est.total;
  return (
    <li className="bf-card">
      <button type="button" onClick={() => onOpen(place)}>
        <div className="bf-top">
          <div>
            <strong>{place.name}</strong>
            <span className="fine">{parent?.name}</span>
          </div>
          <div className="bf-price">
            <strong>≈ {formatMoney(est.total)}</strong>
            <span className={diff >= 0 ? "under" : "over"}>{diff >= 0 ? `${formatMoney(diff)} under` : `${formatMoney(-diff)} over`}</span>
          </div>
        </div>
        <p className="bf-blurb">{place.blurb}</p>
        <p className="fine bf-break">
          {formatMoney(est.travel)} {est.how} · {formatMoney(est.stay)} stay · {formatMoney(est.daily)} food &amp; fun
        </p>
        {why.length ? (
          <ul className="tags">
            {why.slice(0, 4).map((w) => (
              <li key={w} className="tag">
                {w}
              </li>
            ))}
          </ul>
        ) : null}
      </button>
    </li>
  );
}
