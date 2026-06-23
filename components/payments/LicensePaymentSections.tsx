"use client";

import { useEffect, useState } from "react";

import { PayLicenseButton } from "@/components/payments/PayLicenseButton";
import { dataFromApiJson, apiErrorMessage } from "@/lib/api/response";
import { surfaceCardVariants } from "@/components/ui/surface-card";
import { cx } from "@/lib/cx";
import type { LicensePaymentSummary } from "@/types/payments";

function formatInr(n: number | null | undefined): string {
  if (n == null) return "—";
  return `₹${n.toLocaleString("en-IN")}`;
}

export function BrandLicensePaymentSection({
  licenseRequestId,
  amountInr,
  brandPaymentCleared,
  brand,
  onPaymentComplete,
  onMessage,
}: {
  licenseRequestId: string;
  amountInr: number | null;
  brandPaymentCleared: boolean;
  brand: { name?: string; email?: string; phone?: string };
  onPaymentComplete: () => void | Promise<void>;
  onMessage?: (message: string | null) => void;
}) {
  const [payment, setPayment] = useState<LicensePaymentSummary | null>(null);

  useEffect(() => {
    if (!brandPaymentCleared) return;
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/licenses/workspace/${licenseRequestId}/payment`);
      const json = await res.json().catch(() => null);
      if (cancelled || !res.ok) return;
      const data = dataFromApiJson<{ payment?: LicensePaymentSummary | null }>(json);
      if (data?.payment) setPayment(data.payment);
    })();
    return () => {
      cancelled = true;
    };
  }, [brandPaymentCleared, licenseRequestId]);

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-medium">Payment</h2>
      <div className={cx(surfaceCardVariants({ padding: "md", interactive: "none" }), "space-y-4")}>
        {brandPaymentCleared ? (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
            <span className="font-medium">Payment received</span>
            <span className="text-emerald-900/80">
              {formatInr(amountInr)}
              {payment?.rzpPaymentId ? ` · Ref ${payment.rzpPaymentId.slice(-8)}` : null}
            </span>
          </div>
        ) : amountInr == null ? (
          <p className="text-sm text-neutral-700">Agree on a license fee before payment.</p>
        ) : (
          <>
            <p className="text-sm text-neutral-800">
              Pay the license fee securely via Razorpay. Funds are collected by Muhr; creator payout is
              processed separately.
            </p>
            <div className="flex flex-wrap items-end justify-between gap-4 rounded-lg border border-black/10 bg-neutral-50 px-4 py-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Amount due</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-neutral-950">
                  {formatInr(amountInr)}
                </p>
              </div>
              <PayLicenseButton
                licenseRequestId={licenseRequestId}
                amountInr={amountInr}
                brand={brand}
                onSuccess={async () => {
                  onMessage?.("Payment successful — unlocking contract.");
                  await onPaymentComplete();
                }}
                onFailure={(msg) => onMessage?.(msg)}
              />
            </div>
            <p className="text-xs text-neutral-500">
              Test mode: use card 4111 1111 1111 1111, any future expiry, any CVV, OTP 1234.
            </p>
          </>
        )}
      </div>
    </section>
  );
}

export function CreatorPayoutSection({
  licenseRequestId,
  amountInr,
  brandPaymentCleared,
}: {
  licenseRequestId: string;
  amountInr: number | null;
  brandPaymentCleared: boolean;
}) {
  const [payment, setPayment] = useState<LicensePaymentSummary | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/licenses/workspace/${licenseRequestId}/payment`);
      const json = await res.json().catch(() => null);
      if (cancelled) return;
      if (!res.ok) {
        setLoadError(apiErrorMessage(json) ?? "Could not load payment status");
        return;
      }
      const data = dataFromApiJson<{ payment?: LicensePaymentSummary | null }>(json);
      setPayment(data?.payment ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [licenseRequestId, brandPaymentCleared]);

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-medium">Payment</h2>
      <div className={cx(surfaceCardVariants({ padding: "md", interactive: "none" }), "space-y-3")}>
        {loadError ? <p className="text-sm text-red-700">{loadError}</p> : null}

        {!brandPaymentCleared ? (
          <>
            <p className="text-sm text-neutral-700">
              Waiting for the brand to pay the license fee ({formatInr(amountInr)}). Contract signing and
              asset delivery unlock after payment clears.
            </p>
            <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 px-4 py-3 text-sm text-neutral-600">
              Payout pending — you will receive {formatInr(amountInr)} to your registered bank account after
              the brand pays and the agreement is in force.
            </div>
          </>
        ) : (
          <>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
              <p className="font-medium">Brand payment received · {formatInr(amountInr)}</p>
              <p className="mt-1 text-emerald-900/90">
                {payment?.creatorPayoutStatus === "paid"
                  ? "Your payout has been sent."
                  : "Your payout is being processed. Muhr transfers license fees within 5–7 business days after payment clears."}
              </p>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
