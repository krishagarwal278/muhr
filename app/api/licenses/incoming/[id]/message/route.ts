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
  const subject = `Message from a Muhr creator about your license request`;

  const text = `Hi ${row.brand_name},

A creator you contacted on Muhr sent you this message:

---
${message}
---

This relates to your earlier license request (reference on Muhr). If you are waiting on a contract, ask the creator to send their exported agreement (Word/PDF) or their preferred signing process — Muhr no longer uses in-app signing links.

— Muhr
${appUrl}
`;

  try {
    await resendSendEmail(row.brand_email, subject, text);
  } catch (e) {
    console.error("Resend:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not send email" },
      { status: 502 }
    );
  }

  return NextResponse.json({ success: true });
}
