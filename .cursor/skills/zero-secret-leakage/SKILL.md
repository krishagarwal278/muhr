---
name: zero-secret-leakage
description: Prevents secret leakage in logs, errors, client bundles, telemetry, source maps, and git history. Use when adding or reviewing logging, error responses, env handling, Next.js client/server boundaries, auth/OAuth routes, API handlers, observability, production builds, or anything that could expose credentials.
disable-model-invocation: true
---

# Zero secret leakage

Goal: zero secret leakage anywhere observable (logs, errors, client bundles, telemetry, source maps, git history).

## Rules

1. Never log: tokens, cookies, Authorization headers, request bodies of /api/identity, /api/vault, /api/auth*, password fields, OAuth code/state, refresh tokens, secret keys.
2. When logging an object that may contain the above, route it through a redactor that drops or masks known-sensitive keys (case-insensitive): authorization, cookie, set-cookie, password, token, access_token, refresh_token, id_token, client_secret, api_key, secret, private_key, otp, code.
3. Errors thrown to clients use a stable error code + safe message. The full error goes to server logs only.
4. `process.env` values are read at module boot into a typed config object; do not pass `process.env` itself around.
5. Client-side code may not import server-only env vars. Use the `NEXT_PUBLIC_` prefix discipline; verify no secret has this prefix.
6. Source maps for production: do not ship server source maps to clients.

When generating a logging line, output what will appear in the log on a representative input and confirm no secret is present. If unsure, redact.

Forbid: `console.log(req)`, `console.log(err)` without redaction, `JSON.stringify(headers)` raw, dumping `session` or `user` objects wholesale.

## This repo

Prefer **`import { logger } from "@/lib/logger"`** in `app/api/**` route handlers instead of raw `console.*` with rich objects. Route handlers that still use `console.error` should log only stable codes/messages (e.g. Supabase `error.code`), not full error blobs or request bodies.

## Agent workflow

- Before merging or suggesting log/error code, mentally trace every observable surface (stdout, HTTP JSON, browser console, uploaded telemetry, `.next` artifacts, git history).
- Prefer structured logs with explicit allowlisted fields over printing whole objects.
- For stack traces: safe for server logs; never send raw stacks or internal messages to clients.
