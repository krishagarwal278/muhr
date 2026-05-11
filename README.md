# Muhr

Private Next.js application (stealth mode).

This repository contains the core app + API routes. Public-facing descriptions are intentionally minimal to avoid misrepresentation and to reduce accidental disclosure while the project is private.

## Development

Install deps and run:

```bash
npm install
npm run dev
```

## Configuration

Copy `.env.example` to `.env.local` and fill in values:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only)
- `NEXT_PUBLIC_APP_URL`
- `PERSONA_API_KEY` (server-only)
- `PERSONA_WEBHOOK_SECRET` (server-only)
- `NEXT_PUBLIC_PERSONA_TEMPLATE_ID`
- `NEXT_PUBLIC_PERSONA_ENVIRONMENT_ID`
- `RESEND_API_KEY` (server-only)
- `RESEND_FROM_EMAIL` — production default in code is `Muhr <communication@muhr.app>` after you verify **muhr.app** in Resend; set explicitly to `Muhr <onboarding@resend.dev>` for local tests if needed
- **Waitlist welcome (Vercel Workflow + Resend):** in **production**, after a successful `/api/waitlist` insert, `waitlistWelcomeWorkflow` runs via the [Workflow DevKit](https://workflow-sdk.dev/) on Vercel (see **Workflows** in your project dashboard). In **`next dev`**, the same welcome email is sent **directly** via Resend (Vercel env vars are not loaded locally, and the workflow runtime is not the same as on Vercel). Put `RESEND_API_KEY` and optional `RESEND_WELCOME_FROM` / `RESEND_WELCOME_REPLY_TO` in **`.env.local`**, not only in the Vercel dashboard. You cannot use `@gmail.com` as the Resend **From** address; use a **muhr.app** address for `From` and put Gmail in **Reply-To** only.
- `SUPPORT_EMAIL`
- `MUHR_FACE_EMBEDDING_URL` (server-only)
- `DEV_AUTH_BYPASS` (local dev only; keep unset elsewhere)

## Notes

- Vault passwords are **never committed** and **never injected into client bundles**. Users provide them locally to encrypt/decrypt vault assets.
- Do not commit secrets, private customer data, or large media/legal docs to this repo.
- Files under `public/` are **gitignored** (logos, social icons, video, etc. stay local). The only committed static icon in-repo is `app/favicon.ico`.
