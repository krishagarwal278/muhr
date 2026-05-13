import type { SupabaseClient, User } from "@supabase/supabase-js";

/**
 * `getUser()` validates the JWT with Supabase over the network. In Edge middleware that
 * request can fail intermittently (`fetch failed`, DNS blips, local Supabase not running).
 * Fall back to `getSession()`, which reads the session the SSR client stored in cookies.
 */
export async function getUserForMiddleware(supabase: SupabaseClient): Promise<User | null> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  } catch (err) {
    console.warn("[middleware] supabase.auth.getUser failed; falling back to getSession", err);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      return session?.user ?? null;
    } catch (sessionErr) {
      console.warn("[middleware] supabase.auth.getSession failed after getUser error", sessionErr);
      return null;
    }
  }
}
