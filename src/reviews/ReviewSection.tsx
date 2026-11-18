import { useState } from "react";
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
  const { session, shared, google } = useReviewStore();
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  if (!shared) return null;
  if (session) {
    return (
      <p className="fine rv-signed">
        Signed in as {session.email}.{" "}
        <button className="textlink" type="button" onClick={() => void reviews.signOut()}>Sign out</button>
      </p>
    );
  }
  return (
    <div className={compact ? "rv-signin compact" : "rv-signin"}>
      {google ? (
      <button
        type="button"
        className="rv-google"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const err = await reviews.signInWithGoogle();
          setBusy(false);
          if (err) setMsg(err);
        }}
      >
        <svg viewBox="0 0 18 18" width="18" height="18" aria-hidden="true">
          <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
          <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
          <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z" />
          <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
        </svg>
        Continue with your Yale Google account
      </button>
      ) : null}
      <details className="rv-emailalt" open={!google}>
        <summary>{google ? "No Yale Google account? Get a sign-in link by email" : "Sign in with a link sent to your Yale email"}</summary>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            const err = await reviews.signIn(email);
            setBusy(false);
            setMsg(err ?? "Check your Yale inbox for a sign-in link.");
          }}
        >
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="netid@yale.edu or first.last@yale.edu" aria-label="Yale email" />
          <button className="primary" type="submit" disabled={busy}>Send link</button>
        </form>
      </details>
      {msg ? <p className="fine">{msg}</p> : <p className="fine">Only @yale.edu accounts can sign in. Reviews are completely anonymous.</p>}
    </div>
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
  const { reviews: all, session, loading, error, shared } = useReviewStore();
  const list = reviewsFor(all, targetType, targetId);
  const mine = session ? list.find((r) => r.userId === session.userId) : undefined;
  const written = list.filter((r) => r.body.trim());
  const ratingsOnly = list.length - written.length;
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
        {list.length === 0
          ? "No reviews yet."
          : `${written.length} ${written.length === 1 ? "review" : "reviews"}${ratingsOnly ? ` and ${ratingsOnly} ${ratingsOnly === 1 ? "rating" : "ratings"}` : ""} from Yale students.`}
        {!shared ? " Reviews are saved on this device only until the site's database is connected." : ""}
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
          <>
            {mine && !mine.body.trim() ? (
              <p className="fine rv-mine">
                Your rating: {keys.map((k) => `${label(k)} ${mine.ratings[k] ?? "—"}`).join(" · ")}
              </p>
            ) : null}
            <button className="primary rv-write" type="button" onClick={() => setOpen(true)}>
              {mine ? (mine.body.trim() ? "Edit your review" : "Edit your rating") : "Rate or review"}
            </button>
          </>
        )
      ) : (
        <SignInBox />
      )}
      {loading ? <p className="fine">Loading reviews…</p> : null}
      <ul className="rv-list">
        {written.map((r) => (
          <li key={r.id}>
            <div className="rv-top">
              <strong>{session && r.userId === session.userId ? "You (shown as Anonymous)" : "Anonymous Yale student"}</strong>
              <span className="fine">{r.term} {r.year}</span>
            </div>
            <p className="fine">{keys.map((k) => `${label(k)} ${r.ratings[k] ?? "—"}`).join(" · ")}</p>
            <p>{r.body}</p>
            <div className="rv-actions">
              {session && r.userId === session.userId ? (
                <button className="textlink danger" type="button" onClick={() => void reviews.remove(r.id)}>Delete</button>
              ) : shared && session ? (
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
        setBusy(true);
        const err = await reviews.save({ targetType, targetId, author: "Yale student", term, year, ratings, body: body.trim() });
        setBusy(false);
        if (err) setError(err);
        else onDone();
      }}
    >
      <div className="rv-row">
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
      <textarea rows={4} value={body} maxLength={4000} onChange={(e) => { setBody(e.target.value); setError(""); }} placeholder={`Optional. ${prompt}`} aria-label="Written review (optional)" />
      <p className="fine">The written part is optional: leave it blank to post just your rating. Everything is anonymous; no name, email, college or class year is shown, and other students can't see who posted it.</p>
      {error ? <p className="form-error">{error}</p> : null}
      <div className="plan-actions">
        <button className="primary" type="submit" disabled={busy}>{busy ? "Posting…" : body.trim() ? "Post review" : "Post rating"}</button>
        <button className="textlink" type="button" onClick={onDone}>Cancel</button>
      </div>
    </form>
  );
}
