import { FatalError } from "workflow";
import type { UserType } from "@/types";
import { sendWaitlistWelcomeEmail } from "@/lib/email/waitlistWelcomeSend";

async function sendFounderWelcomeStep(email: string, userType: UserType) {
  "use step";

  if (!process.env.RESEND_API_KEY) {
    throw new FatalError("RESEND_API_KEY is not configured");
  }

  await sendWaitlistWelcomeEmail(email, userType);
}

/**
 * Durable workflow: enqueue from `/api/waitlist` after a successful insert so Resend
 * retries and observability show up under Vercel Workflows.
 */
export async function waitlistWelcomeWorkflow(email: string, userType: UserType) {
  "use workflow";

  await sendFounderWelcomeStep(email, userType);
  return { ok: true as const };
}
