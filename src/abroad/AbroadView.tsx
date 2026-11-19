import { useMemo, useState, type ReactNode } from "react";
import { useTripTable } from "../store";
import { GRANTS, KIND_LABEL, PROGRAMS, REGIONS, grantsFor, type Program, type ProgramKind } from "./data";
import { matchesQuery, passesAbroad } from "./filters";
import { ReviewSection } from "../reviews/ReviewSection";
import { BucketButton } from "../profile/ProfileMenu";
import { PROGRAM_KEYS, summaryAvg, summaryCount, useReviewStore } from "../reviews/store";
import "./abroad.css";

const KINDS: ProgramKind[] = ["yss", "london", "nonyale-summer", "term"];

function Stars({ value }: { value: number | null }) {
  if (value === null) return <span className="ab-score none">No reviews</span>;
  return <span className="ab-score">{value.toFixed(1)}<small>/5</small></span>;
}

export function AbroadView({ toggle }: { toggle?: ReactNode }) {
  const { version } = useReviewStore();
  const [query, setQuery] = useState("");
  const { state, dispatch } = useTripTable();
  const f = state.abroadFilters;
  const patch = (p: Partial<typeof f>) => dispatch({ type: "patchAbroadFilters", patch: p });
  const selectedId = state.abroadProgramId ?? PROGRAMS[0].id;
  const setSelectedId = (id: string) => dispatch({ type: "openProgram", id });

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PROGRAMS.filter((p) => passesAbroad(p, f) && matchesQuery(p, q));
  }, [query, f, version]);

  const selected = PROGRAMS.find((p) => p.id === selectedId) ?? rows[0] ?? PROGRAMS[0];

  return (
    <div className="ab-shell">
    {toggle}
    <div className="ab-page">
      <section className="ab-list">
        <header>
          <h2>Study abroad</h2>
          <p className="fine">Yale-run and Yale-approved programs, what Yalies thought of them, and the grants that can pay for each.</p>
        </header>
        <input className="search ab-search" type="search" placeholder="Search city, language, subject" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search programs" />
        <div className="ab-filters">
          <select value={f.kind} onChange={(e) => patch({ kind: e.target.value })} aria-label="Program type">
            <option value="all">All types</option>
            {KINDS.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
          </select>
          <select value={f.region} onChange={(e) => patch({ region: e.target.value })} aria-label="Region">
            <option value="all">All regions</option>
            {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <select value={f.grant} onChange={(e) => patch({ grant: e.target.value })} aria-label="Funding">
            <option value="all">Any funding</option>
            {Object.values(GRANTS).map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <select value={String(f.overall)} onChange={(e) => patch({ overall: Number(e.target.value) })} aria-label="Minimum overall rating">
            <option value="1">Any rating</option>
            <option value="3">Rated 3+</option>
            <option value="4">Rated 4+</option>
            <option value="4.5">Rated 4.5+</option>
            {[1, 3, 4, 4.5].includes(f.overall) ? null : <option value={String(f.overall)}>Rated {f.overall.toFixed(1)}+</option>}
          </select>
        </div>
        <p className="fine">{rows.length} programs</p>
        <ul className="ab-rows">
          {rows.map((p) => {
            return (
              <li key={p.id}>
                <button type="button" className={p.id === selected.id ? "active" : ""} onClick={() => setSelectedId(p.id)}>
                  <span className="ab-row-main">
                    <strong>{p.name}</strong>
                    <span>{p.city}, {p.country} · {KIND_LABEL[p.kind]}</span>
                  </span>
                  <span className="ab-row-side">
                    <Stars value={summaryAvg("program", [p.id], "overall")} />
                    <span className="fine">{grantsFor(p).length} grants</span>
                  </span>
                </button>
              </li>
            );
          })}
          {rows.length === 0 ? <li className="empty">No programs match. Try clearing a filter.</li> : null}
        </ul>
        <a className="textlink" href="https://studyabroad.yale.edu/get-started/how-choose-program" target="_blank" rel="noreferrer">
          Full Yale Study Abroad database ↗
        </a>
      </section>
      <ProgramDetail program={selected} />
    </div>
    </div>
  );
}

function ProgramDetail({ program }: { program: Program }) {
  const { dispatch } = useTripTable();
  const grants = grantsFor(program);
  return (
    <section className="ab-detail">
      <header>
        <p className="kicker">{KIND_LABEL[program.kind]} · {program.terms.join(", ")}</p>
        <h2>{program.name}</h2>
        <p>{program.city}, {program.country} · {program.subject}</p>
        {program.note ? <p className="callout">{program.note}</p> : null}
        <div className="plan-actions">
          <a className="primary ab-link" href={program.url} target="_blank" rel="noreferrer">Program page ↗</a>
          <a className="textlink" href="https://studyabroad.yale.edu/node/97" target="_blank" rel="noreferrer">Deadlines</a>
          <button className="textlink" type="button" onClick={() => { dispatch({ type: "setMapMode", mode: "abroad" }); dispatch({ type: "selectAbroad", iso: program.iso }); }}>
            See on map
          </button>
          <BucketButton kind="program" targetId={program.id} label={program.name} />
        </div>
      </header>

      <h3>Grants you can apply for</h3>
      <ul className="ab-grants">
        {grants.map((g) => (
          <li key={g.id}>
            <div className="ab-grant-top">
              <a href={g.url} target="_blank" rel="noreferrer"><strong>{g.name}</strong></a>
              <span className="ab-amount">{g.amount}</span>
            </div>
            <p>{g.who}</p>
            <p className="fine">{g.deadline}</p>
            {g.caveat ? <p className="fine ab-caveat">{g.caveat}</p> : null}
          </li>
        ))}
      </ul>
      <p className="fine">Eligibility depends on your aid status and citizenship. Confirm on each grant's page before you apply.</p>

      <h3>Reviews ({summaryCount("program", [program.id])})</h3>
      <ReviewSection
        targetType="program"
        targetId={program.id}
        keys={PROGRAM_KEYS}
        terms={program.terms}
        prompt="Workload, instructors, housing, what you'd tell a friend before applying"
      />
    </section>
  );
}
