const PRODUCTION_PUBLIC_BASE = "https://muhr.app";
/** Canonical production origin for links in outbound email (never localhost). */
const PRODUCTION_EMAIL_BASE = "https://www.muhr.app";

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
  const fromEnv =
    pickProductionOrigin(process.env.NEXT_PUBLIC_APP_URL) ??
    pickProductionOrigin(process.env.NEXT_PUBLIC_SITE_URL);
  if (fromEnv) return fromEnv;
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
  const fromEnv =
    pickProductionOrigin(process.env.NEXT_PUBLIC_APP_URL) ??
    pickProductionOrigin(process.env.NEXT_PUBLIC_SITE_URL);
  if (fromEnv) return fromEnv;
  if (typeof window !== "undefined") {
    const o = stripTrailingSlash(window.location.origin);
    if (isLocalDevOrigin(o)) return PRODUCTION_PUBLIC_BASE;
    return o;
  }
  return PRODUCTION_PUBLIC_BASE;
}

function pickProductionOrigin(raw: string | undefined): string | null {
  if (!raw?.trim()) return null;
  const clean = stripTrailingSlash(raw.trim());
  if (isLocalDevOrigin(clean)) return null;
  return clean;
}

/**
 * Base URL for links in outbound email. Ignores localhost / 127.* env values so dev
 * sends never leak local URLs to real recipients.
 */
export function getEmailSiteBaseUrl(): string {
  return (
    pickProductionOrigin(process.env.NEXT_PUBLIC_SITE_URL) ??
    pickProductionOrigin(process.env.NEXT_PUBLIC_APP_URL) ??
    PRODUCTION_EMAIL_BASE
  );
}
