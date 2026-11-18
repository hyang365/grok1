// Feedback (anyone) and moderation (admins only).

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../reviews/backend";
import { reviews as reviewApi, useReviewStore } from "../reviews/store";
import { PLACE_BY_ID } from "../data";
import { PROGRAM_BY_ID } from "../abroad/data";
import { useTripTable } from "../store";
import "./admin.css";

/** True when the signed-in account is a moderator. */
export function useIsAdmin(): boolean {
  const { session } = useReviewStore();
  const [admin, setAdmin] = useState(false);
  useEffect(() => {
    let live = true;
    if (!supabase || !session?.email) {
      setAdmin(false);
      return;
    }
    void supabase.rpc("is_admin").then(({ data }) => {
      if (live) setAdmin(data === true);
    });
    return () => {
      live = false;
    };
  }, [session?.userId, session?.email]);
  return admin;
}

const KINDS = [
  { id: "bug", label: "Something's broken" },
  { id: "idea", label: "An idea or request" },
  { id: "other", label: "Wrong info or something else" },
] as const;

export function FeedbackDialog({ onClose }: { onClose: () => void }) {
  const { state } = useTripTable();
  const [kind, setKind] = useState<(typeof KINDS)[number]["id"]>("bug");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  async function send() {
    const text = body.trim();
    if (!text) return setError("Write a sentence or two first.");
    if (!supabase) return setError("Feedback isn't connected right now.");
    setStatus("sending");
    const where = [state.view, state.selectedId, state.abroadProgramId].filter(Boolean).join(" / ").slice(0, 200);
    const { error: err } = await supabase.from("feedback").insert({ kind, body: text.slice(0, 2000), page: where });
    if (err) {
      setStatus("idle");
      setError(/Slow down|Too much/.test(err.message) ? "You've sent a lot of feedback recently. Try again in a bit." : "Couldn't send. Try again in a minute.");
      return;
    }
    setStatus("sent");
  }

  return (
    <div className="bf-overlay" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section className="fb" role="dialog" aria-modal="true" aria-labelledby="fb-title">
        <header className="fb-head">
          <h2 id="fb-title">Send feedback</h2>
          <button className="icon-btn" type="button" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </header>
        {status === "sent" ? (
          <div className="fb-done">
            <p>Thanks! It went straight to the TripTable team.</p>
            <button className="primary" type="button" onClick={onClose}>
              Done
            </button>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <div className="fb-kinds" role="radiogroup" aria-label="What kind of feedback">
              {KINDS.map((k) => (
                <button key={k.id} type="button" role="radio" aria-checked={kind === k.id} className={kind === k.id ? "on" : ""} onClick={() => setKind(k.id)}>
                  {k.label}
                </button>
              ))}
            </div>
            <textarea
              value={body}
              onChange={(e) => {
                setBody(e.target.value);
                setError(null);
              }}
              maxLength={2000}
              rows={6}
              placeholder={kind === "bug" ? "What happened, and what did you expect? Which page were you on?" : kind === "idea" ? "What would make TripTable more useful?" : "What's wrong or missing?"}
              aria-label="Feedback"
              autoFocus
            />
            <p className="fine">We'll see which page you were on. Don't include passwords or personal details.</p>
            {error ? <p className="form-error">{error}</p> : null}
            <div className="plan-actions">
              <button className="primary" type="submit" disabled={status === "sending"}>
                {status === "sending" ? "Sending…" : "Send"}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}

type Report = {
  review_id: string;
  target_type: "place" | "program";
  target_id: string;
  body: string;
  ratings: Record<string, number>;
  review_created: string;
  reports: number;
  reasons: string[];
  last_report: string;
};
type Feedback = { id: string; kind: string; body: string; page: string | null; resolved: boolean; created_at: string };

function targetName(type: string, id: string): string {
  return type === "program" ? (PROGRAM_BY_ID.get(id)?.name ?? id) : (PLACE_BY_ID.get(id)?.name ?? id);
}
const when = (iso: string) => new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export function Moderation() {
  const [reports, setReports] = useState<Report[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [showResolved, setShowResolved] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    const [r, f] = await Promise.all([
      supabase.rpc("admin_reports"),
      supabase.from("feedback").select("id,kind,body,page,resolved,created_at").order("created_at", { ascending: false }).limit(300),
    ]);
    setReports((r.data as Report[]) ?? []);
    setFeedback((f.data as Feedback[]) ?? []);
    setLoading(false);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const open = feedback.filter((f) => showResolved || !f.resolved);

  return (
    <div className="mod">
      <section className="pf-section mod-card">
        <h3>Reported reviews {reports.length ? <span className="inside-count">{reports.length}</span> : null}</h3>
        <p className="fine">Remove takes the review down for everyone. Keep clears the reports and leaves it up.</p>
        {loading ? <p className="fine">Loading…</p> : null}
        {!loading && reports.length === 0 ? <p className="empty">Nothing reported. 🎉</p> : null}
        <ul className="mod-list">
          {reports.map((r) => (
            <li key={r.review_id}>
              <div className="mod-top">
                <strong>{targetName(r.target_type, r.target_id)}</strong>
                <span className="fine">
                  {r.reports} {r.reports === 1 ? "report" : "reports"} · last {when(r.last_report)}
                </span>
              </div>
              <blockquote>{r.body.trim() || <em>Rating only: {Object.entries(r.ratings).map(([k, v]) => `${k} ${v}`).join(", ")}</em>}</blockquote>
              <p className="fine">Reasons: {r.reasons.join(" · ")}</p>
              <div className="plan-actions">
                <button
                  className="danger-btn"
                  type="button"
                  onClick={async () => {
                    if (!supabase || !window.confirm("Remove this review for everyone? This can't be undone.")) return;
                    await supabase.rpc("admin_remove_review", { p_review: r.review_id });
                    await Promise.all([load(), reviewApi.refresh()]);
                  }}
                >
                  Remove review
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!supabase) return;
                    await supabase.rpc("admin_dismiss_reports", { p_review: r.review_id });
                    await load();
                  }}
                >
                  Keep it
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
      <section className="pf-section mod-card">
        <h3>Feedback {feedback.filter((f) => !f.resolved).length ? <span className="inside-count">{feedback.filter((f) => !f.resolved).length}</span> : null}</h3>
        <label className="fine mod-toggle">
          <input type="checkbox" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} /> Show resolved
        </label>
        {!loading && open.length === 0 ? <p className="empty">No open feedback.</p> : null}
        <ul className="mod-list">
          {open.map((f) => (
            <li key={f.id} className={f.resolved ? "resolved" : ""}>
              <div className="mod-top">
                <strong>{f.kind === "bug" ? "Bug" : f.kind === "idea" ? "Idea" : "Other"}</strong>
                <span className="fine">
                  {when(f.created_at)}
                  {f.page ? ` · ${f.page}` : ""}
                </span>
              </div>
              <blockquote>{f.body}</blockquote>
              <div className="plan-actions">
                <button
                  type="button"
                  onClick={async () => {
                    if (!supabase) return;
                    await supabase.from("feedback").update({ resolved: !f.resolved }).eq("id", f.id);
                    await load();
                  }}
                >
                  {f.resolved ? "Reopen" : "Mark resolved"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
