import { getRouteHandlerUser } from "@/lib/auth/routeHandlerUser";
import { toApiError } from "@/lib/errors/apiError";
import { getLicenseWorkspaceAccess } from "@/lib/license/workspaceAccess";
import { logger } from "@/lib/logger";
import { createRouteClient } from "@/lib/supabase/route";
import { createServiceRoleClient } from "@/lib/supabase/service";
import type { LicenseRequestRow } from "@/types/license";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function normalizeContractBody(doc: unknown): Record<string, unknown> | null {
  if (!isRecord(doc) || doc.type !== "doc") return null;
  const content = doc.content;
  if (content === undefined || content === null) {
    return { ...doc, content: [] };
  }
  if (!Array.isArray(content)) return null;
  return doc as Record<string, unknown>;
}

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const supabase = await createRouteClient();
    const user = await getRouteHandlerUser(supabase);

    if (!user) {
      return Response.json(
        { ok: false, error: { code: "unauthorized", message: "Unauthorized" } },
        { status: 401 }
      );
    }

    const access = await getLicenseWorkspaceAccess(supabase, user, id);
    if (!access) {
      return Response.json(
        { ok: false, error: { code: "not_found", message: "Not found" } },
        { status: 404 }
      );
    }

    const full = access.row as LicenseRequestRow;
    if (full.contract_effective_at) {
      return Response.json(
        { ok: false, error: { code: "invalid_state", message: "This contract is in force; the draft can no longer be edited." } },
        { status: 400 }
      );
    }

    let body: { action?: string; contract_body?: unknown };
    try {
      body = await request.json();
    } catch {
      return Response.json(
        { ok: false, error: { code: "invalid_json", message: "Invalid JSON" } },
        { status: 400 }
      );
    }

    const editableStatus = full.status === "pending" || full.status === "accepted";
    if (!editableStatus) {
      return Response.json(
        { ok: false, error: { code: "invalid_state", message: "Contract can only be edited while the request is pending or accepted." } },
        { status: 400 }
      );
    }

    if (body.action !== "save") {
      return Response.json(
        { ok: false, error: { code: "invalid_action", message: "Unknown action" } },
        { status: 400 }
      );
    }

    const normalized = normalizeContractBody(body.contract_body);
    if (!normalized) {
      return Response.json(
        { ok: false, error: { code: "invalid_input", message: "Invalid document format. Try refreshing the page." } },
        { status: 400 }
      );
    }

    const patch = {
      contract_body: normalized,
      contract_updated_at: new Date().toISOString(),
    };

    if (access.role === "creator") {
      const { data, error } = await supabase
        .from("license_requests")
        .update(patch)
        .eq("id", id)
        .eq("creator_id", user.id)
        .select("*")
        .maybeSingle();

      if (error) {
        logger.error("workspace_contract_save_creator_error", { requestId: id, userId: user.id, code: error.code });
        return Response.json(
          { ok: false, error: { code: "db_error", message: "We couldn't save your changes right now. Please try again in a moment." } },
          { status: 500 }
        );
      }
      if (!data) {
        logger.error("workspace_contract_save_no_row", { requestId: id, userId: user.id });
        return Response.json(
          { ok: false, error: { code: "db_error", message: "We couldn't save your changes right now. Please try again in a moment." } },
          { status: 500 }
        );
      }
      return Response.json({ ok: true, data: { request: data } });
    }

    const admin = createServiceRoleClient();
    if (!admin) {
      logger.error("workspace_contract_save_no_admin", { requestId: id, userId: user.id });
      return Response.json(
        { ok: false, error: { code: "unavailable", message: "Saving is temporarily unavailable. Please try again shortly." } },
        { status: 503 }
      );
    }
    const brandEmail = user.email?.trim().toLowerCase();
    if (!brandEmail) {
      return Response.json(
        { ok: false, error: { code: "invalid_input", message: "Your brand account must have an email." } },
        { status: 400 }
      );
    }

    const { data, error } = await admin
      .from("license_requests")
      .update(patch)
      .eq("id", id)
      .ilike("brand_email", brandEmail)
      .select("*")
      .maybeSingle();

    if (error) {
      logger.error("workspace_contract_save_brand_error", { requestId: id, userId: user.id, code: error.code });
      return Response.json(
        { ok: false, error: { code: "db_error", message: "We couldn't save your changes right now. Please try again in a moment." } },
        { status: 500 }
      );
    }
    if (!data) {
      logger.error("workspace_contract_save_brand_no_row", { requestId: id, userId: user.id });
      return Response.json(
        { ok: false, error: { code: "db_error", message: "We couldn't save your changes right now. Please try again in a moment." } },
        { status: 500 }
      );
    }
    return Response.json({ ok: true, data: { request: data } });
  } catch (err) {
    const { status, code, message } = toApiError(err);
    return Response.json({ ok: false, error: { code, message } }, { status });
  }
}
