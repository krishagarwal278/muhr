import crypto from "node:crypto";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { verifyCheckoutSignature, verifyWebhookSignature } from "@/lib/razorpay/signature";

describe("razorpay signature", () => {
  const originalSecret = process.env.RAZORPAY_KEY_SECRET;
  const originalWebhook = process.env.RAZORPAY_WEBHOOK_SECRET;

  beforeEach(() => {
    process.env.RAZORPAY_KEY_SECRET = "test_secret";
    process.env.RAZORPAY_WEBHOOK_SECRET = "whsec_test";
  });

  afterEach(() => {
    process.env.RAZORPAY_KEY_SECRET = originalSecret;
    process.env.RAZORPAY_WEBHOOK_SECRET = originalWebhook;
    vi.restoreAllMocks();
  });

  it("verifies checkout signature for order|payment payload", () => {
    const orderId = "order_abc";
    const paymentId = "pay_xyz";
    const signature = crypto
      .createHmac("sha256", "test_secret")
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    expect(
      verifyCheckoutSignature({ orderId, paymentId, signature })
    ).toBe(true);
    expect(
      verifyCheckoutSignature({ orderId, paymentId, signature: "bad" })
    ).toBe(false);
  });

  it("verifies webhook signature over raw body", () => {
    const rawBody = '{"event":"payment.captured"}';
    const signature = crypto.createHmac("sha256", "whsec_test").update(rawBody).digest("hex");

    expect(verifyWebhookSignature(rawBody, signature)).toBe(true);
    expect(verifyWebhookSignature(rawBody, "invalid")).toBe(false);
  });
});
