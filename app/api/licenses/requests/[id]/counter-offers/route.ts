import { getRouteHandlerUser } from "@/lib/auth/routeHandlerUser";
import { toApiError } from "@/lib/errors/apiError";
import { getLicenseWorkspaceAccess } from "@/lib/license/workspaceAccess";
import { logger } from "@/lib/logger";
import { createRouteClient } from "@/lib/supabase/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: requestId } = await ctx.params;
    const supabase = await createRouteClient();
    const user = await getRouteHandlerUser(supabase);

    if (!user) {
      return Response.json(
        { ok: false, error: { code: "unauthorized", message: "Unauthorized" } },
        { status: 401 }
      );
    }

    const access = await getLicenseWorkspaceAccess(supabase, user, requestId);
    if (!access) {
      return Response.json(
        { ok: false, error: { code: "not_found", message: "License request not found." } },
        { status: 404 }
      );
    }

    const { data: counterOffers, error } = await supabase
      .from("license_counter_offers")
      .select("*")
      .eq("license_request_id", requestId)
      .order("created_at", { ascending: false });

    if (error) {
      const missingTable =
        error.code === "42P01" || error.message?.includes("license_counter_offers");
      logger.error("counter_offers_list_error", { requestId, userId: user.id, code: error.code });
      return Response.json(
        {
          ok: false,
          error: {
            code: missingTable ? "unavailable" : "db_error",
            message: missingTable
              ? "Counter-offers are not available yet."
              : "We couldn't load counter-offers right now.",
          },
          data: { counterOffers: [] },
        },
        { status: missingTable ? 503 : 500 }
      );
    }

    return Response.json({ ok: true, data: { counterOffers: counterOffers ?? [] } });
  } catch (err) {
    const { status, code, message } = toApiError(err);
    return Response.json({ ok: false, error: { code, message } }, { status });
  }
}
