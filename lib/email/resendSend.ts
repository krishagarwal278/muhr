/**
 * Send plain-text email via Resend (shared by license messaging + cancellation).
 */
export async function resendSendEmail(to: string, subject: string, text: string): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  const from = process.env.RESEND_FROM_EMAIL ?? "Muhr <onboarding@resend.dev>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, text }),
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
