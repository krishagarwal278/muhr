import type { LicenseRequestRow } from "@/types/license";

/** Convert INR rupees (whole rupees in DB) to Razorpay paise. */
export function licenseFeeInrToPaise(feeInr: number): number {
  if (!Number.isFinite(feeInr) || feeInr <= 0) {
    throw new Error("Invalid license fee");
  }
  const paise = Math.round(feeInr * 100);
  if (paise <= 0) throw new Error("Invalid license fee");
  return paise;
}

export function resolveLicenseFeeInr(request: LicenseRequestRow): number | null {
  const fee = request.agreed_budget_inr ?? request.budget_inr;
  if (fee == null || !Number.isFinite(fee) || fee <= 0) return null;
  return Math.round(fee);
}

export function formatInrFromPaise(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}
