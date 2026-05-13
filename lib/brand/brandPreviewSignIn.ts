/**
 * Internal brand workspace preview (no public brand sign-up yet).
 *
 * Set `NEXT_PUBLIC_BRAND_PREVIEW_SIGNIN_EMAIL` to the Supabase Auth user you
 * create manually for designers / PMs. Password stays in your secrets manager
 * or Supabase dashboard — never commit it.
 */
export function getBrandPreviewSignInEmail(): string | undefined {
  const v = process.env.NEXT_PUBLIC_BRAND_PREVIEW_SIGNIN_EMAIL?.trim();
  return v || undefined;
}

export function isBrandAuthDestination(
  next: string | null | undefined,
  intent: string | null | undefined
): boolean {
  if (intent === "brand") return true;
  return Boolean(next?.startsWith("/brand"));
}

/** When set, users who sign in with this email default to `/brand/dashboard` if no `next` was requested. */
export function shouldRouteSignedInUserToBrandPreview(emailFromAuth: string | null | undefined): boolean {
  const preview = getBrandPreviewSignInEmail()?.trim().toLowerCase();
  if (!preview || !emailFromAuth) return false;
  return emailFromAuth.trim().toLowerCase() === preview;
}
