import { getRouteHandlerUser } from "@/lib/auth/routeHandlerUser";
import { sendBrandCounterOfferEmail } from "@/lib/email/sendBrandLicenseNotifications";
import { shouldEmailExternalBrand } from "@/lib/email/shouldEmailExternalBrand";
import { toApiError } from "@/lib/errors/apiError";
import { parseCounterOfferPayload } from "@/lib/license/counterOffer";
import { logger } from "@/lib/logger";
import { createRouteClient } from "@/lib/supabase/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
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

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return Response.json(
        { ok: false, error: { code: "invalid_json", message: "Invalid JSON" } },
        { status: 400 }
      );
    }

    const parsed = parseCounterOfferPayload(body);
    if (!parsed.ok) {
      return Response.json(
        { ok: false, error: { code: "validation_error", message: parsed.error } },
        { status: 400 }
      );
    }
    const { channels, territories, durationDays, proposedBudgetInr, note } = parsed.payload;

    const { data: licenseReq, error: fetchErr } = await supabase
      .from("license_requests")
      .select(
        "id, creator_id, status, brand_email, brand_name, brand_user_id, channels, territories, duration_days, budget_inr, creator_profile:profiles!license_requests_creator_id_fkey(handle, display_name)"
      )
      .eq("id", requestId)
      .maybeSingle();

    if (fetchErr) {
      logger.error("counter_offer_fetch_error", { requestId, userId: user.id, code: fetchErr.code });
      return Response.json(
        { ok: false, error: { code: "db_error", message: "We couldn't load this license request right now." } },
        { status: 500 }
      );
    }

    if (!licenseReq) {
      return Response.json(
        { ok: false, error: { code: "not_found", message: "License request not found." } },
        { status: 404 }
      );
    }

    if (licenseReq.creator_id !== user.id) {
      return Response.json(
        { ok: false, error: { code: "forbidden", message: "You can only create counter-offers for your own license requests." } },
        { status: 403 }
      );
    }

    if (licenseReq.status !== "pending") {
      return Response.json(
        {
          ok: false,
          error: {
            code: "invalid_state",
            message: "Counter-offers can only be created for pending requests. This request has already been accepted, declined, or withdrawn.",
          },
        },
        { status: 400 }
      );
    }

    const { count: pendingCount, error: pendingErr } = await supabase
      .from("license_counter_offers")
      .select("id", { count: "exact", head: true })
      .eq("license_request_id", requestId)
      .eq("status", "pending");

    if (pendingErr) {
      const missingTable =
        pendingErr.code === "42P01" ||
        pendingErr.message?.includes("license_counter_offers");
      logger.error("counter_offer_pending_check_error", { requestId, code: pendingErr.code });
      return Response.json(
        {
          ok: false,
          error: {
            code: missingTable ? "unavailable" : "db_error",
            message: missingTable
              ? "Counter-offers are not available yet. Please try again later."
              : "We couldn't submit your counter-offer right now.",
          },
        },
        { status: missingTable ? 503 : 500 }
      );
    }

    if ((pendingCount ?? 0) > 0) {
      return Response.json(
        {
          ok: false,
          error: {
            code: "conflict",
            message: "You already have a pending counter-offer on this request. Wait for the brand to respond, or ask them to decline it before sending another.",
          },
        },
        { status: 409 }
      );
    }

    const { data: counterOffer, error: insertErr } = await supabase
      .from("license_counter_offers")
      .insert({
        license_request_id: requestId,
        channels,
        territories,
        duration_days: durationDays,
        proposed_budget_inr: proposedBudgetInr,
        note: note.length > 0 ? note : null,
        status: "pending",
        created_by_user_id: user.id,
      })
      .select("*")
      .single();

    if (insertErr) {
      logger.error("counter_offer_insert_error", { requestId, userId: user.id, code: insertErr.code });
      return Response.json(
        { ok: false, error: { code: "db_error", message: "We couldn't save your counter-offer right now. Please try again in a moment." } },
        { status: 500 }
      );
    }

    const lr = licenseReq as {
      brand_email: string;
      brand_name: string;
      brand_user_id: string | null;
      channels: string[];
      territories: string[];
      duration_days: number;
      budget_inr: number | null;
      creator_profile:
        | { handle: string | null; display_name: string | null }
        | { handle: string | null; display_name: string | null }[]
        | null;
    };

    if (
      shouldEmailExternalBrand({
        brandEmail: lr.brand_email,
        brandUserId: lr.brand_user_id,
      })
    ) {
      const rawProfile = lr.creator_profile;
      const profile = Array.isArray(rawProfile) ? rawProfile[0] ?? null : rawProfile;
      const creatorHandle = profile?.handle?.trim() || "creator";
      const creatorDisplayName =
        profile?.display_name?.trim() || profile?.handle?.trim() || "Creator";

      void sendBrandCounterOfferEmail({
        brandName: lr.brand_name,
        brandEmail: lr.brand_email,
        creatorDisplayName,
        creatorHandle,
        originalChannels: lr.channels ?? [],
        originalTerritories: lr.territories ?? [],
        originalDurationDays: lr.duration_days ?? 30,
        originalBudgetInr: lr.budget_inr,
        proposedChannels: channels,
        proposedTerritories: territories,
        proposedDurationDays: durationDays,
        proposedBudgetInr,
        note: note.length > 0 ? note : null,
      }).catch((e) =>
        logger.error("brand_counter_offer_email_failed", {
          message: e instanceof Error ? e.message : String(e),
          requestId,
        })
      );
    }

    return Response.json({ ok: true, data: { counterOffer } }, { status: 201 });
  } catch (err) {
    const { status, code, message } = toApiError(err);
    return Response.json({ ok: false, error: { code, message } }, { status });
  }
}
