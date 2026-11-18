import { useState } from "react";
import { SHARED } from "./backend";
import { averageOf, reviews, reviewsFor, useReviewStore, type TargetType } from "./store";
import "./reviews.css";

export const COLLEGES = [
  "Benjamin Franklin", "Berkeley", "Branford", "Davenport", "Grace Hopper", "Jonathan Edwards", "Morse",
  "Pauli Murray", "Pierson", "Saybrook", "Silliman", "Timothy Dwight", "Trumbull", "Ezra Stiles", "Graduate / Professional",
];

export const AUTHOR_KEY = "triptable-author";
const YEARS = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i);

const label = (k: string) => (k === "affordability" ? "Afford" : k[0].toUpperCase() + k.slice(1));

export function ScoreValue({ value }: { value: number | null }) {
  if (value === null) return <span className="rv-score none">—</span>;
  return <span className="rv-score">{value.toFixed(1)}</span>;
}

export function SignInBox({ compact }: { compact?: boolean }) {
  const { session } = useReviewStore();
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  if (!SHARED) return null;
  if (session) {
    return (
      <p className="fine rv-signed">
        Signed in as {session.email}.{" "}
        <button className="textlink" type="button" onClick={() => void reviews.signOut()}>Sign out</button>
      </p>
    );
  }
  return (
    <form
      className={compact ? "rv-signin compact" : "rv-signin"}
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const err = await reviews.signIn(email);
        setBusy(false);
        setMsg(err ?? "Check your Yale inbox for a sign-in link.");
      }}
    >
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="netid@yale.edu or first.last@yale.edu" aria-label="Yale email" />
      <button className="primary" type="submit" disabled={busy}>Sign in</button>
      {msg ? <p className="fine">{msg}</p> : <p className="fine">Only @yale.edu emails can post. Reviews show your college and class year, never your name or email.</p>}
    </form>
  );
}

export function ReviewSection({
  targetType,
  targetId,
  keys,
  terms,
  prompt,
}: {
  targetType: TargetType;
  targetId: string;
  keys: readonly string[];
  terms: string[];
  prompt: string;
}) {
  const { reviews: all, session, loading, error } = useReviewStore();
  const list = reviewsFor(all, targetType, targetId);
  const mine = session ? list.find((r) => r.userId === session.userId) : undefined;
  const [open, setOpen] = useState(false);

  return (
    <div className="rv">
      <div className="rv-scores">
        {keys.map((k) => (
          <div key={k}>
            <span className="field-label">{label(k)}</span>
            <ScoreValue value={averageOf(list, k)} />
          </div>
        ))}
      </div>
      <p className="fine">
        {list.length === 0 ? "No reviews yet." : `${list.length} ${list.length === 1 ? "review" : "reviews"} from Yale students.`}
        {!SHARED ? " Reviews are saved on this device only until the site's database is connected." : ""}
      </p>
      {error ? <p className="form-error">{error}</p> : null}
      {session ? (
        open ? (
          <ReviewForm
            targetType={targetType}
            targetId={targetId}
            keys={keys}
            terms={terms}
            prompt={prompt}
            initial={mine}
            onDone={() => setOpen(false)}
          />
        ) : (
          <button className="primary rv-write" type="button" onClick={() => setOpen(true)}>
            {mine ? "Edit your review" : "Write a review"}
          </button>
        )
      ) : (
        <SignInBox />
      )}
      {loading ? <p className="fine">Loading reviews…</p> : null}
      <ul className="rv-list">
        {list.map((r) => (
          <li key={r.id}>
            <div className="rv-top">
              <strong>{r.author}</strong>
              <span className="fine">{r.term} {r.year}</span>
            </div>
            <p className="fine">{keys.map((k) => `${label(k)} ${r.ratings[k] ?? "—"}`).join(" · ")}</p>
            <p>{r.body}</p>
            <div className="rv-actions">
              {session && r.userId === session.userId ? (
                <button className="textlink danger" type="button" onClick={() => void reviews.remove(r.id)}>Delete</button>
              ) : SHARED && session ? (
                <ReportButton id={r.id} />
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ReportButton({ id }: { id: string }) {
  const [done, setDone] = useState(false);
  if (done) return <span className="fine">Reported. Thanks.</span>;
  return (
    <button
      className="textlink"
      type="button"
      onClick={async () => {
        const reason = window.prompt("What's wrong with this review?") ?? "";
        if (!reason.trim()) return;
        const err = await reviews.report(id, reason.trim());
        if (!err) setDone(true);
      }}
    >
      Report
    </button>
  );
}

function ReviewForm({
  targetType,
  targetId,
  keys,
  terms,
  prompt,
  initial,
  onDone,
}: {
  targetType: TargetType;
  targetId: string;
  keys: readonly string[];
  terms: string[];
  prompt: string;
  initial?: { term: string; year: number; ratings: Record<string, number>; body: string; author: string };
  onDone: () => void;
}) {
  const saved = (() => {
    try {
      return JSON.parse(localStorage.getItem(AUTHOR_KEY) ?? "{}") as { college?: string; classYear?: string };
    } catch {
      return {};
    }
  })();
  const [college, setCollege] = useState(saved.college ?? COLLEGES[0]);
  const [classYear, setClassYear] = useState(saved.classYear ?? String(new Date().getFullYear() + 1));
  const [term, setTerm] = useState(initial?.term ?? terms[0]);
  const [year, setYear] = useState(initial?.year ?? YEARS[0]);
  const [ratings, setRatings] = useState<Record<string, number>>(initial?.ratings ?? Object.fromEntries(keys.map((k) => [k, 4])));
  const [body, setBody] = useState(initial?.body ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="rv-form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (body.trim().length < 20) {
          setError("Write at least a couple of sentences so it helps the next person.");
          return;
        }
        localStorage.setItem(AUTHOR_KEY, JSON.stringify({ college, classYear }));
        const author = college === "Graduate / Professional" ? "Graduate / Professional" : `${college} '${classYear.slice(2)}`;
        setBusy(true);
        const err = await reviews.save({ targetType, targetId, author, term, year, ratings, body: body.trim() });
        setBusy(false);
        if (err) setError(err);
        else onDone();
      }}
    >
      <div className="rv-row">
        <label>College
          <select value={college} onChange={(e) => setCollege(e.target.value)}>
            {COLLEGES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        {college !== "Graduate / Professional" ? (
          <label>Class of
            <select value={classYear} onChange={(e) => setClassYear(e.target.value)}>
              {Array.from({ length: 10 }, (_, i) => String(new Date().getFullYear() + 4 - i)).map((y) => <option key={y}>{y}</option>)}
            </select>
          </label>
        ) : null}
        <label>When
          <select value={term} onChange={(e) => setTerm(e.target.value)}>
            {terms.map((t) => <option key={t}>{t}</option>)}
          </select>
        </label>
        <label>Year
          <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {YEARS.map((y) => <option key={y}>{y}</option>)}
          </select>
        </label>
      </div>
      <div className="rv-row">
        {keys.map((k) => (
          <label key={k}>{label(k)}
            <select value={ratings[k]} onChange={(e) => setRatings({ ...ratings, [k]: Number(e.target.value) })}>
              {[5, 4, 3, 2, 1].map((n) => <option key={n}>{n}</option>)}
            </select>
          </label>
        ))}
      </div>
      <textarea rows={4} value={body} maxLength={4000} onChange={(e) => { setBody(e.target.value); setError(""); }} placeholder={prompt} aria-label="Review" />
      {error ? <p className="form-error">{error}</p> : null}
      <div className="plan-actions">
        <button className="primary" type="submit" disabled={busy}>{busy ? "Posting…" : "Post review"}</button>
        <button className="textlink" type="button" onClick={onDone}>Cancel</button>
      </div>
    </form>
  );
}
