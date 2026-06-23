import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { logger } from "@/lib/logger";

export type LicensePaymentRow = {
  id: string;
  license_request_id: string;
  brand_user_id: string;
  creator_id: string;
  amount_paise: number;
  currency: string;
  rzp_order_id: string;
  rzp_payment_id: string | null;
  status: "created" | "authorized" | "captured" | "failed" | "refunded";
  failure_reason: string | null;
  creator_payout_status: "pending_manual" | "paid";
  created_at: string;
  updated_at: string;
};

/** Idempotent: mark payment captured and unlock the license payment step on the request. */
export async function finalizeLicensePaymentCapture(
  admin: SupabaseClient,
  args: {
    rzpOrderId: string;
    rzpPaymentId: string;
    rzpSignature?: string | null;
  }
): Promise<{ payment: LicensePaymentRow | null; alreadyCaptured: boolean }> {
  const { data: payment, error } = await admin
    .from("license_payments")
    .select("*")
    .eq("rzp_order_id", args.rzpOrderId)
    .maybeSingle();

  if (error || !payment) {
    logger.error("license_payment_not_found", { rzpOrderId: args.rzpOrderId, code: error?.code });
    return { payment: null, alreadyCaptured: false };
  }

  const row = payment as LicensePaymentRow;
  if (row.status === "captured") {
    return { payment: row, alreadyCaptured: true };
  }

  const now = new Date().toISOString();

  const { error: payErr } = await admin
    .from("license_payments")
    .update({
      status: "captured",
      rzp_payment_id: args.rzpPaymentId,
      rzp_signature: args.rzpSignature ?? null,
      updated_at: now,
    })
    .eq("id", row.id)
    .neq("status", "captured");

  if (payErr) {
    logger.error("license_payment_capture_update_failed", { paymentId: row.id, code: payErr.code });
    throw payErr;
  }

  const { data: licenseRow } = await admin
    .from("license_requests")
    .select("brand_payment_cleared_at, creator_signed_contract_at, brand_signed_contract_at, contract_effective_at")
    .eq("id", row.license_request_id)
    .maybeSingle();

  if (licenseRow && !licenseRow.brand_payment_cleared_at) {
    await admin
      .from("license_requests")
      .update({ brand_payment_cleared_at: now })
      .eq("id", row.license_request_id);
  }

  await applyContractEffectiveIfComplete(admin, row.license_request_id);

  const { data: nextPayment } = await admin
    .from("license_payments")
    .select("*")
    .eq("id", row.id)
    .single();

  return { payment: (nextPayment as LicensePaymentRow) ?? row, alreadyCaptured: false };
}

async function applyContractEffectiveIfComplete(admin: SupabaseClient, requestId: string) {
  const { data: row } = await admin.from("license_requests").select("*").eq("id", requestId).maybeSingle();
  if (!row) return;

  if (
    row.brand_payment_cleared_at &&
    row.creator_signed_contract_at &&
    row.brand_signed_contract_at &&
    !row.contract_effective_at
  ) {
    await admin
      .from("license_requests")
      .update({ contract_effective_at: new Date().toISOString() })
      .eq("id", requestId);
  }
}

export async function markLicensePaymentFailed(
  admin: SupabaseClient,
  rzpOrderId: string,
  failureReason: string
) {
  await admin
    .from("license_payments")
    .update({
      status: "failed",
      failure_reason: failureReason.slice(0, 500),
      updated_at: new Date().toISOString(),
    })
    .eq("rzp_order_id", rzpOrderId)
    .in("status", ["created", "authorized"]);
}
