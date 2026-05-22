import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { resendSendEmail } from "@/lib/email/resendSend";
import {
  cancellationReasonLabel,
  isCancellationReasonKey,
  type CancellationReasonKey,
} from "@/lib/license/cancellationReasons";

const SUPPORT = process.env.SUPPORT_EMAIL ?? "support@muhr.app";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignore
          }
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { reason?: string; note?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const reasonRaw = typeof body.reason === "string" ? body.reason.trim() : "";
  const note = typeof body.note === "string" ? body.note.trim() : "";

  if (!isCancellationReasonKey(reasonRaw)) {
    return NextResponse.json({ error: "Invalid cancellation reason" }, { status: 400 });
  }
  const reason = reasonRaw as CancellationReasonKey;
  if (reason === "other" && note.length < 3) {
    return NextResponse.json(
      { error: "When you choose Other, add a short note (at least 3 characters)." },
      { status: 400 }
    );
  }

  const { data: row, error: fetchErr } = await supabase
    .from("license_requests")
    .select(
      "id, creator_id, brand_email, brand_name, brand_company, status, intended_use, created_at, responded_at"
    )
    .eq("id", id)
    .eq("creator_id", user.id)
    .maybeSingle();

  if (fetchErr || !row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (row.status !== "accepted") {
    return NextResponse.json(
      { error: "Only an accepted license can be withdrawn this way." },
      { status: 400 }
    );
  }

  const reasonLine = cancellationReasonLabel(reason);
  const noteBlock = note ? `\nAdditional detail from creator:\n${note}\n` : "";

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  const creatorLabel =
    (profile?.display_name && String(profile.display_name).trim()) ||
    user.email?.split("@")[0] ||
    "Creator";

  const { data: updated, error: updErr } = await supabase
    .from("license_requests")
    .update({
      status: "withdrawn",
      cancelled_at: new Date().toISOString(),
      cancellation_reason: reason,
      cancellation_note: note || null,
    })
    .eq("id", id)
    .eq("creator_id", user.id)
    .eq("status", "accepted")
    .select("*")
    .maybeSingle();

  if (updErr) {
    console.error("[license cancel] update failed", {
      requestId: id,
      userId: user.id,
      code: updErr.code,
      message: updErr.message,
    });
    return NextResponse.json(
      { error: "We couldn’t withdraw this license right now. Please try again in a moment." },
      { status: 500 }
    );
  }
  if (!updated) {
    return NextResponse.json(
      { error: "License was already withdrawn or is no longer accepted." },
      { status: 409 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://muhr.app";
  const assetSummary = String(row.intended_use ?? "Licensed use").slice(0, 200);

  const brandSubject = "License cancelled — immediate notice";
  const brandText = `⚠️ License cancelled — immediate notice

${creatorLabel} has cancelled your Muhr license request with ${row.brand_name} for the following use summary:

"${assetSummary}"

REQUIRED: Cease all use of the creator’s likeness and related materials under this arrangement effective immediately.

Reason selected: ${reasonLine}
${noteBlock}
Our team may follow up within 3–5 business days regarding any open items (e.g. refunds) where applicable.

Questions? ${SUPPORT}

— Muhr
${appUrl}
`;

  const creatorSubject = "License cancelled successfully";
  const creatorText = `Your license with ${row.brand_name} has been cancelled and their access through this Muhr request is withdrawn.

Reason you gave: ${reasonLine}
${note ? `Your note: ${note}\n` : ""}
STATUS: Under review
TIMELINE: Our team may follow up within 3–5 business days if needed.

Questions? ${SUPPORT}

No action is required from you right now.

— Muhr
${appUrl}
`;

  const supportSubject = `[Muhr] License withdrawal — ${row.brand_name} / ${creatorLabel}`;
  const supportText = `New creator withdrawal for review.

Request ID: ${id}
Creator: ${creatorLabel} <${user.email}>
Brand: ${row.brand_name} <${row.brand_email}>
Reason: ${reasonLine}
${note ? `Note: ${note}\n` : ""}
Intended use summary: ${assetSummary}

Review in admin / CRM within 3–5 business days per policy.

— Muhr (automated)
`;

  const emailWarnings: string[] = [];

  try {
    await resendSendEmail(row.brand_email, brandSubject, brandText);
  } catch (e) {
    console.error("cancel email brand:", e);
    emailWarnings.push(
      e instanceof Error ? `Brand email: ${e.message}` : "Brand email failed"
    );
  }

  try {
    await resendSendEmail(user.email, creatorSubject, creatorText);
  } catch (e) {
    console.error("cancel email creator:", e);
    emailWarnings.push(
      e instanceof Error ? `Creator email: ${e.message}` : "Creator email failed"
    );
  }

  try {
    await resendSendEmail(SUPPORT, supportSubject, supportText);
  } catch (e) {
    console.error("cancel email support:", e);
    emailWarnings.push(
      e instanceof Error ? `Support email: ${e.message}` : "Support email failed"
    );
  }

  return NextResponse.json({
    success: true,
    request: updated,
    email_warnings: emailWarnings.length ? emailWarnings : undefined,
  });
}
