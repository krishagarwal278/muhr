import { start } from "workflow/api";
import { z } from "zod";

import { sendWaitlistWelcomeEmail } from "@/lib/email/waitlistWelcomeSend";
import { RateLimitError, toApiError } from "@/lib/errors/apiError";
import { logger } from "@/lib/logger";
import { getRateLimitIp, rateLimit } from "@/lib/ratelimit";
import { createAdminClient } from "@/lib/supabase/server";
import type { UserType } from "@/types";
import { waitlistWelcomeWorkflow } from "@/workflows/waitlist-welcome";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const detailsSchema = z.object({
  email: z.string().trim().email().max(255),
  instagram_profile: z.string().trim().min(1).max(120),
  profession: z.string().trim().min(1).max(120),
});

export async function PATCH(request: Request) {
  try {
    await rateLimit({
      key: "waitlist_details",
      identifier: getRateLimitIp(request),
      limit: 30,
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

    const parsed = detailsSchema.safeParse(json);
    if (!parsed.success) {
      return Response.json(
        { ok: false, error: { code: "invalid_input", message: "Please fill in your Instagram and profession." } },
        { status: 400 }
      );
    }

    const { email, instagram_profile, profession } = parsed.data;
    const normalized = email.toLowerCase();
    const supabase = createAdminClient();

    if (!supabase) {
      logger.error("waitlist_details_misconfigured", { reason: "missing_service_role_key" });
      return Response.json(
        { ok: false, error: { code: "unavailable", message: "Service temporarily unavailable." } },
        { status: 503 }
      );
    }

    const { data: row, error } = await supabase
      .from("waitlist")
      .update({
        instagram_profile: instagram_profile.replace(/^@/, ""),
        profession,
      })
      .eq("email", normalized)
      .select("user_type, instagram_profile")
      .maybeSingle();

    if (error) {
      logger.error("waitlist_details_update", { errCode: error.code, message: error.message });
      return Response.json(
        { ok: false, error: { code: "db_error", message: "Failed to update details" } },
        { status: 500 }
      );
    }

    if (!row) {
      return Response.json(
        { ok: false, error: { code: "not_found", message: "Email not found on the waitlist. Try joining again." } },
        { status: 404 }
      );
    }

    const userType = row.user_type as UserType;

    if (process.env.NODE_ENV === "development") {
      try {
        await sendWaitlistWelcomeEmail(normalized, userType);
      } catch (welcomeErr) {
        logger.error("waitlist_welcome_dev_send", {
          message: welcomeErr instanceof Error ? welcomeErr.message : "unknown",
        });
      }
    } else {
      try {
        await start(waitlistWelcomeWorkflow, [normalized, userType]);
      } catch (workflowErr) {
        logger.error("waitlist_workflow_start", {
          message: workflowErr instanceof Error ? workflowErr.message : "unknown",
        });
      }
    }

    return Response.json({
      ok: true,
      data: { message: "You're on the list. We'll be in touch." },
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
