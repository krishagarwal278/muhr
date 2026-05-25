import { z } from "zod";

import { RateLimitError, toApiError } from "@/lib/errors/apiError";
import { logger } from "@/lib/logger";
import { getRateLimitIp, rateLimit } from "@/lib/ratelimit";
import { createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const waitlistBodySchema = z.object({
  email: z.string().trim().email().max(255),
  user_type: z.enum(["creator", "business"]),
});

export async function POST(request: Request) {
  try {
    await rateLimit({
      key: "waitlist",
      identifier: getRateLimitIp(request),
      limit: 20,
      window: "1h",
    });

    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return Response.json(
        { ok: false, error: { code: "invalid_json", message: "Invalid JSON" } },
        { status: 400 }
      );
    }

    const parsed = waitlistBodySchema.safeParse(json);
    if (!parsed.success) {
      return Response.json(
        { ok: false, error: { code: "invalid_input", message: "Please enter a valid email address." } },
        { status: 400 }
      );
    }

    const { email, user_type } = parsed.data;
    const supabase = createAdminClient();

    if (!supabase) {
      logger.error("waitlist_misconfigured", { reason: "missing_service_role_key" });
      return Response.json(
        { ok: false, error: { code: "unavailable", message: "Service temporarily unavailable." } },
        { status: 503 }
      );
    }

    const { error } = await supabase
      .from("waitlist")
      .insert({ email: email.toLowerCase(), user_type });

    if (error) {
      logger.error("waitlist_insert", { errCode: error.code, message: error.message });
      if (error.code === "23505") {
        return Response.json(
          { ok: false, error: { code: "conflict", message: "This email is already on the waitlist." } },
          { status: 409 }
        );
      }
      return Response.json(
        { ok: false, error: { code: "db_error", message: "Failed to add to waitlist" } },
        { status: 500 }
      );
    }

    return Response.json({
      ok: true,
      data: {
        message: "Almost there — tell us a bit more about you.",
        needsDetails: true,
      },
    });
  } catch (err) {
    if (err instanceof RateLimitError) {
      return Response.json(
        { ok: false, error: { code: "rate_limited", message: err.message } },
        { status: 429 }
      );
    }
    const { status, code, message } = toApiError(err);
    return Response.json({ ok: false, error: { code, message } }, { status });
  }
}
