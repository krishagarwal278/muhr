import { z } from "zod";

import { getRouteHandlerUser } from "@/lib/auth/routeHandlerUser";
import { ApiHttpError, toApiError } from "@/lib/errors/apiError";
import { getLicenseWorkspaceAccess } from "@/lib/license/workspaceAccess";
import { licenseFeeInrToPaise, resolveLicenseFeeInr } from "@/lib/razorpay/amounts";
import { getRazorpayClient, isRazorpayConfigured, publicRazorpayKeyId } from "@/lib/razorpay/client";
import { logger } from "@/lib/logger";
import { createRouteClient } from "@/lib/supabase/route";
import { createServiceRoleClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  licenseRequestId: z.string().uuid(),
});

export async function POST(request: Request) {
  try {
    if (!isRazorpayConfigured()) {
      return Response.json(
        { ok: false, error: { code: "payments_unconfigured", message: "Payments are not configured." } },
        { status: 503 }
      );
    }

    const keyId = publicRazorpayKeyId();
    if (!keyId) {
      return Response.json(
        { ok: false, error: { code: "payments_unconfigured", message: "Payments are not configured." } },
        { status: 503 }
      );
    }

    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return Response.json(
        { ok: false, error: { code: "invalid_json", message: "Invalid JSON" } },
        { status: 400 }
      );
    }

    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return Response.json(
        { ok: false, error: { code: "invalid_input", message: "licenseRequestId is required." } },
        { status: 400 }
      );
    }

    const { licenseRequestId } = parsed.data;

    const supabase = await createRouteClient();
    const user = await getRouteHandlerUser(supabase);
    if (!user) {
      return Response.json(
        { ok: false, error: { code: "unauthorized", message: "Unauthorized" } },
        { status: 401 }
      );
    }

    const access = await getLicenseWorkspaceAccess(supabase, user, licenseRequestId);
    if (!access || access.role !== "brand") {
      return Response.json(
        { ok: false, error: { code: "forbidden", message: "Only the brand can pay for this license." } },
        { status: 403 }
      );
    }

    const row = access.row;
    if (row.status !== "accepted") {
      return Response.json(
        { ok: false, error: { code: "invalid_state", message: "License must be accepted before payment." } },
        { status: 400 }
      );
    }

    if (row.brand_payment_cleared_at) {
      return Response.json(
        { ok: false, error: { code: "already_paid", message: "Payment already recorded for this license." } },
        { status: 400 }
      );
    }

    const feeInr = resolveLicenseFeeInr(row);
    if (feeInr == null) {
      return Response.json(
        { ok: false, error: { code: "invalid_state", message: "No agreed license fee on this request." } },
        { status: 400 }
      );
    }

    const amountPaise = licenseFeeInrToPaise(feeInr);

    const admin = createServiceRoleClient();
    if (!admin) {
      return Response.json(
        { ok: false, error: { code: "unavailable", message: "Server misconfigured (service role)" } },
        { status: 503 }
      );
    }

    const { data: existing } = await admin
      .from("license_payments")
      .select("rzp_order_id, status")
      .eq("license_request_id", licenseRequestId)
      .in("status", ["created", "authorized"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const razorpay = getRazorpayClient();

    if (existing?.rzp_order_id) {
      const order = await razorpay.orders.fetch(existing.rzp_order_id);
      return Response.json({
        ok: true,
        data: {
          orderId: order.id,
          amount: order.amount,
          currency: order.currency,
          keyId,
        },
      });
    }

    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency: "INR",
      receipt: `lic_${licenseRequestId.replace(/-/g, "").slice(0, 32)}`,
      notes: {
        license_request_id: licenseRequestId,
        brand_user_id: user.id,
        creator_id: row.creator_id,
      },
    });

    const { error: insertErr } = await admin.from("license_payments").insert({
      license_request_id: licenseRequestId,
      brand_user_id: user.id,
      creator_id: row.creator_id,
      amount_paise: amountPaise,
      currency: "INR",
      rzp_order_id: order.id,
      status: "created",
    });

    if (insertErr) {
      logger.error("license_payment_insert_failed", {
        licenseRequestId,
        code: insertErr.code,
      });
      throw new ApiHttpError(500, "db_error", "Could not create payment record.");
    }

    return Response.json({
      ok: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId,
      },
    });
  } catch (err) {
    const { status, code, message } = toApiError(err);
    return Response.json({ ok: false, error: { code, message } }, { status });
  }
}
