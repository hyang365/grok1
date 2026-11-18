import { useMemo, useState } from "react";
import { useTripTable } from "../store";
import { GRANTS, KIND_LABEL, PROGRAMS, REGIONS, grantsFor, type Program, type ProgramKind } from "./data";
import { ReviewSection } from "../reviews/ReviewSection";
import { BucketButton } from "../profile/ProfileMenu";
import { PROGRAM_KEYS, averageOf, reviewsFor, useReviewStore, type Review } from "../reviews/store";
import "./abroad.css";

const KINDS: ProgramKind[] = ["yss", "london", "nonyale-summer", "term"];

function Stars({ value }: { value: number | null }) {
  if (value === null) return <span className="ab-score none">No reviews</span>;
  return <span className="ab-score">{value.toFixed(1)}<small>/5</small></span>;
}

export function AbroadView() {
  const { reviews } = useReviewStore();
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<ProgramKind | "all">("all");
  const [region, setRegion] = useState<string>("all");
  const [grant, setGrant] = useState<string>("all");
  const { state, dispatch } = useTripTable();
  const selectedId = state.abroadProgramId ?? PROGRAMS[0].id;
  const setSelectedId = (id: string) => dispatch({ type: "openProgram", id });

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PROGRAMS.filter((p) => {
      if (kind !== "all" && p.kind !== kind) return false;
      if (region !== "all" && p.region !== region) return false;
      if (grant !== "all" && !grantsFor(p).some((g) => g.id === grant)) return false;
      if (!q) return true;
      return [p.name, p.city, p.country, p.subject, p.language ?? ""].some((s) => s.toLowerCase().includes(q));
    });
  }, [query, kind, region, grant]);

  const selected = PROGRAMS.find((p) => p.id === selectedId) ?? rows[0] ?? PROGRAMS[0];

  return (
    <div className="ab-page">
      <section className="ab-list">
        <header>
          <h2>Study abroad</h2>
          <p className="fine">Yale-run and Yale-approved programs, what Yalies thought of them, and the grants that can pay for each.</p>
        </header>
        <input className="search ab-search" type="search" placeholder="Search city, language, subject" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search programs" />
        <div className="ab-filters">
          <select value={kind} onChange={(e) => setKind(e.target.value as ProgramKind | "all")} aria-label="Program type">
            <option value="all">All types</option>
            {KINDS.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
          </select>
          <select value={region} onChange={(e) => setRegion(e.target.value)} aria-label="Region">
            <option value="all">All regions</option>
            {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <select value={grant} onChange={(e) => setGrant(e.target.value)} aria-label="Funding">
            <option value="all">Any funding</option>
            {Object.values(GRANTS).map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
        <p className="fine">{rows.length} programs</p>
        <ul className="ab-rows">
          {rows.map((p) => {
            const mine = reviewsFor(reviews, "program", p.id);
            return (
              <li key={p.id}>
                <button type="button" className={p.id === selected.id ? "active" : ""} onClick={() => setSelectedId(p.id)}>
                  <span className="ab-row-main">
                    <strong>{p.name}</strong>
                    <span>{p.city}, {p.country} · {KIND_LABEL[p.kind]}</span>
                  </span>
                  <span className="ab-row-side">
                    <Stars value={averageOf(mine, "overall")} />
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
      <ProgramDetail program={selected} reviews={reviewsFor(reviews, "program", selected.id)} />
    </div>
  );
}

function ProgramDetail({ program, reviews }: { program: Program; reviews: Review[] }) {
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

      <h3>Reviews ({reviews.length})</h3>
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
