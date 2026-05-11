const PRODUCTION_PUBLIC_BASE = "https://muhr.app";

function stripTrailingSlash(s: string): string {
  return s.replace(/\/$/, "");
}

export function isLocalDevOrigin(origin: string): boolean {
  try {
    const { hostname } = new URL(origin);
    return hostname === "localhost" || hostname.startsWith("127.");
  } catch {
    return false;
  }
}

/**
 * Base URL for public creator links, QR codes, and shareable cards.
 * - Uses `NEXT_PUBLIC_APP_URL` when set.
 * - Never uses localhost / 127.* (those fall back to muhr.app so cards and QR always point at production).
 */
export function getPublicSiteBaseUrl(requestOrigin: string | null): string {
  const env = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (env) return stripTrailingSlash(env);
  if (requestOrigin) {
    const clean = stripTrailingSlash(requestOrigin);
    if (isLocalDevOrigin(clean)) return PRODUCTION_PUBLIC_BASE;
    return clean;
  }
  return PRODUCTION_PUBLIC_BASE;
}

/**
 * Same rules as {@link getPublicSiteBaseUrl} for client components (no request object).
 */
export function getPublicShareableSiteBase(): string {
  const env = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (env) return stripTrailingSlash(env);
  if (typeof window !== "undefined") {
    const o = stripTrailingSlash(window.location.origin);
    if (isLocalDevOrigin(o)) return PRODUCTION_PUBLIC_BASE;
    return o;
  }
  return PRODUCTION_PUBLIC_BASE;
}
