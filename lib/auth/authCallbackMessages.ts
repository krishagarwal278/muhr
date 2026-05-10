/**
 * Fixed user-visible copy for Supabase / OAuth redirect query params (`/login?error=…`).
 *
 * **Do not** return `error_description` or other provider-supplied free text. Match only known
 * `error` / `error_code` literals; unknown combinations fall through to a generic message
 * (zero-secret-leakage / oauth-verification-pass).
 *
 * @param error — Optional `error` query value; exact-match only, never echoed verbatim.
 * @param errorCode — Optional `error_code` query value; exact-match only.
 *
 * `error_description` is intentionally not a parameter so it cannot be forwarded to the UI by mistake.
 */
export function formatAuthCallbackError(error: string | null, errorCode: string | null): string {
  if (errorCode === "otp_expired" || error === "otp_expired") {
    return "That confirmation link expired or was already used. Start sign-in again and use the newest email, or request a new confirmation link.";
  }

  if (error === "access_denied") {
    return "Sign-in was cancelled or denied.";
  }

  if (error === "auth_failed") {
    return "We couldn’t finish signing you in. Try again, or use another sign-in method.";
  }

  if (errorCode === "validation_failed") {
    return "Sign-in could not be completed. Try again.";
  }

  return "Something went wrong during sign-in. Please try again.";
}
