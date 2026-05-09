import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const signature = request.headers.get("x-webhook-signature");
  const body = await request.text();

  // TODO: Verify webhook signature based on source
  // TODO: Route to appropriate handler (Razorpay, platform callbacks, etc.)

  console.log("Webhook received:", { signature, bodyLength: body.length });

  return NextResponse.json({ received: true });
}
