import { createServerClient as createSupabaseServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { cache } from "react";

/**
 * Creates a Supabase client with service role privileges.
 * Returns null if SUPABASE_SERVICE_ROLE_KEY is not configured.
 * 
 * @deprecated Prefer `createServiceRoleClient()` from `lib/supabase/service.ts`
 * which throws an error if misconfigured.
 */
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    console.error("[createAdminClient] SUPABASE_SERVICE_ROLE_KEY is not set - returning null");
    return null;
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey
  );
}

/** One Supabase SSR client + one `getUser` JWT round-trip per React server request (avoids duplicate auth work across layouts/pages/data loaders). */
export const createServerClient = cache(async () => {
  const cookieStore = await cookies();

  return createSupabaseServerClient(
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
            // Ignore - this can fail if called from Server Component
          }
        },
      },
    }
  );
});

export const getUser = cache(async () => {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
