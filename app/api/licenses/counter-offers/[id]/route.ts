import { getRouteHandlerUser } from "@/lib/auth/routeHandlerUser";
import { toApiError } from "@/lib/errors/apiError";
import { parseJoinedLicenseRequest } from "@/lib/license/counterOffer";
import { resolveLicenseRequestAccess } from "@/lib/license/workspaceAccess";
import { logger } from "@/lib/logger";
import { createRouteClient } from "@/lib/supabase/route";
import { createServiceRoleClient } from "@/lib/supabase/service";
import type { LicenseRequestRow } from "@/types/license";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id: counterOfferId } = await ctx.params;
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

    const action = body.action;
    if (action !== "accept" && action !== "decline") {
      return Response.json(
        { ok: false, error: { code: "invalid_input", message: "Action must be 'accept' or 'decline'." } },
        { status: 400 }
      );
    }

    const { data: counterOffer, error: fetchErr } = await supabase
      .from("license_counter_offers")
      .select("*, license_requests!inner(id, brand_email, status, creator_id, brand_user_id)")
      .eq("id", counterOfferId)
      .maybeSingle();

    if (fetchErr) {
      logger.error("counter_offer_respond_fetch_error", { counterOfferId, userId: user.id, code: fetchErr.code });
      return Response.json(
        { ok: false, error: { code: "db_error", message: "We couldn't load this counter-offer right now." } },
        { status: 500 }
      );
    }

    if (!counterOffer) {
      return Response.json(
        { ok: false, error: { code: "not_found", message: "Counter-offer not found." } },
        { status: 404 }
      );
    }

    const licenseReq = parseJoinedLicenseRequest(counterOffer.license_requests);
    if (!licenseReq) {
      logger.error("counter_offer_malformed_join", { counterOfferId });
      return Response.json(
        { ok: false, error: { code: "db_error", message: "We couldn't load this counter-offer right now." } },
        { status: 500 }
      );
    }

    const role = resolveLicenseRequestAccess(user, licenseReq as LicenseRequestRow);
    if (role !== "brand") {
      return Response.json(
        { ok: false, error: { code: "forbidden", message: "Only the brand on this request can accept or decline counter-offers." } },
        { status: 403 }
      );
    }

    if (counterOffer.status !== "pending") {
      return Response.json(
        { ok: false, error: { code: "already_responded", message: "This counter-offer has already been accepted or declined." } },
        { status: 400 }
      );
    }

    if (licenseReq.status !== "pending") {
      return Response.json(
        { ok: false, error: { code: "invalid_state", message: "This license request is no longer pending." } },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    if (action === "decline") {
      const { error: updateOfferErr } = await supabase
        .from("license_counter_offers")
        .update({ status: "declined", responded_at: now })
        .eq("id", counterOfferId);

      if (updateOfferErr) {
        logger.error("counter_offer_decline_error", { counterOfferId, userId: user.id, code: updateOfferErr.code });
        return Response.json(
          { ok: false, error: { code: "db_error", message: "We couldn't mark the counter-offer as declined. Please try again." } },
          { status: 500 }
        );
      }

      return Response.json({ ok: true, data: { message: "Counter-offer declined." } });
    }

    const admin = createServiceRoleClient();
    if (!admin) {
      logger.error("counter_offer_accept_no_admin", { counterOfferId });
      return Response.json(
        { ok: false, error: { code: "unavailable", message: "We couldn't update the license right now. Please try again shortly." } },
        { status: 503 }
      );
    }

    const { error: updateReqErr } = await admin
      .from("license_requests")
      .update({
        channels: counterOffer.channels,
        territories: counterOffer.territories,
        duration_days: counterOffer.duration_days,
        budget_inr: counterOffer.proposed_budget_inr,
      })
      .eq("id", licenseReq.id);

    if (updateReqErr) {
      logger.error("counter_offer_accept_request_update_error", { counterOfferId, requestId: licenseReq.id, code: updateReqErr.code });
      return Response.json(
        { ok: false, error: { code: "db_error", message: "We couldn't update the license request right now. Please try again." } },
        { status: 500 }
      );
    }

    const { error: acceptErr } = await admin
      .from("license_counter_offers")
      .update({ status: "accepted", responded_at: now })
      .eq("id", counterOfferId);

    if (acceptErr) {
      logger.error("counter_offer_accept_status_error", { counterOfferId, code: acceptErr.code });
      return Response.json(
        { ok: false, error: { code: "db_error", message: "We couldn't mark the counter-offer as accepted. Please try again." } },
        { status: 500 }
      );
    }

    await admin
      .from("license_counter_offers")
      .update({ status: "declined", responded_at: now })
      .eq("license_request_id", licenseReq.id)
      .eq("status", "pending")
      .neq("id", counterOfferId);

    return Response.json({
      ok: true,
      data: { message: "Counter-offer accepted. The license request has been updated with the new terms." },
    });
  } catch (err) {
    const { status, code, message } = toApiError(err);
    return Response.json({ ok: false, error: { code, message } }, { status });
  }
}
