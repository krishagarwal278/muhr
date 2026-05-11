import { type EmailOtpType } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

import { safeInternalPath } from "@/lib/auth/safeRedirectPath";
import { createServerClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * PKCE email confirmation (recovery, signup, etc.) when the template links here with
 * `token_hash` + `type` query params. See Supabase Auth email templates.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeInternalPath(searchParams.get("next"), "/update-password");

  if (!token_hash || !type) {
    return NextResponse.redirect(new URL("/login?error=auth_failed", origin));
  }

  const supabase = await createServerClient();
  const { error } = await supabase.auth.verifyOtp({
    type,
    token_hash,
  });

  if (!error) {
    return NextResponse.redirect(new URL(next, origin));
  }

  logger.error("auth_confirm_verify_failed", {
    message: error.message,
    code: error.code,
  });
  return NextResponse.redirect(new URL("/login?error=auth_failed", origin));
}
