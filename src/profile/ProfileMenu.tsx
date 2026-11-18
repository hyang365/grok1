import { useEffect, useRef, useState } from "react";
import { ME } from "../data";
import { reviews as reviewApi, useReviewStore } from "../reviews/store";
import { useTripTable } from "../store";
import type { ProfileTab } from "../types";
import { isPast } from "./trips";
import "./profile.css";

const REPO = "https://github.com/hyang365/grok1";

export function issueUrl(kind: "bug" | "feature" | "data", view: string): string {
  const titles = { bug: "Bug: ", feature: "Idea: ", data: "Missing or wrong info: " };
  const bodies = {
    bug: `**What happened?**\n\n\n**What did you expect?**\n\n\n**Steps to reproduce**\n1. \n\n---\nPage: ${view}\nBrowser: ${navigator.userAgent}\nURL: ${location.href}`,
    feature: `**What would you like TripTable to do?**\n\n\n**Why would it help?**\n\n`,
    data: `**Which place, program or grant?**\n\n\n**What's missing or wrong? (a source link helps)**\n\n`,
  };
  const labels = { bug: "bug", feature: "enhancement", data: "data" };
  return `${REPO}/issues/new?title=${encodeURIComponent(titles[kind])}&labels=${labels[kind]}&body=${encodeURIComponent(bodies[kind])}`;
}

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
        aria-label="Profile and settings"
        onClick={() => setOpen((v) => !v)}
      >
        {initials(ME.name)}
      </button>
      {open ? (
        <div className="pf-drop" role="menu">
          <div className="pf-who">
            <span className="pf-avatar big">{initials(ME.name)}</span>
            <div>
              <strong>{ME.name}</strong>
              <span>{session?.email && shared ? session.email : `${ME.netid} · Class of ${ME.year}`}</span>
            </div>
          </div>
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
            session ? (
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
            ) : (
              <button type="button" role="menuitem" onClick={() => go("settings")}>
                <span>Sign in with Yale email</span>
              </button>
            )
          ) : null}
          <a role="menuitem" href={issueUrl("bug", state.view)} target="_blank" rel="noreferrer" onClick={() => setOpen(false)}>
            <span>Report a bug</span>
            <small>↗</small>
          </a>
          <a role="menuitem" href={issueUrl("feature", state.view)} target="_blank" rel="noreferrer" onClick={() => setOpen(false)}>
            <span>Suggest a feature</span>
            <small>↗</small>
          </a>
          <a role="menuitem" href={issueUrl("data", state.view)} target="_blank" rel="noreferrer" onClick={() => setOpen(false)}>
            <span>Fix missing or wrong info</span>
            <small>↗</small>
          </a>
          <a role="menuitem" href={`${REPO}#readme`} target="_blank" rel="noreferrer" onClick={() => setOpen(false)}>
            <span>Help & about</span>
            <small>↗</small>
          </a>
        </div>
      ) : null}
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
