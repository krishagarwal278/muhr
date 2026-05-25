import { requireUser } from "@/lib/auth/requireUser";
import { RateLimitError, toApiError } from "@/lib/errors/apiError";
import { logger } from "@/lib/logger";
import { rateLimit } from "@/lib/ratelimit";
import { enforcementCreateBodySchema } from "@/lib/schemas/enforcement";
import { createRouteClient } from "@/lib/supabase/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    const supabase = await createRouteClient();

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
      return Response.json(
        { ok: false, error: { code: "db_error", message: "Failed to fetch cases." } },
        { status: 500 }
      );
    }

    const open = cases?.filter((c) => c.status === "open") || [];
    const inProgress = cases?.filter((c) => c.status === "in_progress") || [];
    const resolved = cases?.filter((c) => c.status === "resolved" || c.status === "rejected") || [];

    return Response.json({
      ok: true,
      data: {
        cases: cases || [],
        open,
        inProgress,
        resolved,
      },
    });
  } catch (err) {
    if (err instanceof RateLimitError) {
      return Response.json(
        { ok: false, error: { code: "rate_limited", message: err.message } },
        { status: 429 }
      );
    }
    const { status, code, message } = toApiError(err);
    return Response.json({ ok: false, error: { code, message } }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const supabase = await createRouteClient();

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
      return Response.json(
        { ok: false, error: { code: "invalid_json", message: "Invalid JSON body." } },
        { status: 400 }
      );
    }

    const parsed = enforcementCreateBodySchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { ok: false, error: { code: "validation_error", message: "Invalid request fields." } },
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
      return Response.json(
        { ok: false, error: { code: "db_error", message: "Failed to create case." } },
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
        }
      } catch (emailError) {
        logger.error("enforcement_notify_error", {
          name: emailError instanceof Error ? emailError.name : "unknown",
        });
      }
    } else if (!notifyTo) {
      logger.warn("enforcement_notify_skipped", { reason: "no_support_email" });
    }

    return Response.json({
      ok: true,
      data: {
        message: "Case created successfully",
        case: newCase,
      },
    });
  } catch (err) {
    if (err instanceof RateLimitError) {
      return Response.json(
        { ok: false, error: { code: "rate_limited", message: err.message } },
        { status: 429 }
      );
    }
    const { status, code, message } = toApiError(err);
    return Response.json({ ok: false, error: { code, message } }, { status });
  }
}
