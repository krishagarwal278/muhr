import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { LicenseRequestRow } from "@/types/license";

export type LicenseWorkspaceRole = "creator" | "brand";

export async function getLicenseWorkspaceAccess(
  supabase: SupabaseClient,
  user: User,
  requestId: string
): Promise<{ row: LicenseRequestRow; role: LicenseWorkspaceRole } | null> {
  const { data, error } = await supabase.from("license_requests").select("*").eq("id", requestId).maybeSingle();

  if (error || !data) return null;

  const row = data as LicenseRequestRow;
  if (row.creator_id === user.id) return { row, role: "creator" };

  const em = user.email?.trim().toLowerCase() ?? "";
  const brandEm =
    typeof row.brand_email === "string" ? row.brand_email.trim().toLowerCase() : "";
  if (em && brandEm && em === brandEm) {
    return { row, role: "brand" };
  }

  if (row.brand_user_id && row.brand_user_id === user.id) {
    return { row, role: "brand" };
  }

  return null;
}

export function isContractInForce(row: LicenseRequestRow): boolean {
  return Boolean(
    row.contract_effective_at &&
      row.creator_signed_contract_at &&
      row.brand_signed_contract_at &&
      row.brand_payment_cleared_at
  );
}

export function canSignContract(row: LicenseRequestRow): boolean {
  if (row.status !== "accepted") return false;
  return Boolean(row.brand_payment_cleared_at);
}
