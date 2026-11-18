import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// The shared database is Supabase (Postgres + email sign-in). Set these two at build time:
//   VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY   (see supabase/schema.sql and README)
// The project URL and anon key are public by design (they ship to every browser); row-level
// security in supabase/schema.sql is what protects the data. Env vars override them.
export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || "https://yzldywaosqijduvtqvnb.supabase.co";
export const SUPABASE_ANON_KEY =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bGR5d2Fvc3FpamR1dnRxdm5iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ5Nzc4NDcsImV4cCI6MjExMDU1Mzg0N30.UDiCpTJu96YZzHxQ5Tx6jkAjuAC449IcrRjJyW6lxLs";
const url = SUPABASE_URL;
const key = SUPABASE_ANON_KEY;

// Implicit flow so a sign-in link opened on a phone still works for a laptop request.
export const supabase: SupabaseClient | null = url && key ? createClient(url, key, { auth: { flowType: "implicit" } }) : null;
export const SHARED = supabase !== null;

export const YALE_EMAIL = /^[^@\s]+@yale\.edu$/i;
