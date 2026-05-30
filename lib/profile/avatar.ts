import type { SupabaseClient } from "@supabase/supabase-js";

export const PROFILE_AVATAR_MAX_BYTES = 5 * 1024 * 1024;
const SIGNED_URL_TTL_SEC = 3600;

export function isProfileAvatarMime(mime: string): boolean {
  return mime === "image/jpeg" || mime === "image/png" || mime === "image/webp";
}

export function isAvatarColumnMissing(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === "42703" || error.code === "PGRST204") return true;
  return (error.message?.toLowerCase() ?? "").includes("avatar_path");
}

export const AVATAR_MIGRATION_HINT =
  "Profile photos need database migration 028_profile_avatar.sql (run: supabase db push).";

export function profileAvatarStoragePath(userId: string, fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() || "jpg";
  const safeExt = ["jpg", "jpeg", "png", "webp"].includes(ext) ? ext : "jpg";
  return `${userId}/avatar/${Date.now()}.${safeExt}`;
}

/** Optional column — returns null when migration 028 is not applied yet. */
export async function loadAvatarPath(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("avatar_path")
    .eq("id", userId)
    .maybeSingle();
  if (error) return null;
  return data?.avatar_path ?? null;
}

export async function signedProfileAvatarUrl(
  supabase: SupabaseClient,
  path: string | null | undefined
): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage
    .from("assets")
    .createSignedUrl(path, SIGNED_URL_TTL_SEC);
  return data?.signedUrl ?? null;
}
