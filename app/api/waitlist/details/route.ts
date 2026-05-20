import { NextRequest, NextResponse } from "next/server";
import { start } from "workflow/api";
import { z } from "zod";

import { sendWaitlistWelcomeEmail } from "@/lib/email/waitlistWelcomeSend";
import { logger } from "@/lib/logger";
import { getRateLimitIp, rateLimit } from "@/lib/ratelimit";
import { createAdminClient } from "@/lib/supabase/server";
import type { UserType, WaitlistResponse } from "@/types";
import { waitlistWelcomeWorkflow } from "@/workflows/waitlist-welcome";

const detailsSchema = z.object({
  email: z.string().trim().email().max(255),
  instagram_profile: z.string().trim().min(1).max(120),
  profession: z.string().trim().min(1).max(120),
});

export async function PATCH(request: NextRequest) {
  try {
    await rateLimit({
      key: "waitlist_details",
      identifier: getRateLimitIp(request),
      limit: 30,
      window: "1h",
    });

    const json = await request.json();
    const parsed = detailsSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json<WaitlistResponse>(
        { success: false, message: "Please fill in your Instagram and profession.", code: "invalid_input" },
        { status: 400 }
      );
    }

    const { email, instagram_profile, profession } = parsed.data;
    const normalized = email.toLowerCase();
    const supabase = createAdminClient();

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
      throw error;
    }

    if (!row) {
      return NextResponse.json<WaitlistResponse>(
        { success: false, message: "Email not found on the waitlist. Try joining again.", code: "not_found" },
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

    return NextResponse.json<WaitlistResponse>({
      success: true,
      message: "You're on the list. We'll be in touch.",
    });
  } catch (err) {
    logger.error("waitlist_details_error", {
      message: err instanceof Error ? err.message : "unknown",
    });
    return NextResponse.json<WaitlistResponse>(
      { success: false, message: "Something went wrong. Please try again.", code: "internal_error" },
      { status: 500 }
    );
  }
}
