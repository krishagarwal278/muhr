import { NextRequest, NextResponse } from "next/server";
import { start } from "workflow/api";
import { z } from "zod";

import { jsonApiError } from "@/lib/api/jsonResponse";
import { RateLimitError } from "@/lib/errors/apiError";
import { sendWaitlistWelcomeEmail } from "@/lib/email/waitlistWelcomeSend";
import { logger } from "@/lib/logger";
import { getRateLimitIp, rateLimit } from "@/lib/ratelimit";
import { createAdminClient } from "@/lib/supabase/server";
import type { WaitlistResponse } from "@/types";
import { waitlistWelcomeWorkflow } from "@/workflows/waitlist-welcome";

const waitlistBodySchema = z.object({
  email: z.string().trim().email().max(255),
  user_type: z.enum(["creator", "business"]),
});

export async function POST(request: NextRequest) {
  try {
    await rateLimit({
      key: "waitlist",
      identifier: getRateLimitIp(request),
      limit: 20,
      window: "1h",
    });

    const json = await request.json();
    const parsed = waitlistBodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json<WaitlistResponse>(
        { success: false, message: "Please enter a valid email address.", code: "invalid_input" },
        { status: 400 }
      );
    }

    const { email, user_type } = parsed.data;
    const supabase = createAdminClient();

    const { error } = await supabase
      .from("waitlist")
      .insert({ email: email.toLowerCase(), user_type });

    if (error) {
      logger.error("waitlist_insert", { errCode: error.code, message: error.message });
      if (error.code === "23505") {
        return NextResponse.json<WaitlistResponse>(
          { success: false, message: "This email is already on the waitlist.", code: "conflict" },
          { status: 409 }
        );
      }
      throw error;
    }

    const normalized = email.toLowerCase();

    if (process.env.NODE_ENV === "development") {
      try {
        await sendWaitlistWelcomeEmail(normalized, user_type);
      } catch (welcomeErr) {
        logger.error("waitlist_welcome_dev_send", {
          message: welcomeErr instanceof Error ? welcomeErr.message : "unknown",
        });
        return NextResponse.json<WaitlistResponse>(
          {
            success: false,
            message:
              "You're on the list, but the welcome email did not send. Add RESEND_API_KEY (and optional RESEND_WELCOME_*) to `.env.local` and check the terminal log.",
            code: "welcome_email_failed",
          },
          { status: 500 }
        );
      }
    } else {
      try {
        await start(waitlistWelcomeWorkflow, [normalized, user_type]);
      } catch (workflowErr) {
        logger.error("waitlist_workflow_start", {
          message: workflowErr instanceof Error ? workflowErr.message : "unknown",
        });
        return NextResponse.json<WaitlistResponse>(
          {
            success: false,
            message:
              "You're on the list, but we could not queue your welcome email right now. Please try again in a few minutes.",
            code: "workflow_unavailable",
          },
          { status: 503 }
        );
      }
    }

    return NextResponse.json<WaitlistResponse>({
      success: true,
      message: "You're on the list. We'll be in touch.",
    });
  } catch (err) {
    if (err instanceof RateLimitError) {
      return jsonApiError(err);
    }
    logger.error("waitlist_error", {
      name: err instanceof Error ? err.name : "unknown",
      message: err instanceof Error ? err.message : "unknown",
    });
    return NextResponse.json<WaitlistResponse>(
      { success: false, message: "Something went wrong. Please try again.", code: "internal_error" },
      { status: 500 }
    );
  }
}
