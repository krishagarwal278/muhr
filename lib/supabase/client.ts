import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Prefer NEXT_PUBLIC_* (required for normal Next.js client bundles). Some environments duplicate
  // the Dashboard **anon public** key as SUPABASE_ANON_KEY—same value, alternate name (not service_role).
  const anon =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!url || !anon) {
    // Throwing here makes the failure obvious (instead of silent auth no-ops).
    throw new Error(
      "Missing Supabase env: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or SUPABASE_ANON_KEY with the anon public key where supported)."
    );
  }

  return createBrowserClient(
    url,
    anon
  );
}
