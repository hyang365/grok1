import { summaryAvg, useReviewStore } from "../reviews/store";
import { useTripTable } from "../store";
import { KIND_LABEL, grantsFor, programsIn } from "./data";
import { matchesQuery, passesAbroad } from "./filters";

export function AbroadMapPanel({ iso }: { iso: string }) {
  const { state, dispatch } = useTripTable();
  useReviewStore();
  const term = state.abroadTerm;
  const q = state.filters.query.trim().toLowerCase();
  const inTerm = programsIn(iso, term);
  const programs = inTerm.filter((p) => passesAbroad(p, state.abroadFilters) && matchesQuery(p, q));
  const termLabel = term === "All" ? "All terms" : term === "Summer" ? "Summer" : `${term} semester`;
  if (!programs.length) {
    return (
      <aside className="panel">
        <div className="panel-scroll">
          <div className="panel-head">
            <h2>{programsIn(iso)[0]?.country ?? "No programs"}</h2>
            <button className="icon-btn" type="button" aria-label="Close" onClick={() => dispatch({ type: "selectAbroad", iso: null })}>×</button>
          </div>
          <p className="fl-muted">
            {inTerm.length
              ? `${inTerm.length} ${inTerm.length === 1 ? "program runs" : "programs run"} here, but none match your filters.`
              : term === "All"
                ? "No Yale-approved programs here."
                : `No Yale-approved programs here for ${termLabel.toLowerCase()}. Try another term at the top.`}
          </p>
        </div>
      </aside>
    );
  }
  const country = programs.find((p) => p.country !== "Multiple countries")?.country ?? programs[0].country;
  const grantNames = [...new Map(programs.flatMap(grantsFor).map((g) => [g.id, g])).values()];

  return (
    <aside className="panel" aria-labelledby="abroad-title">
      <div className="panel-scroll">
        <div className="panel-head">
          <div>
            <p className="kicker">{termLabel} · {programs.length} {programs.length === 1 ? "program" : "programs"}</p>
            <h2 id="abroad-title">{country}</h2>
          </div>
          <button className="icon-btn" type="button" aria-label="Close" onClick={() => dispatch({ type: "selectAbroad", iso: null })}>
            ×
          </button>
        </div>
        <ul className="ab-rows">
          {programs.map((p) => {
            const avg = summaryAvg("program", [p.id], "overall");
            return (
              <li key={p.id}>
                <button type="button" onClick={() => dispatch({ type: "openProgram", id: p.id })}>
                  <span className="ab-row-main">
                    <strong>{p.name}</strong>
                    <span>{p.city} · {KIND_LABEL[p.kind]} · {p.terms.join(", ")}</span>
                  </span>
                  <span className="ab-row-side">
                    <span className={avg === null ? "ab-score none" : "ab-score"}>{avg === null ? "No reviews" : avg.toFixed(1)}</span>
                    <span className="fine">{grantsFor(p).length} grants</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <h3>Funding available here</h3>
        <ul className="tags">
          {grantNames.map((g) => (
            <li key={g.id} className="tag ab-tag">{g.name}</li>
          ))}
        </ul>
        <p className="fine">Pick a program for grants, deadlines and reviews.</p>
      </div>
    </aside>
  );
}
