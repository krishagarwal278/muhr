import type { SupabaseClient, User } from "@supabase/supabase-js";

/**
 * Resolves the signed-in user for Route Handlers without hanging indefinitely when
 * `getUser()` blocks on a slow or broken Supabase connection (ETIMEDOUT). Falls back to
 * `getSession()` when `getUser()` errors, matching the middleware pattern.
 */
export async function getRouteHandlerUser(
  supabase: SupabaseClient,
  timeoutMs = 12_000
): Promise<User | null> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<null>((resolve) => {
    timeoutId = setTimeout(() => {
      console.warn(`[api] supabase auth timed out after ${timeoutMs}ms`);
      resolve(null);
    }, timeoutMs);
  });

  const authPromise = (async (): Promise<User | null> => {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (user) return user;
      if (error) {
        console.warn("[api] supabase.auth.getUser failed; trying getSession", error.message);
      }
    } catch (e) {
      console.warn("[api] supabase.auth.getUser threw; trying getSession", e);
    }
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (sessionError) console.warn("[api] getSession failed", sessionError.message);
      return session?.user ?? null;
    } catch (e) {
      console.warn("[api] getSession threw", e);
      return null;
    }
  })();

  try {
    return await Promise.race([authPromise, timeoutPromise]);
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}
