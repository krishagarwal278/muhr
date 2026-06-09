import type { UserType } from "@/types";
import { MUHR_CONTACT_FROM } from "@/lib/app/contactEmail";
import { getEmailSiteBaseUrl } from "@/lib/app/publicSiteUrl";
import { resendSendEmail } from "@/lib/email/resendSend";

/**
 * Waitlist founder welcome (shared by Vercel Workflow step and local `next dev`).
 */
export async function sendWaitlistWelcomeEmail(email: string, userType: UserType): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  const founderName = process.env.MUHR_FOUNDER_NAME?.trim() || "Krish";
  const appUrl = getEmailSiteBaseUrl();
  const audience =
    userType === "business"
      ? "help teams license likeness cleanly, keep a paper trail that holds up, and move faster when something goes wrong"
      : "help creators protect face, voice, and likeness—so you can act quickly when something shows up where it should not";

  const subject = `${founderName} from Muhr — thank you for signing up`;
  const text = `Hi,

I'm ${founderName}. I run Muhr with a tiny team, and I still read every note that comes through the site—so your signup just landed in front of a real person, not a ticket queue.

We're early, and we're building Muhr to ${audience}. If you said you're interested in protection, licensing, or just figuring out what applies to you, we'll reach out as we open more room on our side. No pitch deck attached—just us, trying to get this right.

If anything in your situation is urgent, or you want to point us at a specific platform or use case, hit reply. I read those threads myself.

— ${founderName}
Muhr
${appUrl}
`.trim();

  const welcomeFrom =
    process.env.RESEND_WELCOME_FROM?.trim() || MUHR_CONTACT_FROM;
  const replyTo = process.env.RESEND_WELCOME_REPLY_TO?.trim();

  await resendSendEmail(email, subject, text, {
    from: welcomeFrom,
    ...(replyTo ? { replyTo } : {}),
  });
}
