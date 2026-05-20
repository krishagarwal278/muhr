import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { jsonApiError } from "@/lib/api/jsonResponse";
import { RateLimitError } from "@/lib/errors/apiError";
import { logger } from "@/lib/logger";
import { getRateLimitIp, rateLimit } from "@/lib/ratelimit";
import { createAdminClient } from "@/lib/supabase/server";
import type { WaitlistResponse } from "@/types";

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

    return NextResponse.json<WaitlistResponse>({
      success: true,
      message: "Almost there — tell us a bit more about you.",
      needsDetails: true,
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
