import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// The shared database is Supabase (Postgres + email sign-in). Set these two at build time:
//   VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY   (see supabase/schema.sql and README)
// Without them the site still works, but reviews are saved only in this browser.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Implicit flow so a sign-in link opened on a phone still works for a laptop request.
export const supabase: SupabaseClient | null = url && key ? createClient(url, key, { auth: { flowType: "implicit" } }) : null;
export const SHARED = supabase !== null;

export const YALE_EMAIL = /^[^@\s]+@yale\.edu$/i;
