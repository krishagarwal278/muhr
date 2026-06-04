import type { User } from "@supabase/supabase-js";

/** Matches @supabase/auth-js session expiry margin. */
const EXPIRY_MARGIN_MS = 10_000;
const BASE64_PREFIX = "base64-";

type CookieLike = { name: string; value: string };

type StoredAuthSession = {
  expires_at?: number;
  refresh_token?: string;
  user?: User | null;
};

export function supabaseAuthCookieStorageKey(supabaseUrl: string): string {
  try {
    const ref = new URL(supabaseUrl).hostname.split(".")[0];
    return `sb-${ref}-auth-token`;
  } catch {
    return "sb-auth-token";
  }
}

function combineCookieChunks(cookies: CookieLike[], key: string): string | null {
  const direct = cookies.find((c) => c.name === key)?.value;
  if (direct) return direct;

  const parts: string[] = [];
  for (let i = 0; ; i += 1) {
    const chunk = cookies.find((c) => c.name === `${key}.${i}`)?.value;
    if (!chunk) break;
    parts.push(chunk);
  }
  return parts.length > 0 ? parts.join("") : null;
}

/** Minimal base64url decode for Supabase SSR auth cookies. */
function stringFromBase64URL(value: string): string {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64.length % 4 === 0 ? "" : "=".repeat(4 - (base64.length % 4));
  if (typeof Buffer !== "undefined") {
    return Buffer.from(base64 + pad, "base64").toString("utf8");
  }
  return atob(base64 + pad);
}

function decodeStoredSession(raw: string): StoredAuthSession | null {
  try {
    const decoded = raw.startsWith(BASE64_PREFIX)
      ? stringFromBase64URL(raw.slice(BASE64_PREFIX.length))
      : raw;
    const parsed = JSON.parse(decoded) as StoredAuthSession;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function sessionAllowsMiddleware(session: StoredAuthSession): boolean {
  if (!session.user?.id) return false;

  if (!session.expires_at) return true;

  const expired = session.expires_at * 1000 - Date.now() < EXPIRY_MARGIN_MS;
  if (!expired) return true;

  // Expired access token but refresh token present — avoid Edge refresh fetch;
  // API routes (Node) can refresh on the next request.
  return !!session.refresh_token;
}

/**
 * Reads the Supabase session from request cookies without network calls.
 * Prevents Edge middleware from calling auth refresh (which fails with `fetch failed`
 * when Supabase is unreachable from the Edge sandbox).
 */
export function getMiddlewareUserFromCookies(
  cookies: CookieLike[],
  supabaseUrl: string
): User | null {
  const storageKey = supabaseAuthCookieStorageKey(supabaseUrl);
  const raw = combineCookieChunks(cookies, storageKey);
  if (!raw) return null;

  const session = decodeStoredSession(raw);
  if (!session || !sessionAllowsMiddleware(session)) return null;

  return session.user ?? null;
}
