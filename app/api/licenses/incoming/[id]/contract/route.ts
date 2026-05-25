import { requireUser } from "@/lib/auth/requireUser";
import { toApiError } from "@/lib/errors/apiError";
import { logger } from "@/lib/logger";
import { createRouteClient } from "@/lib/supabase/route";

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

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const user = await requireUser();
    const supabase = await createRouteClient();

    let body: {
      action?: string;
      contract_body?: unknown;
    };
    try {
      body = await request.json();
    } catch {
      return Response.json(
        { ok: false, error: { code: "invalid_json", message: "Invalid JSON" } },
        { status: 400 }
      );
    }

    const { data: row, error: fetchErr } = await supabase
      .from("license_requests")
      .select("id, status")
      .eq("id", id)
      .eq("creator_id", user.id)
      .maybeSingle();

    if (fetchErr) {
      logger.error("license_contract_fetch_error", { requestId: id, code: fetchErr.code });
      return Response.json(
        { ok: false, error: { code: "db_error", message: "We couldn't load this request right now. Please try again in a moment." } },
        { status: 500 }
      );
    }
    if (!row) {
      return Response.json(
        { ok: false, error: { code: "not_found", message: "Not found" } },
        { status: 404 }
      );
    }

    const editableStatus = row.status === "pending" || row.status === "accepted";
    if (!editableStatus) {
      return Response.json(
        { ok: false, error: { code: "invalid_state", message: "Contract can only be edited while the request is pending or accepted." } },
        { status: 400 }
      );
    }

    if (body.action === "save") {
      const normalized = normalizeContractBody(body.contract_body);
      if (!normalized) {
        return Response.json(
          { ok: false, error: { code: "invalid_input", message: "Invalid document format. Try refreshing the page." } },
          { status: 400 }
        );
      }

      const { data, error } = await supabase
        .from("license_requests")
        .update({
          contract_body: normalized,
          contract_updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("creator_id", user.id)
        .select("*")
        .maybeSingle();

      if (error) {
        logger.error("license_contract_save_error", { requestId: id, userId: user.id, code: error.code });
        return Response.json(
          { ok: false, error: { code: "db_error", message: "We couldn't save your changes right now. Please try again in a moment." } },
          { status: 500 }
        );
      }
      if (!data) {
        logger.error("license_contract_save_no_row", { requestId: id, userId: user.id });
        return Response.json(
          { ok: false, error: { code: "db_error", message: "We couldn't save your changes right now. Please try again in a moment." } },
          { status: 500 }
        );
      }
      return Response.json({ ok: true, data: { request: data } });
    }

    return Response.json(
      { ok: false, error: { code: "invalid_action", message: "Unknown action" } },
      { status: 400 }
    );
  } catch (err) {
    const { status, code, message } = toApiError(err);
    return Response.json({ ok: false, error: { code, message } }, { status });
  }
}
