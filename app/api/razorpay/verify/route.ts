import { z } from "zod";

import { toApiError } from "@/lib/errors/apiError";
import { finalizeLicensePaymentCapture, markLicensePaymentFailed } from "@/lib/razorpay/finalizePayment";
import { verifyCheckoutSignature } from "@/lib/razorpay/signature";
import { logger } from "@/lib/logger";
import { createServiceRoleClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

export async function POST(request: Request) {
  try {
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
        { ok: false, error: { code: "invalid_input", message: "Missing payment verification fields." } },
        { status: 400 }
      );
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = parsed.data;

    const admin = createServiceRoleClient();
    if (!admin) {
      return Response.json(
        { ok: false, error: { code: "unavailable", message: "Server misconfigured (service role)" } },
        { status: 503 }
      );
    }

    const ok = verifyCheckoutSignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });

    if (!ok) {
      await markLicensePaymentFailed(admin, razorpay_order_id, "signature_mismatch");
      return Response.json(
        { ok: false, error: { code: "invalid_signature", message: "Payment verification failed." } },
        { status: 400 }
      );
    }

    await admin
      .from("license_payments")
      .update({
        rzp_payment_id: razorpay_payment_id,
        rzp_signature: razorpay_signature,
        status: "authorized",
        updated_at: new Date().toISOString(),
      })
      .eq("rzp_order_id", razorpay_order_id)
      .in("status", ["created", "authorized"]);

    const { payment, alreadyCaptured } = await finalizeLicensePaymentCapture(admin, {
      rzpOrderId: razorpay_order_id,
      rzpPaymentId: razorpay_payment_id,
      rzpSignature: razorpay_signature,
    });

    if (!payment) {
      logger.error("license_payment_verify_missing_row", { rzpOrderId: razorpay_order_id });
      return Response.json(
        { ok: false, error: { code: "not_found", message: "Payment record not found." } },
        { status: 404 }
      );
    }

    return Response.json({
      ok: true,
      data: {
        paymentStatus: payment.status,
        alreadyCaptured,
        licenseRequestId: payment.license_request_id,
      },
    });
  } catch (err) {
    const { status, code, message } = toApiError(err);
    return Response.json({ ok: false, error: { code, message } }, { status });
  }
}
