# Muhr

**Licensing marketplace for creator likeness** — face, voice, and presence, licensed on your terms.

Muhr lets creators verify once, store encrypted vault assets (photos, voice samples, documents), and review brand briefs in a license inbox. Brands send scoped requests; creators approve every use, negotiate rates, sign contracts, and get paid when approved work goes live. Nothing is generated or delivered without explicit creator consent.

Built as a **Next.js 16** full-stack application on **Supabase** (Postgres, Auth, Storage, RLS), deployed for production on **Vercel**.

---

## Table of contents

- [Product overview](#product-overview)
- [Features](#features)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Development](#development)
- [Testing & quality](#testing--quality)
- [Database & migrations](#database--migrations)
- [API routes](#api-routes)
- [Security & privacy](#security--privacy)
- [Deployment](#deployment)
- [Scripts reference](#scripts-reference)
- [Contributing notes](#contributing-notes)

---

## Product overview

Muhr connects **creators** and **brands** around licensed use of likeness for AI-generated and digital advertising.

| Actor | What they do |
|-------|----------------|
| **Creators** | Complete identity verification, build a verified vault, set rates & rules, review incoming briefs, counter-offer, sign contracts, and receive payouts |
| **Brands** | Browse creator roster, send license briefs, negotiate terms, sign contracts, manage assets, and track active deals |

The platform is designed around **consent-first licensing**: every transaction requires creator approval, signed terms, and auditable delivery records before use goes live.

---

## Features

### Creator workspace (`/dashboard`, `/vault`, `/licenses`, `/profile`)

- **Verified vault** — encrypted storage for face photos, voice samples, documents, and sealed character sheets
- **Client-side encryption** — vault assets encrypted in-browser with AES-256-GCM; vault passwords never leave the user's session or get committed to the repo
- **Identity verification** — KYC flow with manual review support
- **License inbox** — review, accept, decline, or counter-offer incoming brand briefs
- **Rules & rates** — configure minimum fees, territories, channels, and usage constraints
- **Contract signing** — TipTap-powered contract editor with dual-party e-sign flow
- **Active deal tracking** — progress through deal signed → final cut review → payout
- **Public Muhr Pass** — shareable creator profile at `/k/[handle]` with request options for brands
- **Consent management** — documented consent history and enforcement hooks

### Brand workspace (`/brand/*`)

- **Brand dashboard** — overview of roster, licenses, and assets
- **License requests** — send briefs to creators with scope, budget, territory, and duration
- **Workspace messaging** — threaded conversations per license request
- **Counter-offers** — negotiate terms before contract
- **Asset delivery** — receive approved deliverables tied to signed licenses
- **Brand profile & verification** — company details and MCA/document upload for verification
- **Billing** — payment step gating before contract goes live

### Marketing & onboarding

- Landing pages (`/`, `/how-it-works`, `/for-brands`, `/marketplace`)
- Waitlist with durable welcome email workflow (Vercel Workflows + Resend)
- Guided onboarding tour and welcome flow
- Cookie banner, privacy, and terms pages

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Framework | [Next.js 16](https://nextjs.org/) (App Router, React 19, Turbopack) |
| Language | TypeScript 5 (strict mode) |
| Styling | Tailwind CSS 4, Clash Display brand font |
| Database | Supabase Postgres with Row Level Security |
| Auth | Supabase Auth (magic link / OAuth, PKCE callback) |
| Storage | Supabase Storage (encrypted vault blobs, avatars, brand docs) |
| Email | Resend (transactional + waitlist welcome) |
| AI / media | fal.ai (character sheet generation) |
| Validation | Zod |
| Testing | Vitest + Testing Library (happy-dom for components) |
| Workflows | [Vercel Workflow](https://useworkflow.dev/) (durable waitlist emails) |
| CI | GitHub Actions (lint, typecheck, test, build) |
| Hooks | Husky pre-commit (build + full check suite) |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser (React 19)                       │
│  Vault crypto (WebCrypto) · Profile UI · License hub · Brand UI  │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS
┌────────────────────────────▼────────────────────────────────────┐
│                    Next.js App Router                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │ Middleware   │  │ API Routes   │  │ Server Components    │ │
│  │ (auth guard) │  │ (48 routes)  │  │ + client islands     │ │
│  └──────────────┘  └──────────────┘  └──────────────────────┘ │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Vercel Workflows (waitlist welcome email)                │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                         Supabase                                 │
│  Postgres + RLS · Auth · Storage · Realtime-ready schema        │
└─────────────────────────────────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│              External services                                   │
│  Resend (email) · fal.ai (image gen) · Vercel Analytics         │
└─────────────────────────────────────────────────────────────────┘
```

### Key design decisions

- **Vault passwords are user-held secrets** — encryption happens client-side; the server stores ciphertext and metadata only. Server-side decrypt (`lib/vault/cryptoNode.ts`) exists for specific authorized flows when the user provides their password in-session.
- **RLS-first data access** — API routes use Supabase clients scoped to the authenticated user; service role is reserved for admin/ops endpoints.
- **Structured API errors** — consistent error codes via `lib/errors/apiError.ts` and JSON responses through `lib/api/jsonResponse.ts`.
- **Rate limiting** — in-memory sliding window per route (sufficient for single-instance dev; use Redis/Upstash for multi-instance production).
- **Security headers** — HSTS, `X-Frame-Options`, `Permissions-Policy` (microphone allowed for voice recording), configured in `next.config.ts`.

---

## Project structure

```
muhr/
├── app/
│   ├── (app)/              # Authenticated creator shell (sidebar nav)
│   │   ├── dashboard/      # Creator home, earnings estimate, incoming briefs
│   │   ├── vault/          # Encrypted asset vault (photos, voice, docs)
│   │   ├── licenses/       # License hub (inbox, active, history, rates)
│   │   ├── profile/        # Creator profile & Muhr Pass settings
│   │   ├── consent/        # Consent rules & history
│   │   └── onboarding/     # First-run setup
│   ├── (landing)/          # Public marketing pages
│   ├── brand/              # Brand workspace (separate nav)
│   ├── api/                # Route handlers (REST-style JSON API)
│   ├── login/ signup/      # Auth entry points
│   └── license-sign/       # Public contract signing by token
├── components/             # React components (ui/, vault/, license/, profile/)
├── lib/                    # Business logic, crypto, auth, email, pricing
│   ├── supabase/           # Client, server, and route Supabase helpers
│   ├── vault/              # Encryption, upload, asset filters
│   ├── license/            # Hub logic, contracts, territories, dates
│   ├── brand/              # Brand profile, roster, preview access
│   ├── auth/               # Middleware session, requireUser, callbacks
│   └── email/              # Resend send helpers
├── supabase/
│   └── migrations/         # 32+ SQL migrations (schema + RLS + storage)
├── workflows/              # Vercel Workflow definitions
├── scripts/                # Dev helpers, audits, native binding install
├── styles/                 # Global CSS, brand font (Clash Display)
├── types/                  # Shared TypeScript types
└── public/                 # Static assets (mostly gitignored — see below)
```

---

## Getting started

### Prerequisites

- **Node.js** ≥ 20.9.0
- **npm** (ships with Node)
- A **Supabase** project (URL, anon key, service role key)
- Optional: **Resend** account, **fal.ai** key for character sheet generation

### Install & run

```bash
git clone https://github.com/krishagarwal278/muhr.git
cd muhr
npm install
cp .env.example .env.local
# Fill in .env.local (see Environment variables below)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### First-time Supabase setup

1. Create a Supabase project at [supabase.com](https://supabase.com).
2. Run migrations in order from `supabase/migrations/` (via Supabase CLI or SQL editor).
3. Configure **Auth redirect URLs** to include:
   - `http://localhost:3000/api/auth/callback`
   - Your production URL + `/api/auth/callback`
4. Create storage buckets and policies as defined in migrations (`016`, `033`, etc.).

---

## Environment variables

Copy `.env.example` → `.env.local`. Never commit `.env.local`.

### Required

| Variable | Scope | Description |
|----------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Supabase anon key (RLS-protected) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server only** | Service role for admin/ops routes — never expose to client |
| `NEXT_PUBLIC_SITE_URL` | Public | Canonical site URL (`http://localhost:3000` in dev) |

### Email (Resend)

| Variable | Scope | Description |
|----------|-------|-------------|
| `RESEND_API_KEY` | **Server only** | Resend API key |
| `RESEND_FROM_EMAIL` | Server | Verified sender, e.g. `Muhr <contact@muhr.app>` |
| `SUPPORT_EMAIL` | Server | Support contact shown to users |

### AI / media

| Variable | Scope | Description |
|----------|-------|-------------|
| `FAL_KEY` | **Server only** | fal.ai key for character sheet generation |

### Brand preview (optional)

| Variable | Scope | Description |
|----------|-------|-------------|
| `BRAND_PREVIEW_EMAILS` | Server | Comma-separated emails allowed into `/brand/*` workspace during preview |

### Internal ops (optional)

| Variable | Scope | Description |
|----------|-------|-------------|
| `ADMIN_AUDIT_SECRET` | **Server only** | Protects `GET /api/internal/character-photos/audit` |

### Development only

| Variable | Scope | Description |
|----------|-------|-------------|
| `DEV_AUTH_BYPASS` | Dev | Auth bypass flag — **never set in production** (stripped by `next.config.ts`) |

---

## Development

### Commands

```bash
npm run dev          # Start dev server (Turbopack)
npm run build        # Production build
npm run start        # Serve production build
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit (app + tests)
npm run test:typecheck  # tsc -p tsconfig.test.json
npm run test         # Vitest unit tests
npm run check        # lint + typecheck + test:typecheck + test (full gate)
```

### Pre-commit hook

Husky runs `next build` and the full check suite on every commit:

```bash
# .husky/pre-commit
next build && scripts/check.sh   # eslint + tsc + vitest
```

### Auth in development

- Magic link / OAuth flows redirect through `/api/auth/callback`.
- Middleware protects `/dashboard`, `/vault`, `/licenses`, `/profile`, `/brand`, etc.
- Brand routes require `BRAND_PREVIEW_EMAILS` to be configured, or users see a configuration error at login.

### Static assets

Files under `public/` (logos, social icons, demo media) are **gitignored** and stay local. The only committed static icon is `app/favicon.ico`. Add your own assets locally after clone.

---

## Testing & quality

### Test layout

| Project | Environment | Includes |
|---------|-------------|----------|
| `node` | Node | `lib/**/*.test.ts`, `app/api/**/*.test.ts` |
| `dom` | happy-dom | `components/**/*.test.tsx`, `app/**/*.test.tsx` |

**41 test files** covering API routes, vault crypto paths, auth middleware, license logic, profile validation, and UI components.

```bash
# Run all tests
npm run test

# Run a single file
npx vitest run app/api/brand/profile/documents/route.test.ts

# Watch mode
npx vitest
```

### CI (GitHub Actions)

On every push/PR to `main`:

1. **Lint, Typecheck & Test** — `npm run lint`, `npm run typecheck`, `npm run test`
2. **Build** — `npm run build` with placeholder Supabase env vars

### Health check

```
GET /api/health
```

Returns JSON with env validation status — use for uptime monitoring.

---

## Database & migrations

Schema lives in `supabase/migrations/` (32 migrations). Major domains:

| Migration area | Examples |
|----------------|----------|
| Vault | `001_vault_assets`, `008_vault_encryption`, `025_vault_archive` |
| Profiles & KYC | `003_profiles_kyc`, `019_character_photo_slots`, `028_profile_avatar` |
| Licensing | `004_public_profile_and_license_requests`, `005_license_contract`, `021_license_counter_offers`, `029_license_deliveries` |
| Brand | `032_brand_profiles`, `033_brand_verification_pdf_storage` |
| Consent | `002_consent_and_enforcement` |
| Waitlist | `014_waitlist_onboarding_profile` |

All tables use **Row Level Security**. Policies scope reads/writes to the authenticated creator, linked brand user, or service role as appropriate.

```bash
# Print a specific migration (helper script)
npm run db:print-license-contract-sql

# Audit character photo integrity (requires env + DB)
npm run db:audit-character-photos
```

---

## API routes

48 route handlers under `app/api/`. Grouped by domain:

| Prefix | Purpose |
|--------|---------|
| `/api/auth/callback` | Supabase OAuth / magic link PKCE exchange |
| `/api/profile/*` | Creator profile, avatar, measurements, character photos, onboarding |
| `/api/vault/*` | Upload, list, preview, archive, brand-share delivery |
| `/api/licenses/*` | Requests, workspace, contracts, counter-offers, deliveries, messages |
| `/api/brand/*` | Brand profile, verification documents, asset roster |
| `/api/consent` | Consent rules CRUD |
| `/api/identity/*` | Identity verification submit/status |
| `/api/character-sheet/*` | AI character sheet generate + seal |
| `/api/waitlist` | Waitlist signup + details |
| `/api/public-profile/[handle]/*` | Public creator request options |
| `/api/health` | Health check |
| `/api/webhooks` | External webhook receiver |
| `/api/internal/*` | Admin audit endpoints (secret-protected) |

All routes use structured JSON responses. Sensitive routes apply rate limiting and Zod input validation.

---

## Security & privacy

### Vault encryption

- **Algorithm:** AES-256-GCM with PBKDF2-wrapped data keys (310,000 iterations, SHA-256)
- **Client-side:** `lib/vault/crypto.ts` (browser WebCrypto)
- **Server-side decrypt:** `lib/vault/cryptoNode.ts` (only when user supplies password in authorized session)
- Vault passwords are **never committed**, **never logged**, and **never injected into client bundles**

### Data handling

- Do not commit secrets, private customer data, or large media/legal documents
- RLS enforces per-user data isolation at the database layer
- Auth callback validates query params with Zod; unknown keys are ignored
- Middleware redirects unauthenticated users; brand/creator workspaces are separated by email allowlist

### HTTP security

Production responses include:

- `Strict-Transport-Security` (HSTS preload)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(self), geolocation=()`

---

## Deployment

Designed for **Vercel** with Supabase as the backend.

1. Connect the GitHub repo to Vercel
2. Set all required environment variables in the Vercel project settings
3. Ensure Supabase Auth redirect URLs include your production domain
4. Run pending migrations against the production Supabase project before deploy
5. Verify `/api/health` returns `200` after deploy

Vercel Workflows (`workflows/waitlist-welcome.ts`) require the `workflow` package integration enabled via `withWorkflow()` in `next.config.ts`.

---

## Scripts reference

| Script | Description |
|--------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Serve build |
| `npm run lint` | ESLint across repo |
| `npm run typecheck` | TypeScript check (main project) |
| `npm run test:typecheck` | TypeScript check (test project) |
| `npm run test` | Vitest |
| `npm run check` | Full quality gate |
| `npm run db:print-license-contract-sql` | Print license contract migration SQL |
| `npm run db:audit-character-photos` | Run character photo integrity audit |

---

## Contributing notes

This repository is currently **private** (stealth). When contributing:

1. Never commit `.env.local`, vault passwords, or customer PII
2. Run `npm run check` before pushing
3. Add tests for new API routes and non-trivial `lib/` logic
4. Follow existing patterns: Zod validation at route boundaries, `server-only` for sensitive modules, RLS for new tables
5. New migrations go in `supabase/migrations/` with sequential numbering

For AI-assisted development, see `AGENTS.md` for Next.js-specific conventions used in this repo.

---

## License

Private — all rights reserved. This codebase is not licensed for public use or redistribution.
