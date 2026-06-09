import { MUHR_CONTACT_FROM } from "@/lib/app/contactEmail";

export type ResendSendOptions = {
  /** Overrides default transactional sender (must be a verified address/domain in Resend). */
  from?: string;
  replyTo?: string | string[];
  html?: string;
};

/**
 * Send email via Resend (shared by license messaging, cancellation, and waitlist welcome).
 */
export async function resendSendEmail(
  to: string,
  subject: string,
  text: string,
  options?: ResendSendOptions
): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  /** Verified sending domain in Resend should be muhr.app; override for local/dev if needed. */
  const from =
    options?.from ?? process.env.RESEND_FROM_EMAIL ?? MUHR_CONTACT_FROM;

  const body: Record<string, unknown> = { from, to, subject, text };
  if (options?.replyTo) {
    body.reply_to = Array.isArray(options.replyTo) ? options.replyTo : [options.replyTo];
  }
  if (options?.html) {
    body.html = options.html;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    let human = t || `Resend error ${res.status}`;
    try {
      const j = JSON.parse(t) as { message?: string };
      if (typeof j.message === "string") human = j.message;
    } catch {
      // keep raw
    }
    throw new Error(human);
  }
}
