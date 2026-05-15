import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { LicenseRequestRow } from "@/types/license";

export type LicenseWorkspaceRole = "creator" | "brand";

/** Application-level authorization — do not infer access from RLS alone. */
export function resolveLicenseRequestAccess(
  user: User,
  row: LicenseRequestRow
): LicenseWorkspaceRole | null {
  if (row.creator_id === user.id) return "creator";

  if (row.brand_user_id && row.brand_user_id === user.id) return "brand";

  const em = user.email?.trim().toLowerCase() ?? "";
  const brandEm =
    typeof row.brand_email === "string" ? row.brand_email.trim().toLowerCase() : "";
  if (em && brandEm && em === brandEm) return "brand";

  return null;
}

export async function getLicenseWorkspaceAccess(
  supabase: SupabaseClient,
  user: User,
  requestId: string
): Promise<{ row: LicenseRequestRow; role: LicenseWorkspaceRole } | null> {
  const { data, error } = await supabase.from("license_requests").select("*").eq("id", requestId).maybeSingle();

  if (error || !data) return null;

  const row = data as LicenseRequestRow;
  const role = resolveLicenseRequestAccess(user, row);
  if (!role) return null;

  return { row, role };
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
