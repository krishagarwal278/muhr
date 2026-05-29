import type { SupabaseClient } from "@supabase/supabase-js";

import { logger } from "@/lib/logger";

/**
 * Attach legacy public-form license requests to a brand account when they sign up
 * with the same email used on the Muhr card form.
 */
export async function linkBrandLicenseRequestsForUser(
  admin: SupabaseClient,
  userId: string,
  email: string | null | undefined
): Promise<number> {
  const normalized = email?.trim().toLowerCase();
  if (!normalized) return 0;

  const { data, error } = await admin
    .from("license_requests")
    .update({ brand_user_id: userId })
    .is("brand_user_id", null)
    .ilike("brand_email", normalized)
    .select("id");

  if (error) {
    logger.warn("link_brand_license_requests_failed", {
      userId,
      code: error.code,
      message: error.message,
    });
    return 0;
  }

  return data?.length ?? 0;
}
