import { requireUser } from "@/lib/auth/requireUser";
import { toApiError } from "@/lib/errors/apiError";
import { logger } from "@/lib/logger";
import { createRouteClient } from "@/lib/supabase/route";
import type { KycStatus } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    const supabase = await createRouteClient();

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("kyc_status, kyc_verified_at")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      logger.error("identity_status_fetch_error", { userId: user.id, code: error.code });
      return Response.json(
        { ok: false, error: { code: "db_error", message: "Failed to load identity status" } },
        { status: 500 }
      );
    }

    const kycStatus: KycStatus = profile?.kyc_status ?? "unverified";

    return Response.json({
      ok: true,
      data: {
        kycStatus,
        kycVerifiedAt: profile?.kyc_verified_at ?? null,
        kycVerified: kycStatus === "verified",
      },
    });
  } catch (err) {
    const { status, code, message } = toApiError(err);
    return Response.json({ ok: false, error: { code, message } }, { status });
  }
}
