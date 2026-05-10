---
name: security-pass-stride
description: Runs a structured security pass using STRIDE threat modeling and checklist verification for AuthN/AuthZ, sessions, OAuth, crypto, input handling, transport headers, errors/logs, and rate limiting. Use when the user asks for a security review, security pass, STRIDE analysis, threat modeling before changes, or verification of security-sensitive code.
disable-model-invocation: true
---

# Security pass (STRIDE)

You are doing a security pass. Before making any change, list every threat in scope using STRIDE (Spoofing, Tampering, Repudiation, Information disclosure, Denial of service, Elevation of privilege) and state which ones the change touches.

For each item below, verify and report PASS/FAIL/NA before editing:

AuthN/AuthZ
- Every protected route checks identity AND authorization (resource ownership), not just identity.
- No IDOR: user-supplied IDs are scoped to the caller's tenant/user.
- Privilege boundaries are explicit; no "admin" inferred from client claims.

Sessions & cookies
- Cookies: httpOnly, secure, sameSite=lax or strict, signed, scoped path, sensible maxAge.
- Session rotates on login, logout, and privilege change.
- Idle and absolute timeouts both enforced.

OAuth
- state and nonce verified; PKCE used for public clients.
- redirect_uri matched against an exact allowlist (no prefix match, no wildcards).
- Tokens stored server-side; never exposed to client JS.

Crypto & secrets
- No homemade crypto. Only vetted primitives (WebCrypto, libsodium, node:crypto).
- No secrets in client bundles, source, env in repo, logs, or error responses.
- Secrets read once at boot, not on hot paths.

Input handling
- Every external input passes a schema (zod/valibot) before reaching business logic.
- No string-built SQL/NoSQL/shell/template; parameterized only.
- Output to HTML/JSON/headers is encoded for the right context.

Transport & headers
- HTTPS-only. HSTS, X-Content-Type-Options, Referrer-Policy, frame-ancestors set.
- CORS: explicit allowlist of origins, no `*` with credentials.

Errors & logs
- Errors returned to clients are generic; details only in server logs.
- Logs never contain tokens, cookies, request bodies of sensitive routes, or PII beyond a stable user ID.

Rate limiting & abuse
- Auth endpoints, password reset, OTP, and any expensive op have per-IP and per-user limits.

If any FAIL is found, STOP and surface it. Do not patch silently. Propose the minimal fix, the blast radius if wrong, and the rollback. Wait for explicit approval before editing security-sensitive code.

## This repo

- **Global response headers** (e.g. `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, production **HSTS**) are set in **`next.config.ts`** via `headers()`.
- **Auth callback** redirect targets are constrained by **`safeInternalPath`** (see `oauth-verification-pass` skill).
- **Logging** for API routes should use **`@/lib/logger`** where practical (`zero-secret-leakage`).
