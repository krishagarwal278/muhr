import type { SupabaseClient } from "@supabase/supabase-js";

import { MIN_CHARACTER_PHOTOS } from "@/lib/profile/completion";

export function hasRequiredCharacterPhotosForVerification(count: number): boolean {
  return count >= MIN_CHARACTER_PHOTOS;
}

export async function countCharacterPhotos(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("character_photos")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) throw error;
  return count ?? 0;
}
