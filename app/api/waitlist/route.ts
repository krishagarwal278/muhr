import { NextRequest, NextResponse } from "next/server";
import { start } from "workflow/api";
import { sendWaitlistWelcomeEmail } from "@/lib/email/waitlistWelcomeSend";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/server";
import { WaitlistRequest, WaitlistResponse } from "@/types";
import { waitlistWelcomeWorkflow } from "@/workflows/waitlist-welcome";

export async function POST(request: NextRequest) {
  try {
    const body: WaitlistRequest = await request.json();
    const { email, user_type } = body;

    if (!email || !email.includes("@")) {
      return NextResponse.json<WaitlistResponse>(
        { success: false, message: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    if (!user_type || !["creator", "business"].includes(user_type)) {
      return NextResponse.json<WaitlistResponse>(
        { success: false, message: "Invalid user type." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { error } = await supabase
      .from("waitlist")
      .insert({ email: email.toLowerCase().trim(), user_type });

    if (error) {
      logger.error("waitlist_insert", { code: error.code, message: error.message });
      if (error.code === "23505") {
        return NextResponse.json<WaitlistResponse>(
          { success: false, message: "This email is already on the waitlist." },
          { status: 409 }
        );
      }
      throw error;
    }

    const normalized = email.toLowerCase().trim();

    // `next dev` does not load Vercel env vars, and `start()` targets the Vercel Workflow
    // runtime — the welcome step often never runs locally, so Resend sees no API calls.
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
      }
    }

    return NextResponse.json<WaitlistResponse>({
      success: true,
      message: "You're on the list. We'll be in touch.",
    });
  } catch (err) {
    logger.error("waitlist_error", {
      name: err instanceof Error ? err.name : "unknown",
      message: err instanceof Error ? err.message : "unknown",
    });
    return NextResponse.json<WaitlistResponse>(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
