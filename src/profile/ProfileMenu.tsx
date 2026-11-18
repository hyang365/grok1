import { useEffect, useRef, useState } from "react";
import { useMe } from "../account/account";
import { FeedbackDialog, useIsAdmin } from "../admin/admin";
import { reviews as reviewApi, useReviewStore } from "../reviews/store";
import { useTripTable } from "../store";
import type { ProfileTab } from "../types";
import { isPast } from "./trips";
import "./profile.css";


export function initials(name: string) {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function ProfileMenu() {
  const { state, dispatch } = useTripTable();
  const { reviews, session, shared } = useReviewStore();
  const me = useMe();
  const admin = useIsAdmin();
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const go = (tab: ProfileTab) => {
    dispatch({ type: "openProfile", tab });
    setOpen(false);
  };
  const pastCount = state.trips.filter(isPast).length;
  const bucketOpen = state.bucket.filter((b) => !b.done).length;
  const mine = session ? reviews.filter((r) => r.userId === session.userId).length : 0;

  return (
    <div className="pf-menu" ref={ref}>
      <button
        type="button"
        className={state.view === "profile" ? "pf-avatar active" : "pf-avatar"}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={me.signedIn ? "Profile and settings" : "Sign in and settings"}
        onClick={() => setOpen((v) => !v)}
      >
        {me.signedIn ? initials(me.name) : <span className="pf-guest">Sign in</span>}
      </button>
      {open ? (
        <div className="pf-drop" role="menu">
          <div className="pf-who">
            <span className="pf-avatar big">{me.signedIn ? initials(me.name) : "?"}</span>
            <div>
              <strong>{me.name}</strong>
              <span>{me.signedIn ? me.email : "Browsing as a guest. Nothing is shared."}</span>
            </div>
          </div>
          {!me.signedIn && shared ? (
            <button
              type="button"
              role="menuitem"
              className="pf-signin"
              onClick={() => {
                setOpen(false);
                void reviewApi.signInWithGoogle();
              }}
            >
              <span>Sign in with Yale Google</span>
            </button>
          ) : null}
          <button type="button" role="menuitem" onClick={() => go("history")}>
            <span>Trip history</span>
            <small>{pastCount}</small>
          </button>
          <button type="button" role="menuitem" onClick={() => go("bucket")}>
            <span>Bucket list</span>
            <small>{bucketOpen}</small>
          </button>
          <button type="button" role="menuitem" onClick={() => go("reviews")}>
            <span>My reviews</span>
            <small>{mine}</small>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              dispatch({ type: "setView", view: "itinerary" });
              setOpen(false);
            }}
          >
            <span>Itinerary</span>
          </button>
          <button type="button" role="menuitem" onClick={() => go("settings")}>
            <span>Settings</span>
          </button>
          <button
            type="button"
            role="menuitemcheckbox"
            aria-checked={state.theme === "dark"}
            onClick={() => dispatch({ type: "setTheme", theme: state.theme === "light" ? "dark" : "light" })}
          >
            <span>Dark mode</span>
            <small>{state.theme === "dark" ? "On" : "Off"}</small>
          </button>
          <hr />
          {shared ? (
            me.signedIn ? (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  void reviewApi.signOut();
                  setOpen(false);
                }}
              >
                <span>Sign out</span>
              </button>
            ) : null
          ) : null}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              setFeedbackOpen(true);
            }}
          >
            <span>Send feedback or report a bug</span>
          </button>
          {admin ? (
            <button type="button" role="menuitem" onClick={() => go("moderation")}>
              <span>Moderation</span>
            </button>
          ) : null}
          <a role="menuitem" href={`${import.meta.env.BASE_URL}about.html`} onClick={() => setOpen(false)}>
            <span>About & help</span>
          </a>
          <div className="pf-legal">
            <a href={`${import.meta.env.BASE_URL}privacy.html`}>Privacy</a>
            <span>·</span>
            <a href={`${import.meta.env.BASE_URL}terms.html`}>Terms</a>
          </div>
          <p className="pf-disclaimer">Made by Yale students. Not affiliated with or endorsed by Yale University.</p>
        </div>
      ) : null}
      {feedbackOpen ? <FeedbackDialog onClose={() => setFeedbackOpen(false)} /> : null}
    </div>
  );
}

/** Star toggle for adding a place or study abroad program to your bucket list. */
export function BucketButton({ kind, targetId, label }: { kind: "place" | "program"; targetId: string; label: string }) {
  const { state, dispatch } = useTripTable();
  const on = state.bucket.some((b) => b.kind === kind && b.targetId === targetId);
  return (
    <button
      type="button"
      className={on ? "pf-star on" : "pf-star"}
      aria-pressed={on}
      title={on ? "On your bucket list" : "Add to bucket list"}
      onClick={() => dispatch({ type: "toggleBucket", kind, targetId, label })}
    >
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
        <path d="M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.8l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8L12 3.5z" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
      <span>{on ? "Bucket list" : "Add to bucket list"}</span>
    </button>
  );
}
