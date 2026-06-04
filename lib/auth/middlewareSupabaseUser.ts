import type { User } from "@supabase/supabase-js";
import { getMiddlewareUserFromCookies } from "@/lib/auth/middlewareSessionFromCookies";

type CookieLike = { name: string; value: string };

/**
 * Middleware auth must not call Supabase over the network: `getUser()` and expired
 * `getSession()` both trigger refresh fetches that often fail on Edge (`fetch failed`).
 * Read the SSR session from cookies instead; API routes refresh tokens on Node.
 */
export function getUserForMiddleware(
  cookies: CookieLike[],
  supabaseUrl: string
): User | null {
  return getMiddlewareUserFromCookies(cookies, supabaseUrl);
}
