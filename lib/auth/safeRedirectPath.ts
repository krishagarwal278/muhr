/**
 * Prevent open redirects: only same-origin relative paths are allowed.
 * Used by `/api/auth/callback` and OAuth `redirect_to` builders.
 */
export function safeInternalPath(raw: string | null | undefined, fallback = "/dashboard"): string {
  if (raw == null || raw === "") return fallback;
  if (raw.length > 512) return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//")) return fallback;
  if (raw.includes("\\") || raw.includes("\0")) return fallback;
  return raw;
}
