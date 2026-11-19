// Small things for fun: The Game countdown, and "Boola boola" confetti (click the logo five times).

import { useEffect, useState } from "react";
import "./fun.css";

// The 142nd playing of The Game: Yale vs. Harvard, Saturday Nov 21, 2026, 3:30 p.m. ET, Fenway Park.
const KICKOFF = Date.parse("2026-11-21T15:30:00-05:00");
const OVER = KICKOFF + 3.5 * 3_600_000;
const DISMISS_KEY = "triptable-the-game-2026";

function until(ms: number): string {
  const mins = Math.max(0, Math.floor(ms / 60_000));
  const d = Math.floor(mins / 1440);
  const h = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  return d ? `${d}d ${h}h ${m}m` : h ? `${h}h ${m}m` : `${m}m`;
}

export function GameBanner() {
  const [now, setNow] = useState(() => Date.now());
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    if (hidden || Date.now() > OVER) return;
    const t = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(t);
  }, [hidden]);
  if (hidden || now > OVER) return null;
  const live = now >= KICKOFF;
  return (
    <div className="game-banner" role="status">
      <span className="game-badge">THE GAME</span>
      {live ? (
        <span>Yale vs. Harvard is on now at Fenway Park. Boola boola.</span>
      ) : (
        <span>
          Yale vs. Harvard · Fenway Park · Sat 3:30 PM · <b className="game-clock">{until(KICKOFF - now)}</b> to kickoff. Beat Harvard.
        </span>
      )}
      <button
        type="button"
        className="game-close"
        aria-label="Hide The Game countdown"
        onClick={() => {
          setHidden(true);
          try {
            localStorage.setItem(DISMISS_KEY, "1");
          } catch {
            /* storage blocked */
          }
        }}
      >
        ×
      </button>
    </div>
  );
}

const COLORS = ["#00356b", "#286dc0", "#ffffff", "#63aaff"];

/** A short burst of Yale-blue confetti. Skipped for people who prefer reduced motion. */
export function Confetti({ burst }: { burst: number }) {
  const [pieces, setPieces] = useState<{ id: string; left: number; delay: number; color: string; drift: number; size: number }[]>([]);
  useEffect(() => {
    if (!burst) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setPieces(
      Array.from({ length: 48 }, (_, i) => ({
        id: `${burst}-${i}`,
        left: Math.random() * 100,
        delay: Math.random() * 0.4,
        color: COLORS[i % COLORS.length],
        drift: (Math.random() - 0.5) * 160,
        size: 6 + Math.random() * 6,
      })),
    );
    const t = window.setTimeout(() => setPieces([]), 2600);
    return () => window.clearTimeout(t);
  }, [burst]);
  if (!pieces.length) return null;
  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((p) => (
        <i
          key={p.id}
          style={{
            left: `${p.left}%`,
            background: p.color,
            width: p.size,
            height: p.size * 0.45,
            animationDelay: `${p.delay}s`,
            ["--drift" as string]: `${p.drift}px`,
          }}
        />
      ))}
    </div>
  );
}
