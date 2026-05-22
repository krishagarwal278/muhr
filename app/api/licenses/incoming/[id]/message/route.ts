import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { resendSendEmail } from "@/lib/email/resendSend";

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
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
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { message?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (message.length < 1 || message.length > 8000) {
    return NextResponse.json({ error: "Message must be 1–8000 characters" }, { status: 400 });
  }

  const { data: row, error } = await supabase
    .from("license_requests")
    .select("id, creator_id, brand_email, brand_name, status")
    .eq("id", id)
    .eq("creator_id", user.id)
    .maybeSingle();

  if (error || !row) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  if (row.status === "withdrawn") {
    return NextResponse.json(
      { error: "This license was withdrawn. Messaging is closed." },
      { status: 400 }
    );
  }

  if (row.status !== "accepted" && row.status !== "declined") {
    return NextResponse.json(
      { error: "You can only message brands on accepted or declined requests" },
      { status: 400 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://muhr.app";
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
    console.error("[brand email send] failed", {
      requestId: row.id,
      brandEmail: row.brand_email,
      message: e instanceof Error ? e.message : String(e),
    });
    return NextResponse.json(
      { error: "We couldn’t send that email right now. Please try again in a moment." },
      { status: 502 }
    );
  }

  return NextResponse.json({ success: true });
}
