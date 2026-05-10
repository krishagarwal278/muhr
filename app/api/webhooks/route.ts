import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  const body = await request.text();

  // TODO: Verify webhook signature based on source
  // TODO: Route to appropriate handler (Razorpay, platform callbacks, etc.)

  logger.warn("webhook_received", {
    bodyLength: body.length,
    hasSignatureHeader: Boolean(request.headers.get("x-webhook-signature")),
  });

  return NextResponse.json({ received: true });
}
