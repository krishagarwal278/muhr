"use client";

import { useRazorpayCheckout } from "@/lib/razorpay/useRazorpayCheckout";
import { primaryButtonVariants } from "@/components/ui/button-recipes";

function formatInr(n: number): string {
  return `₹${n.toLocaleString("en-IN")}`;
}

export function PayLicenseButton({
  licenseRequestId,
  amountInr,
  brand,
  disabled,
  onSuccess,
  onFailure,
}: {
  licenseRequestId: string;
  amountInr: number;
  brand: { name?: string; email?: string; phone?: string };
  disabled?: boolean;
  onSuccess?: () => void | Promise<void>;
  onFailure?: (message: string) => void;
}) {
  const { pay, loading } = useRazorpayCheckout();

  return (
    <button
      type="button"
      disabled={disabled || loading}
      onClick={() =>
        void pay({
          licenseRequestId,
          brandName: brand.name,
          brandEmail: brand.email,
          brandPhone: brand.phone,
          onSuccess,
          onFailure,
        })
      }
      className={primaryButtonVariants()}
    >
      {loading ? "Opening checkout…" : `Pay ${formatInr(amountInr)}`}
    </button>
  );
}
