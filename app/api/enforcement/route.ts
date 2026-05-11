import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { jsonApiError } from "@/lib/api/jsonResponse";
import { RateLimitError } from "@/lib/errors/apiError";
import { logger } from "@/lib/logger";
import { rateLimit } from "@/lib/ratelimit";
import { enforcementCreateBodySchema } from "@/lib/schemas/enforcement";

async function supabaseFromCookies() {
  const cookieStore = await cookies();
  return createServerClient(
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
}

export async function GET() {
  try {
    const supabase = await supabaseFromCookies();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { ok: false, error: { code: "unauthorized", message: "Unauthorized" } },
        { status: 401 }
      );
    }

    await rateLimit({
      key: "enforcement_get",
      identifier: user.id,
      limit: 120,
      window: "1m",
    });

    const { data: cases, error } = await supabase
      .from("enforcement_cases")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      logger.error("enforcement_cases_fetch", { errCode: error.code, message: error.message });
      return NextResponse.json(
        { ok: false, error: { code: "internal_error", message: "Failed to fetch cases." } },
        { status: 500 }
      );
    }

    const open = cases?.filter((c) => c.status === "open") || [];
    const inProgress = cases?.filter((c) => c.status === "in_progress") || [];
    const resolved = cases?.filter((c) => c.status === "resolved" || c.status === "rejected") || [];

    return NextResponse.json({
      cases: cases || [],
      open,
      inProgress,
      resolved,
    });
  } catch (err) {
    if (err instanceof RateLimitError) {
      return jsonApiError(err);
    }
    logger.error("enforcement_get_unexpected", {
      message: err instanceof Error ? err.message : "unknown",
    });
    return NextResponse.json(
      { ok: false, error: { code: "internal_error", message: "Something went wrong." } },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await supabaseFromCookies();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { ok: false, error: { code: "unauthorized", message: "Unauthorized" } },
        { status: 401 }
      );
    }

    await rateLimit({
      key: "enforcement_post",
      identifier: user.id,
      limit: 30,
      window: "1h",
    });

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: { code: "invalid_input", message: "Invalid JSON body." } },
        { status: 400 }
      );
    }

    const parsed = enforcementCreateBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "invalid_input", message: "Invalid request fields." } },
        { status: 400 }
      );
    }

    const { platform, url, description } = parsed.data;

    const { data: newCase, error } = await supabase
      .from("enforcement_cases")
      .insert({
        user_id: user.id,
        platform,
        url,
        description,
        status: "open",
      })
      .select()
      .single();

    if (error) {
      logger.error("enforcement_case_create", { errCode: error.code, message: error.message });
      return NextResponse.json(
        { success: false, error: { code: "internal_error", message: "Failed to create case." } },
        { status: 500 }
      );
    }

    const userName = user.user_metadata?.full_name || user.email?.split("@")[0] || "User";
    const caseId = newCase.id.substring(0, 8).toUpperCase();

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const notifyTo = process.env.SUPPORT_EMAIL ?? process.env.NOTIFICATION_EMAIL;

    if (RESEND_API_KEY && notifyTo) {
      try {
        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Muhr <onboarding@resend.dev>",
            to: [notifyTo],
            subject: `[Muhr] New Enforcement Case #${caseId}`,
            html: `
            <h2>New Enforcement Case Reported</h2>
            <p><strong>Case ID:</strong> ${caseId}</p>
            <p><strong>User:</strong> ${userName} (${user.email})</p>
            <p><strong>Platform:</strong> ${platform}</p>
            <p><strong>URL:</strong> <a href="${url}">${url}</a></p>
            <p><strong>Description:</strong></p>
            <p>${description || "No description provided"}</p>
            <hr>
            <p style="color: #666; font-size: 12px;">This is an automated notification from Muhr.</p>
          `,
          }),
        });

        const emailResult = (await emailResponse.json()) as { id?: string; message?: string };

        if (!emailResponse.ok) {
          logger.error("enforcement_notify_resend", {
            status: emailResponse.status,
            message: emailResult.message ?? "send_failed",
          });
        } else {
          logger.warn("enforcement_notify_sent", { id: emailResult.id });
        }
      } catch (emailError) {
        logger.error("enforcement_notify_error", {
          name: emailError instanceof Error ? emailError.name : "unknown",
        });
      }
    } else if (!notifyTo) {
      logger.warn("enforcement_notify_skipped", { reason: "no_support_email" });
    }

    return NextResponse.json({
      success: true,
      message: "Case created successfully",
      case: newCase,
    });
  } catch (err) {
    if (err instanceof RateLimitError) {
      return jsonApiError(err);
    }
    logger.error("enforcement_post_unexpected", {
      message: err instanceof Error ? err.message : "unknown",
    });
    return NextResponse.json(
      { success: false, error: { code: "internal_error", message: "Something went wrong." } },
      { status: 500 }
    );
  }
}
