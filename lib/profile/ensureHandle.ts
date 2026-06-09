import type { SupabaseClient, User } from "@supabase/supabase-js";

import { normalizeHandle, validateHandle } from "@/lib/profile/handle";

const MAX_HANDLE_ATTEMPTS = 500;

function readMetadataString(metadata: Record<string, unknown>, key: string): string {
  const value = metadata[key];
  return typeof value === "string" ? value.trim() : "";
}

/** Ordered username-like strings from OAuth metadata and email local-part. */
export function handleCandidatesFromUser(user: Pick<User, "email" | "user_metadata">): string[] {
  const metadata = user.user_metadata ?? {};
  const raw = [
    readMetadataString(metadata, "preferred_username"),
    readMetadataString(metadata, "user_name"),
    readMetadataString(metadata, "username"),
    user.email?.split("@")[0]?.trim() ?? "",
  ].filter(Boolean);

  const seen = new Set<string>();
  const candidates: string[] = [];
  for (const value of raw) {
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    candidates.push(value);
  }
  return candidates;
}

export function sanitizeHandleCandidate(raw: string): string | null {
  const normalized = normalizeHandle(raw)
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 30);

  if (normalized.length < 3) return null;
  return validateHandle(normalized) === null ? normalized : null;
}

export function fallbackHandleFromUserId(userId: string): string {
  const suffix = userId.replace(/-/g, "").slice(-8);
  return `mu_${suffix}`.slice(0, 30);
}

async function isHandleTaken(
  supabase: SupabaseClient,
  handle: string,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .ilike("handle", handle)
    .neq("id", userId)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return !!data;
}

export async function pickAvailableHandle(
  supabase: SupabaseClient,
  userId: string,
  baseCandidate: string
): Promise<string | null> {
  const base = sanitizeHandleCandidate(baseCandidate);
  if (!base) return null;

  if (!(await isHandleTaken(supabase, base, userId))) return base;

  for (let i = 2; i <= MAX_HANDLE_ATTEMPTS; i += 1) {
    const suffix = String(i);
    const trimmed = `${base.slice(0, 30 - suffix.length)}${suffix}`;
    if (validateHandle(trimmed)) continue;
    if (!(await isHandleTaken(supabase, trimmed, userId))) return trimmed;
  }

  return null;
}

/** Assign a default public handle when the profile row has none yet. */
export async function ensureProfileHandle(
  supabase: SupabaseClient,
  user: User,
  currentHandle: string | null | undefined
): Promise<string | null> {
  if (typeof currentHandle === "string" && currentHandle.trim()) {
    return currentHandle.trim();
  }

  const candidates = handleCandidatesFromUser(user);
  let chosen: string | null = null;

  for (const candidate of candidates) {
    chosen = await pickAvailableHandle(supabase, user.id, candidate);
    if (chosen) break;
  }

  if (!chosen) {
    const fallback = fallbackHandleFromUserId(user.id);
    chosen = (await pickAvailableHandle(supabase, user.id, fallback)) ?? fallback;
  }

  const { error } = await supabase
    .from("profiles")
    .update({ handle: chosen })
    .eq("id", user.id)
    .is("handle", null);

  if (error) {
    if (error.code === "23505") {
      const retry = await pickAvailableHandle(supabase, user.id, chosen);
      if (!retry) return null;
      const { error: retryError } = await supabase
        .from("profiles")
        .update({ handle: retry })
        .eq("id", user.id)
        .is("handle", null);
      if (retryError) throw retryError;
      return retry;
    }
    throw error;
  }

  return chosen;
}
