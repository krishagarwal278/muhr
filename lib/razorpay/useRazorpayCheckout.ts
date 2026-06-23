"use client";

import { useCallback, useState } from "react";

import { apiErrorMessage, dataFromApiJson } from "@/lib/api/response";

const RAZORPAY_SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";

async function loadRazorpayScript(): Promise<void> {
  if (typeof window === "undefined") return;
  if (window.Razorpay) return;

  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[src="${RAZORPAY_SCRIPT}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Razorpay script failed to load")), {
        once: true,
      });
      return;
    }
    const script = document.createElement("script");
    script.src = RAZORPAY_SCRIPT;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Razorpay script failed to load"));
    document.body.appendChild(script);
  });
}

type OrderResponse = {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
};

export function useRazorpayCheckout() {
  const [loading, setLoading] = useState(false);

  const pay = useCallback(
    async (args: {
      licenseRequestId: string;
      brandName?: string;
      brandEmail?: string;
      brandPhone?: string;
      onSuccess?: () => void | Promise<void>;
      onFailure?: (message: string) => void;
    }) => {
      setLoading(true);
      try {
        await loadRazorpayScript();

        const res = await fetch("/api/razorpay/order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ licenseRequestId: args.licenseRequestId }),
        });

        const json = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(apiErrorMessage(json) ?? "Failed to create payment order");
        }

        const order = dataFromApiJson<OrderResponse>(json);
        if (!order?.orderId || !order.keyId) {
          throw new Error("Invalid payment order response");
        }

        const rzp = new window.Razorpay({
          key: order.keyId,
          amount: order.amount,
          currency: order.currency,
          order_id: order.orderId,
          name: "Muhr",
          description: `License payment`,
          prefill: {
            name: args.brandName,
            email: args.brandEmail,
            contact: args.brandPhone,
          },
          theme: { color: "#2D5BFF" },
          handler: async (response) => {
            try {
              const verifyRes = await fetch("/api/razorpay/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(response),
              });
              const verifyJson = await verifyRes.json().catch(() => null);
              if (!verifyRes.ok) {
                args.onFailure?.(apiErrorMessage(verifyJson) ?? "Payment verification failed");
                return;
              }
              await args.onSuccess?.();
            } catch {
              args.onFailure?.("Payment verification failed");
            } finally {
              setLoading(false);
            }
          },
          modal: {
            ondismiss: () => {
              setLoading(false);
              args.onFailure?.("Payment cancelled");
            },
          },
        });

        rzp.open();
      } catch (err) {
        setLoading(false);
        args.onFailure?.((err as Error).message);
      }
    },
    []
  );

  return { pay, loading };
}
