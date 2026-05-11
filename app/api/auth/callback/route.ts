import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { safeInternalPath } from "@/lib/auth/safeRedirectPath";
import { RateLimitError } from "@/lib/errors/apiError";
import { logger } from "@/lib/logger";
import { getRateLimitIp, rateLimit } from "@/lib/ratelimit";

/** Picks trusted fields; unknown query keys from the provider are ignored. */
const authCallbackQuerySchema = z.object({
  code: z.string().min(1).max(4096).optional(),
  next: z.string().max(512).optional(),
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const { origin, searchParams } = url;

  const redirectFail = () => NextResponse.redirect(new URL("/login?error=auth_failed", origin));
  const redirectRateLimited = () =>
    NextResponse.redirect(new URL("/login?error=rate_limited", origin));

  try {
    await rateLimit({
      key: "auth_callback",
      identifier: getRateLimitIp(request),
      limit: 60,
      window: "1m",
    });

    const queryObj = Object.fromEntries(searchParams.entries());
    const parsed = authCallbackQuerySchema.safeParse(queryObj);
    if (!parsed.success) {
      return redirectFail();
    }

    const code = parsed.data.code;
    const next = safeInternalPath(parsed.data.next);

    if (!code) {
      return redirectFail();
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
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
              // Ignore - called from Server Component
            }
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }

    logger.error("auth_callback_exchange_failed", {
      message: error.message,
      errCode: error.code,
    });
  } catch (err) {
    if (err instanceof RateLimitError) {
      return redirectRateLimited();
    }
    logger.error("auth_callback_unexpected", {
      name: err instanceof Error ? err.name : "unknown",
    });
  }

  return redirectFail();
}
