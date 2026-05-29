import { requireUser } from "@/lib/auth/requireUser";
import { getEmailSiteBaseUrl } from "@/lib/app/publicSiteUrl";
import { resendSendEmail } from "@/lib/email/resendSend";
import { toApiError } from "@/lib/errors/apiError";
import { logger } from "@/lib/logger";
import { createRouteClient } from "@/lib/supabase/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const user = await requireUser();
    const supabase = await createRouteClient();

    let body: { message?: string };
    try {
      body = await request.json();
    } catch {
      return Response.json(
        { ok: false, error: { code: "invalid_json", message: "Invalid JSON" } },
        { status: 400 }
      );
    }

    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (message.length < 1 || message.length > 8000) {
      return Response.json(
        { ok: false, error: { code: "invalid_input", message: "Message must be 1–8000 characters" } },
        { status: 400 }
      );
    }

    const { data: row, error } = await supabase
      .from("license_requests")
      .select("id, creator_id, brand_email, brand_name, status")
      .eq("id", id)
      .eq("creator_id", user.id)
      .maybeSingle();

    if (error || !row) {
      return Response.json(
        { ok: false, error: { code: "not_found", message: "Request not found" } },
        { status: 404 }
      );
    }

    if (row.status === "withdrawn") {
      return Response.json(
        { ok: false, error: { code: "invalid_state", message: "This license was withdrawn. Messaging is closed." } },
        { status: 400 }
      );
    }

    if (row.status !== "accepted" && row.status !== "declined") {
      return Response.json(
        { ok: false, error: { code: "invalid_state", message: "You can only message brands on accepted or declined requests" } },
        { status: 400 }
      );
    }

    const appUrl = getEmailSiteBaseUrl();
    const meta = user.user_metadata as Record<string, unknown> | undefined;
    const fullName =
      typeof meta?.full_name === "string" && meta.full_name.trim()
        ? meta.full_name.trim()
        : null;
    const creatorLabel = fullName ?? user.email ?? "A Muhr creator";

    const subject = `Message from ${creatorLabel} (via Muhr)`;

    const text = `Hi ${row.brand_name},

You received this via Muhr (communication@muhr.app). The creator said:

---
${message}
---

This relates to the license request between you and ${creatorLabel} on Muhr. For contract files or signing, coordinate directly with the creator (they may send a Word/PDF export from Muhr).

— Muhr
${appUrl}
`;

    try {
      await resendSendEmail(row.brand_email, subject, text);
    } catch (e) {
      logger.error("brand_email_send_error", { requestId: row.id, error: String(e) });
      return Response.json(
        { ok: false, error: { code: "email_failed", message: "We couldn't send that email right now. Please try again in a moment." } },
        { status: 502 }
      );
    }

    return Response.json({ ok: true });
  } catch (err) {
    const { status, code, message } = toApiError(err);
    return Response.json({ ok: false, error: { code, message } }, { status });
  }
}
