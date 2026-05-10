---
name: oauth-verification-pass
description: Runs an OAuth/OIDC verification checklist for state, nonce, PKCE, redirect_uri allowlists, untrusted callback params, id_token and JWKS validation, session rotation after login, schema-safe parsing, and generic user-facing errors. Use when implementing or reviewing OAuth login flows, callback routes, token exchange, or provider error handling.
disable-model-invocation: true
---

# OAuth verification pass

OAuth bugs are silent and severe. Verify every item:

1. `state` is generated server-side, signed/HMAC'd or stored in a short-lived signed cookie, and verified on callback. A missing or mismatched state aborts the flow with a generic error.
2. `nonce` is included in the auth request and verified against the id_token claim.
3. PKCE (code_verifier/code_challenge) is used. Verifier is server-side only.
4. `redirect_uri` is exact-matched against an allowlist constant. No regex, no prefix, no startsWith.
5. The callback handler treats every query param as untrusted input and parses with zod before use.
6. id_token verification: validate `iss`, `aud`, `exp`, `iat`, signature against the provider's JWKS. Cache JWKS with a sane TTL; do not refetch per request.
7. After successful auth, rotate the session cookie (new ID), then redirect. Do not reuse the pre-auth session.
8. Never read OAuth response fields with non-null assertions or `.data!`. Every access goes through a parsed schema; missing fields are an explicit error path.
9. Errors from the provider (`?error=...`) are surfaced to the user as a generic message; the provider's error string is logged, not displayed.

If the change touches the callback, generate a test for: missing state, mismatched state, replayed code, expired id_token, unknown redirect_uri, provider-returned error.

## This repo (Supabase Auth)

- **OAuth PKCE / state** are handled by Supabase’s hosted `/auth/v1/authorize` flow; the app exchanges `code` in `app/api/auth/callback/route.ts` via `exchangeCodeForSession`.
- **`next` query param** on that callback must stay on the safe path: use **`safeInternalPath`** from `@/lib/auth/safeRedirectPath` (open-redirect prevention).
- **User-visible provider errors**: `/login` uses **`formatAuthCallbackError`** in `@/lib/auth/authCallbackMessages` — must stay **generic**; do not display raw `error_description` from the IdP (log server-side only when adding logging).
