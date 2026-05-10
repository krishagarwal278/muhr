# Phase 1 — Repository audit (read-only)

**Repo:** `github.com/krishagarwal278/muhr` (local workspace path may differ).  
**Scope:** Static review + `npm audit`. No patches applied.  
**Convention:** Findings use IDs `AUD-###` for triage approval.

---

## 1. Stack inventory

| Area | Detail |
|------|--------|
| **Languages** | TypeScript, TSX |
| **Runtime** | Node **20** (`.nvmrc`: `20`) |
| **Framework** | **Next.js 16.2.4** (App Router), **React 19.2.4** |
| **Package manager** | **npm** (`package-lock.json` present) |
| **UI / styling** | Tailwind CSS **4**, Radix tooltip, Driver.js, TipTap |
| **Backend / data** | **Supabase** (`@supabase/ssr`, `@supabase/supabase-js`), SQL migrations under `supabase/migrations/` |
| **Auth / integrations** | Supabase Auth; Persona (`persona`); Resend (HTTP from route handlers) |
| **Lint / types** | ESLint **9** + `eslint-config-next` **16.2.4**, TypeScript **5** |
| **Tests** | **No** `test` script, **no** `*.test.*` / `__tests__` harness found in repo |
| **CI** | **No** `.github/workflows/*` present |
| **Containers / IaC** | **No** Dockerfile or K8s/Terraform manifests in repo |
| **Deploy target** | Not specified in-repo (likely external, e.g. Vercel); not verifiable here |

---

## 2. Correctness bugs

| ID | Severity | File:line | Summary |
|----|----------|-----------|---------|
| AUD-010 | **High** | `app/api/licenses/route.ts:116-126` | `POST` parses JSON and returns `success: true` with **no DB insert**; comments indicate unimplemented behavior. Callers can believe a license request was created when it was not (**silent functional bug / data never persisted**). |
| AUD-011 | **Med** | `app/api/licenses/route.ts:116` | `await request.json()` **no try/catch**; malformed JSON can throw and surface as unhandled **500** without controlled error shape. |
| AUD-012 | **Med** | `app/api/consent/route.ts:92` | `PUT` uses `await request.json()` **without try/catch**; invalid JSON can crash the handler. |
| AUD-013 | **Med** | `app/api/consent/route.ts:34-50` | `GET` uses `.single()` but only checks `!rules`; does not branch on `error` from Supabase. Non-“no rows” failures (e.g. transient DB errors) may be **misinterpreted as “defaults”** instead of 5xx. |
| AUD-014 | **Med** | `app/api/licenses/route.ts:42-46` | On `lrError`, handler logs and continues with **empty `rows`**; client receives **200** with empty lists **indistinguishable from “no licenses”** vs fetch failure. |
| AUD-015 | **Low** | `app/api/vault/[assetId]/route.ts:106-110` | On storage delete failure, code **still deletes DB row**, risking **orphaned storage objects** (and misleading “success” if only storage failed silently from UX perspective). |

---

## 3. Security issues (do not patch without approval)

Per your constraints, items below are **reported only**. Any fix touching auth/session/secrets/validation/uploads/etc. needs your written approval before edits.

| ID | Severity | File:line | Category | Summary |
|----|----------|-----------|----------|---------|
| AUD-001 | **Critical** | `middleware.ts:38-41` | AuthZ / session | `DEV_AUTH_BYPASS === "1"` **skips all middleware auth** for protected paths. If set in production, **anyone can access app routes** without a session. |
| AUD-002 | **Critical** | `next.config.ts:11-13` | Secrets / exposure | `DEV_AUTH_BYPASS` is mirrored into **`NEXT_PUBLIC_DEV_AUTH_BYPASS`** → value is **exposed to the browser bundle**, revealing dev-bypass mode and coupling client/server behavior. |
| AUD-003 | **High** | `lib/supabase/server.ts:5-9` | AuthN / privilege | `createAdminClient()` uses `SUPABASE_SERVICE_ROLE_KEY \|\| SUPABASE_ANON_KEY` (fallback). Call sites expecting **service-role bypass** may silently run with **anon key** → **RLS-dependent / wrong privilege level** (`app/api/waitlist/route.ts:24-28` uses this client). |
| AUD-004 | **High** | `app/api/identity/webhook/route.ts:37-49` | Webhook integrity | HMAC verified, but **`t` (timestamp) is not checked for replay/skew**; old signatures could be replayed within an undefined window (depends on Persona guidance). |
| AUD-005 | **High** | `app/api/webhooks/route.ts:8-10` | AuthN / abuse | **TODO**: no signature verification; **any POST** returns `{ received: true }` → open ingestion / abuse (**needs threat model**: public vs internal). |
| AUD-006 | **Med** | `app/api/licenses/contract-public/[token]/route.ts:4-47` | AuthZ / enumeration | Unauthenticated **GET** by `request_token`; relies on token secrecy + rate limiting **not implemented in-app**. |
| AUD-007 | **Med** | Multiple API `route.ts` | Rate limiting | No **per-IP / per-user limits** on auth-adjacent or expensive endpoints (uploads, webhooks, waitlist, license flows). |
| AUD-008 | **Med** | `npm audit` (2026-05-10) | Dependency CVE | **Moderate**: `postcss` &lt; 8.5.10 (XSS via CSS stringify) via **`next`** dependency chain. `npm audit fix --force` suggests **downgrade to next@9** — **not acceptable** without upstream Next fix verification. |
| AUD-009 | **Low** | `app/api/identity/webhook/route.ts:51-61` | Input / typing | `evt: any` + loose navigation of nested attributes; increases risk of **logic mistakes** on malformed payloads (signature still required). |

**Noted as aligned (no new finding):** `app/api/auth/callback/route.ts:14-15,42` uses `safeInternalPath` for `next`; open redirect there is mitigated. SSRF from user-supplied URLs for face embedding is mitigated in the common path by **Supabase signed URL** (`app/api/vault/upload/route.ts:189-195`), though the embedding service still must trust that URL.

---

## 4. Reliability & ops gaps

| ID | Severity | File:line | Summary |
|----|----------|-----------|---------|
| AUD-016 | **Med** | Repo-wide | **No health/readiness** routes or probes defined in-repo. |
| AUD-017 | **Med** | `app/api/enforcement/route.ts:120-142` | Outbound `fetch("https://api.resend.com/...")` has **no explicit timeout/AbortSignal** (risk hang under slow networks). |
| AUD-018 | **Low** | Multiple `route.ts` | **No request IDs** propagated across logs; debugging production incidents is harder. |
| AUD-019 | **Low** | Repo-wide | **No metrics** hooks on critical paths (uploads, webhooks, auth callback). |
| AUD-020 | **Low** | `lib/logger.ts` / various `console.error` | Mixed **structured logger vs raw console**; some logs may still carry richer error objects (operational / hygiene, overlaps zero-leakage discipline). |

---

## 5. Tech debt hotspots

| ID | Severity | File:line | Summary |
|----|----------|-----------|---------|
| AUD-021 | **Low** | `app/api/licenses/route.ts:118-120` | TODOs: create request, notify, consent checks — **dead/incomplete API surface**. |
| AUD-022 | **Low** | `app/api/webhooks/route.ts:8-9` | TODOs for verification and routing. |
| AUD-023 | **Low** | `components/marketing/LicenseRequestPanel.tsx:106` | TODO comment. |
| AUD-024 | **Low** | Many API routes | **Duplicated** `createServerClient` + cookie `setAll` blocks (large copy-paste surface). |
| AUD-025 | **Low** | `app/api/identity/webhook/route.ts:51` | `any` payload typing (see also AUD-009). |

---

## 6. DX & build

| ID | Severity | File:line | Summary |
|----|----------|-----------|---------|
| AUD-026 | **Med** | `README.md:18` | Instructs copying **`.env.example`** → **file not present** in repo (documentation drift). |
| AUD-027 | **Med** | `package.json:5-11` | **No `test` script**; audit rules expect tests for logic fixes — **harness missing**. |
| AUD-028 | **Low** | Repo root | **No CI** to gate lint/build on merge. |
| AUD-029 | **Low** | Prior local runs (not reproduced here) | ESLint **9** + `eslint-config-next` may hit environment-specific issues (e.g. `structuredClone`); verify on target Node version. |

---

## 7. Triage table (sorted: severity → blast radius)

| ID | Severity | Category | File:line | One-line summary | Proposed fix (high level) | Est. effort |
|----|----------|----------|-----------|------------------|---------------------------|-------------|
| AUD-001 | Critical | AuthZ | `middleware.ts:38-41` | Production mis-set `DEV_AUTH_BYPASS` disables auth | **(Security)** Document + enforce non-prod-only; optional runtime guard if `VERCEL_ENV===production` | S |
| AUD-002 | Critical | Secrets / exposure | `next.config.ts:11-13` | Bypass flag leaked via `NEXT_PUBLIC_*` | **(Security)** Remove public env injection; use server-only check in middleware/layout | S |
| AUD-003 | High | Privilege | `lib/supabase/server.ts:5-9` | Admin client may fall back to anon key | **(Security)** Require service role for `createAdminClient`; fail closed if missing | S |
| AUD-004 | High | Webhook | `app/api/identity/webhook/route.ts:37-49` | No replay window on Persona `t` | **(Security)** Enforce max skew + nonce/idempotency per Persona docs | M |
| AUD-005 | High | Webhook | `app/api/webhooks/route.ts:8-10` | Unsigned webhook accepts all POSTs | **(Security)** Verify signatures or restrict network; return 401 by default | M |
| AUD-010 | High | Correctness | `app/api/licenses/route.ts:116-126` | POST fakes success without persisting | Implement insert + tests or return **501** until implemented | M–L |
| AUD-008 | Med | CVE | `package-lock.json` / `next` | Transitive `postcss` moderate CVE | Track Next.js release; upgrade when fixed without major downgrade | S (research) |
| AUD-006 | Med | AuthZ / abuse | `app/api/licenses/contract-public/[token]/route.ts:4-47` | Token-based public GET without app-level throttling | Edge rate limit / WAF / cooldown (infra or code) | M |
| AUD-007 | Med | Abuse | Multiple API routes | No rate limits on sensitive endpoints | Add limits (middleware or per-route) — **security-sensitive** | L |
| AUD-011 | Med | Correctness | `app/api/licenses/route.ts:116` | JSON parse can throw | try/catch → 400 | S |
| AUD-012 | Med | Correctness | `app/api/consent/route.ts:92` | JSON parse can throw | try/catch → 400 | S |
| AUD-013 | Med | Correctness | `app/api/consent/route.ts:34-50` | DB errors conflated with “no row” | Check `error`/`PGRST116` explicitly | S |
| AUD-014 | Med | Correctness | `app/api/licenses/route.ts:42-46` | Fetch errors hidden as empty data | Return 5xx or explicit error field when `lrError` | S |
| AUD-016 | Med | Ops | — | No health checks | Add `/api/health` (readiness) | S |
| AUD-017 | Med | Reliability | `app/api/enforcement/route.ts:120-142` | Resend fetch no timeout | `AbortSignal.timeout` | S |
| AUD-026 | Med | DX | `README.md:18` | Missing `.env.example` | Add template matching README | S |
| AUD-027 | Med | DX | `package.json:5-11` | No test harness | Add **one** framework (e.g. Vitest) + minimal API test | M |
| AUD-015 | Low | Correctness | `app/api/vault/[assetId]/route.ts:106-110` | Storage failure still deletes DB | Transactional pattern or retry cleanup | M |
| AUD-009 | Low | Code quality | `app/api/identity/webhook/route.ts:51` | `any` webhook payload | Typed schema — touches deserialization (**approve if strict**) | M |
| AUD-018–020 | Low | Ops / logging | Various | Request IDs, metrics, mixed logging | Incremental observability hygiene | S–M |
| AUD-021–025 | Low | Tech debt | Various | TODOs, duplication | Incremental cleanup | S–M |
| AUD-028–029 | Low | DX / CI | Repo | No CI; ESLint env quirks | Add workflow; align Node version | S–M |

---

## 8. Phase 1 stop — approvals requested

**Do not proceed to Phase 2 fixes until you:**

1. **Approve** which **AUD-*** rows to implement (and any deferrals).  
2. For **every item in §3 (Security)** you want changed, reply with explicit **`approved`** for that ID after reviewing proposed minimal patch + blast radius (you may ask for per-item write-ups in Phase 2 style before approving).

**Residual note:** This audit does not scan **git history** for leaked secrets; run `git log --all --full-history -- '*.env'` / secret scanners separately if needed.

---

*End of Phase 1.*
