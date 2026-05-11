/**
 * Target for `resetPasswordForEmail({ redirectTo })`. The recovery email should end with
 * a visit to `/api/auth/callback` so the `code` is exchanged for a cookie session before
 * the user opens `/update-password`.
 *
 * **Supabase dashboard (required or links fall back to Site URL `/` with `?code=` only):**
 * - Authentication → URL Configuration → **Redirect URLs**: add exactly:
 *   `{origin}/api/auth/callback` and `{origin}/api/auth/callback?next=%2Fupdate-password`
 *   (production + localhost). Wildcards like `https://muhr.app/**` also work if your plan supports them.
 * - **Site URL**: your canonical app origin (e.g. `https://muhr.app`).
 *
 * **Inbox / Gmail:** Auth mail is sent by **Supabase** (or your SMTP). For Resend: set Custom SMTP
 * under Authentication. Then add SPF/DKIM/DMARC for the **From** domain (`muhr.app`) in DNS
 * (Resend’s domain wizard). Use a From address on that domain, a clear subject/body in the
 * “Reset password” template, and avoid link-only emails to reduce phishing heuristics.
 */
export function buildPasswordResetRedirectTo(origin: string): string {
  const base = origin.replace(/\/$/, "");
  return `${base}/api/auth/callback?next=${encodeURIComponent("/update-password")}`;
}
