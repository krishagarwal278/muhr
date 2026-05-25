import { requireUser } from "@/lib/auth/requireUser";
import { toApiError } from "@/lib/errors/apiError";
import { resolveLicenseRequestAccess } from "@/lib/license/workspaceAccess";
import { logger } from "@/lib/logger";
import { createRouteClient } from "@/lib/supabase/route";
import type { LicenseRequestRow } from "@/types/license";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const user = await requireUser();
    const supabase = await createRouteClient();

    const { data: row, error } = await supabase
      .from("license_requests")
      .select("*")
      .eq("id", id)
      .eq("creator_id", user.id)
      .maybeSingle();

    if (error) {
      logger.error("license_request_get_error", { requestId: id, code: error.code });
      return Response.json(
        { ok: false, error: { code: "db_error", message: "Fetch failed" } },
        { status: 500 }
      );
    }
    if (!row) {
      return Response.json(
        { ok: false, error: { code: "not_found", message: "Not found" } },
        { status: 404 }
      );
    }

    const role = resolveLicenseRequestAccess(user, row as LicenseRequestRow);
    if (role !== "creator") {
      return Response.json(
        { ok: false, error: { code: "not_found", message: "Not found" } },
        { status: 404 }
      );
    }

    return Response.json({ ok: true, data: { request: row } });
  } catch (err) {
    const { status, code, message } = toApiError(err);
    return Response.json({ ok: false, error: { code, message } }, { status });
  }
}

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const user = await requireUser();
    const supabase = await createRouteClient();

    let body: { action?: string; decline_reason?: string | null };
    try {
      body = await request.json();
    } catch {
      return Response.json(
        { ok: false, error: { code: "invalid_json", message: "Invalid JSON" } },
        { status: 400 }
      );
    }

    if (body.action !== "accept" && body.action !== "decline") {
      return Response.json(
        { ok: false, error: { code: "invalid_input", message: "action must be accept or decline" } },
        { status: 400 }
      );
    }

    const declineReason =
      typeof body.decline_reason === "string" ? body.decline_reason.trim().slice(0, 500) : null;

    if (body.action === "decline" && declineReason === "") {
      return Response.json(
        { ok: false, error: { code: "invalid_input", message: "decline_reason optional but cannot be empty string" } },
        { status: 400 }
      );
    }

    const updates =
      body.action === "accept"
        ? {
            status: "accepted" as const,
            responded_at: new Date().toISOString(),
            decline_reason: null,
          }
        : {
            status: "declined" as const,
            responded_at: new Date().toISOString(),
            decline_reason: declineReason,
          };

    const { data, error } = await supabase
      .from("license_requests")
      .update(updates)
      .eq("id", id)
      .eq("creator_id", user.id)
      .eq("status", "pending")
      .select("id, status")
      .maybeSingle();

    if (error) {
      logger.error("license_request_update_error", { requestId: id, code: error.code });
      return Response.json(
        { ok: false, error: { code: "db_error", message: "Update failed" } },
        { status: 500 }
      );
    }
    if (!data) {
      return Response.json(
        { ok: false, error: { code: "not_found", message: "Request not found or already handled" } },
        { status: 404 }
      );
    }

    return Response.json({ ok: true, data: { id: data.id, status: data.status } });
  } catch (err) {
    const { status, code, message } = toApiError(err);
    return Response.json({ ok: false, error: { code, message } }, { status });
  }
}
