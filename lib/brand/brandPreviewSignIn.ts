/**
 * Internal brand workspace preview (no public brand sign-up yet).
 *
 * Set `NEXT_PUBLIC_BRAND_PREVIEW_SIGNIN_EMAIL` to one or more Supabase Auth
 * emails (comma-separated). Only those accounts may access `/brand/*`.
 * Passwords stay in your secrets manager or Supabase dashboard — never commit them.
 */
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function getBrandWorkspaceAllowlistEmails(): string[] {
  const raw = process.env.NEXT_PUBLIC_BRAND_PREVIEW_SIGNIN_EMAIL?.trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((e) => normalizeEmail(e))
    .filter(Boolean);
}

export function getBrandPreviewSignInEmail(): string | undefined {
  return getBrandWorkspaceAllowlistEmails()[0];
}

export function isBrandWorkspaceConfigured(): boolean {
  return getBrandWorkspaceAllowlistEmails().length > 0;
}

export function isBrandWorkspaceUser(emailFromAuth: string | null | undefined): boolean {
  if (!emailFromAuth) return false;
  const normalized = normalizeEmail(emailFromAuth);
  return getBrandWorkspaceAllowlistEmails().includes(normalized);
}

export function isBrandAuthDestination(
  next: string | null | undefined,
  intent: string | null | undefined
): boolean {
  if (intent === "brand") return true;
  return Boolean(next?.startsWith("/brand"));
}

/** Brand-only accounts default to `/brand/dashboard` when no `next` was requested. */
export function shouldRouteSignedInUserToBrandPreview(emailFromAuth: string | null | undefined): boolean {
  return isBrandWorkspaceUser(emailFromAuth);
}
