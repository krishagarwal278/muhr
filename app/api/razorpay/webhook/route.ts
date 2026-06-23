import { finalizeLicensePaymentCapture, markLicensePaymentFailed } from "@/lib/razorpay/finalizePayment";
import { verifyWebhookSignature } from "@/lib/razorpay/signature";
import { logger } from "@/lib/logger";
import { createServiceRoleClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const signature = request.headers.get("x-razorpay-signature");
  if (!signature) {
    return Response.json({ ok: false, error: { code: "missing_signature", message: "No signature" } }, { status: 400 });
  }

  const rawBody = await request.text();

  if (!verifyWebhookSignature(rawBody, signature)) {
    return Response.json(
      { ok: false, error: { code: "invalid_signature", message: "Invalid webhook signature" } },
      { status: 400 }
    );
  }

  const admin = createServiceRoleClient();
  if (!admin) {
    return Response.json(
      { ok: false, error: { code: "unavailable", message: "Server misconfigured (service role)" } },
      { status: 503 }
    );
  }

  let event: {
    event?: string;
    payload?: {
      payment?: { entity?: { id?: string; order_id?: string; error_description?: string } };
    };
  };

  try {
    event = JSON.parse(rawBody);
  } catch {
    return Response.json({ ok: false, error: { code: "invalid_json", message: "Invalid JSON" } }, { status: 400 });
  }

  try {
    switch (event.event) {
      case "payment.captured": {
        const payment = event.payload?.payment?.entity;
        if (!payment?.order_id || !payment.id) break;

        await finalizeLicensePaymentCapture(admin, {
          rzpOrderId: payment.order_id,
          rzpPaymentId: payment.id,
        });
        break;
      }

      case "payment.failed": {
        const payment = event.payload?.payment?.entity;
        if (!payment?.order_id) break;

        await markLicensePaymentFailed(
          admin,
          payment.order_id,
          payment.error_description ?? "payment_failed"
        );
        break;
      }

      default:
        break;
    }
  } catch (err) {
    logger.error("razorpay_webhook_handler_error", {
      event: event.event,
      message: err instanceof Error ? err.message : "unknown",
    });
    return Response.json({ ok: false, error: { code: "internal_error", message: "Webhook handler failed" } }, { status: 500 });
  }

  return Response.json({ ok: true });
}
