import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getRouteHandlerUser } from "@/lib/auth/routeHandlerUser";
import { parseJoinedLicenseRequest } from "@/lib/license/counterOffer";
import { resolveLicenseRequestAccess } from "@/lib/license/workspaceAccess";
import { createServiceRoleClient } from "@/lib/supabase/service";
import type { LicenseRequestRow } from "@/types/license";

async function supabaseFromCookies() {
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
            // Ignore
          }
        },
      },
    }
  );
}

/**
 * PATCH /api/licenses/counter-offers/[id]
 * Brands accept or decline a counter-offer. On accept, license request terms are updated via service role.
 */
export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id: counterOfferId } = await ctx.params;
  const supabase = await supabaseFromCookies();
  const user = await getRouteHandlerUser(supabase);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = body.action;
  if (action !== "accept" && action !== "decline") {
    return NextResponse.json(
      { error: "Action must be 'accept' or 'decline'." },
      { status: 400 }
    );
  }

  const { data: counterOffer, error: fetchErr } = await supabase
    .from("license_counter_offers")
    .select("*, license_requests!inner(id, brand_email, status, creator_id, brand_user_id)")
    .eq("id", counterOfferId)
    .maybeSingle();

  if (fetchErr) {
    console.error("[counter-offer respond] fetch failed", {
      counterOfferId,
      userId: user.id,
      code: fetchErr.code,
      message: fetchErr.message,
    });
    return NextResponse.json(
      { error: "We couldn't load this counter-offer right now." },
      { status: 500 }
    );
  }

  if (!counterOffer) {
    return NextResponse.json({ error: "Counter-offer not found." }, { status: 404 });
  }

  const licenseReq = parseJoinedLicenseRequest(counterOffer.license_requests);
  if (!licenseReq) {
    console.error("[counter-offer respond] malformed license_requests join", {
      counterOfferId,
    });
    return NextResponse.json(
      { error: "We couldn't load this counter-offer right now." },
      { status: 500 }
    );
  }

  const role = resolveLicenseRequestAccess(user, licenseReq as LicenseRequestRow);
  if (role !== "brand") {
    return NextResponse.json(
      { error: "Only the brand on this request can accept or decline counter-offers." },
      { status: 403 }
    );
  }

  if (counterOffer.status !== "pending") {
    return NextResponse.json(
      { error: "This counter-offer has already been accepted or declined." },
      { status: 400 }
    );
  }

  if (licenseReq.status !== "pending") {
    return NextResponse.json(
      { error: "This license request is no longer pending." },
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
      console.error("[counter-offer decline] update failed", {
        counterOfferId,
        userId: user.id,
        code: updateOfferErr.code,
        message: updateOfferErr.message,
      });
      return NextResponse.json(
        { error: "We couldn't mark the counter-offer as declined. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Counter-offer declined." });
  }

  const admin = createServiceRoleClient();
  if (!admin) {
    console.error("[counter-offer accept] service role unavailable", { counterOfferId });
    return NextResponse.json(
      { error: "We couldn't update the license right now. Please try again shortly." },
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
    console.error("[counter-offer accept] license_requests update failed", {
      counterOfferId,
      requestId: licenseReq.id,
      code: updateReqErr.code,
      message: updateReqErr.message,
    });
    return NextResponse.json(
      { error: "We couldn't update the license request right now. Please try again." },
      { status: 500 }
    );
  }

  const { error: acceptErr } = await admin
    .from("license_counter_offers")
    .update({ status: "accepted", responded_at: now })
    .eq("id", counterOfferId);

  if (acceptErr) {
    console.error("[counter-offer accept] status update failed", {
      counterOfferId,
      code: acceptErr.code,
      message: acceptErr.message,
    });
    return NextResponse.json(
      { error: "We couldn't mark the counter-offer as accepted. Please try again." },
      { status: 500 }
    );
  }

  await admin
    .from("license_counter_offers")
    .update({ status: "declined", responded_at: now })
    .eq("license_request_id", licenseReq.id)
    .eq("status", "pending")
    .neq("id", counterOfferId);

  return NextResponse.json({
    message: "Counter-offer accepted. The license request has been updated with the new terms.",
  });
}
