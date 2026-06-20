import type { SupabaseClient } from "@supabase/supabase-js";

import {
  buildProfileCompletionItems,
  hasAllMeasurements,
  profileCompletionPercent,
  type ProfileCompletionInput,
  type ProfileCompletionItem,
} from "@/lib/profile/completion";
import type { KycStatus } from "@/types";

export async function fetchProfileCompletionForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<{ items: ProfileCompletionItem[]; percent: number; input: ProfileCompletionInput }> {
  const [profileRes, charPhotosRes] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "kyc_status, identity_submitted_at, handle, height, weight, chest, waist, hips, shoe_size, min_license_fee_inr, licensing_notes, platform_license_signed"
      )
      .eq("id", userId)
      .maybeSingle(),
    supabase.from("character_photos").select("id", { count: "exact", head: true }).eq("user_id", userId),
  ]);

  const profile = profileRes.data;
  const characterPhotoCount = charPhotosRes.count ?? 0;

  const licensingNotes =
    typeof profile?.licensing_notes === "string" ? profile.licensing_notes.trim() : "";

  const input: ProfileCompletionInput = {
    kycStatus: (profile?.kyc_status as KycStatus) ?? "unverified",
    identitySubmittedAt: profile?.identity_submitted_at ?? null,
    characterPhotoCount,
    hasMeasurements: profile ? hasAllMeasurements(profile) : false,
    handle: profile?.handle ?? null,
    hasPricing:
      (typeof profile?.min_license_fee_inr === "number" && profile.min_license_fee_inr > 0) ||
      licensingNotes.length > 0,
    platformLicenseSigned: profile?.platform_license_signed === true,
  };

  const items = buildProfileCompletionItems(input);
  return { items, percent: profileCompletionPercent(items), input };
}
