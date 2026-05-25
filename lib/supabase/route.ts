import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Creates a Supabase client for use in API route handlers.
 * 
 * Unlike the cached `createServerClient` in `server.ts`, this version
 * is designed for route handlers where cookie mutations need to work.
 * 
 * @example
 * ```ts
 * export async function GET() {
 *   const supabase = await createRouteClient();
 *   const { data: { user } } = await supabase.auth.getUser();
 *   // ...
 * }
 * ```
 */
export async function createRouteClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignore - can fail in certain contexts
          }
        },
      },
    }
  );
}

/**
 * Gets the authenticated user from a route handler context.
 * Returns null if not authenticated (does not throw).
 */
export async function getRouteUser() {
  const supabase = await createRouteClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}
