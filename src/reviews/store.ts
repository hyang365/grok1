import { useSyncExternalStore } from "react";
import { SHARED, SUPABASE_ANON_KEY, SUPABASE_URL, supabase, YALE_EMAIL } from "./backend";

export type TargetType = "place" | "program";

export type Review = {
  id: string;
  targetType: TargetType;
  targetId: string;
  userId: string;
  author: string;
  term: string;
  year: number;
  ratings: Record<string, number>;
  body: string;
  createdAt: string;
};

export type Session = { userId: string; email: string } | null;

type Snapshot = {
  reviews: Review[];
  session: Session;
  loading: boolean;
  error: string | null;
  version: number;
  /** True when reviews are shared through the database; false = saved on this device only. */
  shared: boolean;
  /** Whether "Sign in with Google" is switched on in Supabase (checked at load). */
  google: boolean;
  /** A sign-in that came back with an error (shown once as a banner). */
  authError: string | null;
};

/** Google or Supabase send failed sign-ins back as ?error=…&error_description=… (or in the #hash). */
function readAuthError(): string | null {
  if (typeof location === "undefined") return null;
  const params = new URLSearchParams(location.search);
  const hash = new URLSearchParams(location.hash.replace(/^#/, ""));
  const code = params.get("error") ?? hash.get("error");
  if (!code) return null;
  const detail = (params.get("error_description") ?? hash.get("error_description") ?? "").replace(/\+/g, " ");
  try {
    history.replaceState(null, "", location.pathname);
  } catch {
    /* ignore */
  }
  if (/client secret|invalid_client|unable to exchange/i.test(detail)) {
    return "Google sign-in isn't finished being set up on our side. Try again soon, or use the email link instead.";
  }
  if (/access_denied/i.test(code)) return "Sign-in was cancelled.";
  if (/org_internal|not.*organization/i.test(detail)) return "Use your @yale.edu Google account to sign in.";
  return `Sign-in didn't work: ${detail || code}`;
}

const LOCAL_KEY = "triptable-reviews-v2";
const LOCAL_USER = "local-device";

let snap: Snapshot = { reviews: [], session: null, loading: SHARED, error: null, version: 0, shared: SHARED, google: false, authError: readAuthError() };
let useLocal = !SHARED;

function goLocal() {
  // Database reachable but not set up yet (tables missing): keep the site working on-device.
  useLocal = true;
  emit({ shared: false, loading: false, error: null, reviews: readLocal(), session: { userId: LOCAL_USER, email: "" } });
}
const listeners = new Set<() => void>();

function emit(patch: Partial<Snapshot>) {
  snap = { ...snap, ...patch, version: snap.version + 1 };
  listeners.forEach((fn) => fn());
}

function readLocal(): Review[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    const data = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(data) ? (data as Review[]).filter((r) => r && typeof r.targetId === "string" && r.ratings) : [];
  } catch {
    return [];
  }
}

function writeLocal(reviews: Review[]) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(reviews));
  } catch {
    /* storage blocked */
  }
}

type Row = {
  id: string;
  target_type: TargetType;
  target_id: string;
  author: string;
  term: string;
  year: number;
  ratings: Record<string, number>;
  body: string;
  created_at: string;
};

// Reviews are anonymous: the database never sends who wrote one. Your own are
// marked using my_review_ids(), which only returns your own review ids.
const fromRow = (r: Row, mine: Set<string>, me: string): Review => ({
  id: r.id,
  targetType: r.target_type,
  targetId: r.target_id,
  userId: mine.has(r.id) ? me : "",
  author: r.author,
  term: r.term,
  year: r.year,
  ratings: r.ratings,
  body: r.body,
  createdAt: r.created_at,
});

async function refresh() {
  if (!supabase || useLocal) return;
  const session = snap.session;
  const [{ data, error }, mineRes] = await Promise.all([
    supabase.from("reviews").select("id,target_type,target_id,author,term,year,ratings,body,created_at").order("created_at", { ascending: false }).limit(5000),
    session?.email ? supabase.rpc("my_review_ids") : Promise.resolve({ data: [] as string[] }),
  ]);
  if (error && (error.code === "PGRST205" || error.code === "42P01" || /does not exist|could not find the table/i.test(error.message))) return goLocal();
  const mine = new Set<string>(Array.isArray(mineRes.data) ? (mineRes.data as string[]) : []);
  if (error) emit({ loading: false, error: "Couldn't load reviews. Try again in a minute." });
  else emit({ loading: false, error: null, reviews: (data as Row[]).map((r) => fromRow(r, mine, session?.userId ?? "")) });
}

function init() {
  // Old local-only program reviews from the first version of the Study Abroad tab.
  localStorage.removeItem("triptable-abroad-reviews-v1");
  if (!supabase) {
    snap = { ...snap, reviews: readLocal(), session: { userId: LOCAL_USER, email: "" }, loading: false };
    return;
  }
  supabase.auth.getSession().then(({ data }) => {
    if (useLocal) return;
    const user = data.session?.user;
    emit({ session: user ? { userId: user.id, email: user.email ?? "" } : null });
  });
  supabase.auth.onAuthStateChange((_event, session) => {
    if (useLocal) return;
    const user = session?.user;
    const before = snap.session?.userId ?? null;
    emit({ session: user ? { userId: user.id, email: user.email ?? "" } : null });
    if ((user?.id ?? null) !== before) void refresh();
  });
  void refresh();
  // Supabase publishes which sign-in providers are enabled; only offer Google once it's on.
  fetch(`${SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: SUPABASE_ANON_KEY } })
    .then((r) => (r.ok ? r.json() : null))
    .then((s: { external?: { google?: boolean } } | null) => {
      if (s?.external?.google) emit({ google: true });
    })
    .catch(() => {});
}

init();

export type Draft = Omit<Review, "id" | "userId" | "createdAt">;

export const reviews = {
  clearAuthError: () => emit({ authError: null }),
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
  get: () => snap,

  async signIn(email: string): Promise<string | null> {
    if (!supabase || useLocal) return "Sign-in isn't connected yet.";
    const clean = email.trim().toLowerCase();
    if (!YALE_EMAIL.test(clean)) return "Use your @yale.edu email.";
    const { error } = await supabase.auth.signInWithOtp({
      email: clean,
      options: { emailRedirectTo: location.origin + location.pathname },
    });
    return error ? error.message : null;
  },

  /** One-click sign-in with a Yale Google (EliApps) account. Only @yale.edu emails can post (enforced in the database). */
  async signInWithGoogle(): Promise<string | null> {
    if (!supabase || useLocal) return "Sign-in isn't connected yet.";
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: location.origin + location.pathname, queryParams: { hd: "yale.edu", prompt: "select_account" } },
    });
    return error ? error.message : null;
  },

  async signOut() {
    await supabase?.auth.signOut();
  },

  async save(draft: Draft): Promise<string | null> {
    const session = snap.session;
    if (!session) return "Sign in with your Yale email to post.";
    if (!supabase || useLocal) {
      const review: Review = { ...draft, id: `local-${Date.now()}`, userId: LOCAL_USER, createdAt: new Date().toISOString() };
      const next = [review, ...snap.reviews.filter((r) => !(r.targetType === draft.targetType && r.targetId === draft.targetId && r.userId === LOCAL_USER))];
      writeLocal(next);
      emit({ reviews: next });
      return null;
    }
    const { error } = await supabase.rpc("save_review", {
      p_target_type: draft.targetType,
      p_target_id: draft.targetId,
      p_term: draft.term,
      p_year: draft.year,
      p_ratings: draft.ratings,
      p_body: draft.body,
    });
    if (error) return error.message.includes("row-level security") ? "Only @yale.edu accounts can post reviews." : error.message;
    await refresh();
    return null;
  },

  async remove(id: string): Promise<void> {
    if (!supabase || useLocal) {
      const next = snap.reviews.filter((r) => r.id !== id);
      writeLocal(next);
      emit({ reviews: next });
      return;
    }
    await supabase.rpc("delete_review", { p_id: id });
    await refresh();
  },

  async report(id: string, reason: string): Promise<string | null> {
    if (!supabase || useLocal) return null;
    if (!snap.session) return "Sign in to report a review.";
    const { error } = await supabase.from("review_reports").insert({ review_id: id, reason });
    return error ? error.message : null;
  },
};

export function useReviewStore(): Snapshot {
  return useSyncExternalStore(reviews.subscribe, reviews.get, reviews.get);
}

export function reviewsFor(all: Review[], type: TargetType, id: string): Review[] {
  return all.filter((r) => r.targetType === type && r.targetId === id);
}

export function averageOf(list: Review[], key: string): number | null {
  const values = list.map((r) => r.ratings[key]).filter((v): v is number => typeof v === "number");
  if (!values.length) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export const PLACE_KEYS = ["overall", "affordability", "safety", "beauty"] as const;
export const PROGRAM_KEYS = ["overall", "academics", "housing", "value"] as const;

/** Place scores built only from real reviews. Null until someone reviews the place. */
export function placeScores(all: Review[], placeId: string) {
  const list = reviewsFor(all, "place", placeId);
  if (!list.length) return null;
  return {
    overall: averageOf(list, "overall") ?? 0,
    affordability: averageOf(list, "affordability") ?? 0,
    safety: averageOf(list, "safety") ?? 0,
    beauty: averageOf(list, "beauty") ?? 0,
    count: list.length,
  };
}
