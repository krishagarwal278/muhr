import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth/requireUser";
import { toApiError } from "@/lib/errors/apiError";
import { logger } from "@/lib/logger";
import { createRouteClient } from "@/lib/supabase/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    const supabase = await createRouteClient();

    const { data: allRows, error: lrError } = await supabase
      .from("license_requests")
      .select("*")
      .eq("creator_id", user.id)
      .order("created_at", { ascending: false });

    if (lrError) {
      logger.error("license_requests_fetch_error", { userId: user.id, code: lrError.code });
      return Response.json(
        { ok: false, error: { code: "db_error", message: "Failed to load license requests" } },
        { status: 500 }
      );
    }

    const rows = allRows ?? [];
    const incomingRequests = rows.filter((r) => r.status === "pending");
    const respondedRequests = rows
      .filter((r) => r.status === "accepted" || r.status === "declined")
      .sort((a, b) => {
        const ta = new Date(a.responded_at ?? a.created_at).getTime();
        const tb = new Date(b.responded_at ?? b.created_at).getTime();
        return tb - ta;
      });

    const withdrawnRequests = rows
      .filter((r) => r.status === "withdrawn")
      .sort((a, b) => {
        const ta = new Date(a.cancelled_at ?? a.created_at).getTime();
        const tb = new Date(b.cancelled_at ?? b.created_at).getTime();
        return tb - ta;
      });

    const acceptedCount = rows.filter((r) => r.status === "accepted").length;
    const declinedCount = rows.filter((r) => r.status === "declined").length;
    const withdrawnCount = rows.filter((r) => r.status === "withdrawn").length;
    const pendingCount = incomingRequests.length;

    return Response.json({
      ok: true,
      data: {
        active: [],
        pending: [],
        expired: [],
        incomingRequests,
        respondedRequests,
        withdrawnRequests,
        counts: {
          pending: pendingCount,
          accepted: acceptedCount,
          declined: declinedCount,
          withdrawn: withdrawnCount,
        },
      },
    });
  } catch (err) {
    const { status, code, message } = toApiError(err);
    return Response.json({ ok: false, error: { code, message } }, { status });
  }
}

/**
 * POST /api/licenses - Create a new license request
 * 
 * NOT YET IMPLEMENTED - Returns 501 to avoid misleading callers.
 * See: AUD-010 in AUDIT.md
 */
export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code: "not_implemented",
        message: "License request creation is not yet implemented.",
      },
    },
    { status: 501 }
  );
}
