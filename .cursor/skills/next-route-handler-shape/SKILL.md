---
name: next-route-handler-shape
description: Enforces the repo’s five-step API route handler shape (authenticate, rate limit, parse, authorize, execute, safe errors) plus Next.js App Router rules for server/client boundaries, middleware, server actions, cookies, and caching. Use when adding or editing app/api route handlers, server actions, middleware, layout boundaries, or reviewing PRs that touch request handling.
disable-model-invocation: true
---

# Next.js route handlers & App Router (repo convention)

## Implemented in this repo today

- **`requireUser`**: `@/lib/auth/requireUser` (Supabase session via `@/lib/supabase/server`); throws `UnauthorizedError`.
- **`logger`**: `@/lib/logger` — structured logs with shallow redaction of sensitive keys (see `zero-secret-leakage`).
- **`toApiError`**: `@/lib/errors/apiError` — maps errors to HTTP-safe `{ status, code, message }` (extend as new error classes are added).
- **`safeInternalPath`**: `@/lib/auth/safeRedirectPath` — required for any auth redirect query param (e.g. `next` on `/api/auth/callback`).
- **Rate limiting (`@/lib/ratelimit`) and resource authz (`@/lib/authz`)** are not wired yet; add them for sensitive or abuse-prone routes before relying on the template alone.

New or heavily touched handlers should migrate toward the shape below. Existing handlers may still inline Supabase auth; converge opportunistically.

---

Every route handler **should** follow the same five-step shape. Generate using this template; deviations require justification in the PR.

```ts
import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/requireUser";
import { authorize } from "@/lib/authz";           // not yet in repo — add when introducing resource checks
import { rateLimit } from "@/lib/ratelimit";       // not yet in repo — add for abuse-prone routes
import { logger } from "@/lib/logger";             // structured, redacted
import { toApiError } from "@/lib/errors/apiError"; // maps to safe codes

const InputSchema = z.object({ /* ... */ });

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const reqId = crypto.randomUUID();
  try {
    const user = await requireUser();
    await rateLimit({ key: `route:${user.id}`, limit: 30, window: "1m" });
    const input = InputSchema.parse(await req.json());
    await authorize(user, "resource:action", input);

    const result = await doTheThing(user, input);

    return Response.json({ ok: true, data: result }, { status: 200 });
  } catch (err) {
    const { status, code, message } = toApiError(err);
    logger.warn("route_error", { reqId, code, route: req.nextUrl.pathname });
    return Response.json({ ok: false, error: { code, message } }, { status });
  }
}
```

Rules:
- Order is fixed: auth → rate limit → parse → authz → execute → respond.
- No `try { ... } catch { return 500 }`. Always go through `toApiError`.
- Never return raw `err.message`. Use codes.
- Add a test that exercises: unauthenticated, unauthorized, invalid input, happy path.

Next.js App Router rules of the road. Verify each before completing the change:

Server vs client
- Default to server components. Add "use client" only when the file actually uses state, effects, browser APIs, or event handlers.
- Server-only modules (db clients, secret reads, server SDKs) are imported only in server files. Add `import "server-only"` to such modules.
- Do not pass non-serializable objects (functions, class instances, dates inside maps) from server to client components.

Route handlers (app/api/**/route.ts)
- Each handler: (1) authenticate, (2) authorize, (3) parse+validate input via zod, (4) execute, (5) return typed response, (6) map errors to safe codes.
- Use `Response.json` with explicit status. Never echo internal errors.
- Set runtime explicitly (`export const runtime = "nodejs"` or `"edge"`). Edge cannot use Node APIs or most DB drivers.
- Cache semantics: declare `dynamic`, `revalidate`, and `fetchCache` deliberately. Do not rely on defaults for auth-sensitive data.

Middleware
- Runs on the Edge runtime. No Node APIs, no heavy crypto, no DB.
- Keep matchers tight; do not run on every request unless required.
- Do not read or rotate sessions in middleware in a way that races with route handlers.

Server actions
- Treat as public endpoints. Authenticate, authorize, validate inputs.
- Do not pass raw form data into ORMs without a schema.

Cookies & headers
- Read with `cookies()` / `headers()` from `next/headers`. These are request-scoped and cannot be called outside a request.
- Setting cookies in route handlers requires writing to the response; in server actions, use the `cookies()` mutator.

When in doubt, choose the boring server-component + route-handler path.
