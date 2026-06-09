/**
 * Where the user opened a public profile from — drives the top-left back link on /k/:handle.
 * Only these literals are allowed (no open redirects).
 */
export type PublicProfileNavFrom = "marketplace" | "brand";

export function parsePublicProfileNavFrom(raw: string | null | undefined): PublicProfileNavFrom | null {
  if (raw === "marketplace" || raw === "brand") return raw;
  return null;
}

export function publicProfileBackNav(from: PublicProfileNavFrom | null): { href: string; label: string } {
  if (from === "marketplace") return { href: "/marketplace", label: "← Marketplace" };
  if (from === "brand") return { href: "/brand/dashboard", label: "← Brand workspace" };
  return { href: "/", label: "← Muhr" };
}

/** Append ?from=… when linking to a public profile from a known surface. */
export function publicProfileHref(handle: string, from: PublicProfileNavFrom): string {
  const h = encodeURIComponent(handle.trim());
  return `/k/${h}?from=${from}`;
}
