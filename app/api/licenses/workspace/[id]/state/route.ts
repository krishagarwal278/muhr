import type { SupabaseClient } from "@supabase/supabase-js";

import { getRouteHandlerUser } from "@/lib/auth/routeHandlerUser";
import { toApiError } from "@/lib/errors/apiError";
import { canSignContract, getLicenseWorkspaceAccess } from "@/lib/license/workspaceAccess";
import { logger } from "@/lib/logger";
import { isRazorpayConfigured } from "@/lib/razorpay/client";
import { createRouteClient } from "@/lib/supabase/route";
import { createServiceRoleClient } from "@/lib/supabase/service";
import type { LicenseRequestRow } from "@/types/license";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function applyEffectiveIfComplete(admin: SupabaseClient, id: string) {
  const { data: row } = await admin.from("license_requests").select("*").eq("id", id).maybeSingle();
  if (!row) return;
  const r = row as LicenseRequestRow;
  if (
    r.brand_payment_cleared_at &&
    r.creator_signed_contract_at &&
    r.brand_signed_contract_at &&
    !r.contract_effective_at
  ) {
    await admin
      .from("license_requests")
      .update({ contract_effective_at: new Date().toISOString() })
      .eq("id", id);
  }
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

    const admin = createServiceRoleClient();
    if (!admin) {
      return Response.json(
        { ok: false, error: { code: "unavailable", message: "Server misconfigured (service role)" } },
        { status: 503 }
      );
    }

    let body: {
      action?: string;
      agreed_budget_inr?: number;
      signatory_name?: string;
      side?: "creator" | "brand";
    };
    try {
      body = await request.json();
    } catch {
      return Response.json(
        { ok: false, error: { code: "invalid_json", message: "Invalid JSON" } },
        { status: 400 }
      );
    }

    const row = access.row;

    if (body.action === "brand_clear_payment") {
      if (isRazorpayConfigured()) {
        return Response.json(
          {
            ok: false,
            error: {
              code: "use_checkout",
              message: "Complete payment via Razorpay checkout on this page.",
            },
          },
          { status: 400 }
        );
      }
      if (access.role !== "brand") {
        return Response.json(
          { ok: false, error: { code: "forbidden", message: "Only the brand can clear the payment step." } },
          { status: 403 }
        );
      }
      if (row.status !== "accepted") {
        return Response.json(
          { ok: false, error: { code: "invalid_state", message: "Request must be accepted first." } },
          { status: 400 }
        );
      }
      if (row.brand_payment_cleared_at) {
        return Response.json(
          { ok: false, error: { code: "already_completed", message: "Payment step already recorded." } },
          { status: 400 }
        );
      }
      const { error } = await admin
        .from("license_requests")
        .update({ brand_payment_cleared_at: new Date().toISOString() })
        .eq("id", id);
      if (error) {
        logger.error("workspace_state_payment_error", { requestId: id, code: error.code });
        return Response.json(
          { ok: false, error: { code: "db_error", message: "We couldn't record the payment step right now. Please try again in a moment." } },
          { status: 500 }
        );
      }
      await applyEffectiveIfComplete(admin, id);
      const { data: next } = await admin.from("license_requests").select("*").eq("id", id).single();
      return Response.json({ ok: true, data: { request: next } });
    }

    if (body.action === "set_agreed_budget") {
      if (access.role !== "creator") {
        return Response.json(
          { ok: false, error: { code: "forbidden", message: "Only the creator can record the agreed budget." } },
          { status: 403 }
        );
      }
      if (row.status !== "accepted") {
        return Response.json(
          { ok: false, error: { code: "invalid_state", message: "Request must be accepted first." } },
          { status: 400 }
        );
      }
      const n = typeof body.agreed_budget_inr === "number" ? body.agreed_budget_inr : Number(body.agreed_budget_inr);
      if (!Number.isFinite(n) || n < 0 || n > 1_000_000_000) {
        return Response.json(
          { ok: false, error: { code: "invalid_input", message: "Invalid agreed_budget_inr" } },
          { status: 400 }
        );
      }
      const { error } = await admin
        .from("license_requests")
        .update({ agreed_budget_inr: Math.round(n) })
        .eq("id", id)
        .eq("creator_id", user.id);
      if (error) {
        logger.error("workspace_state_budget_error", { requestId: id, code: error.code });
        return Response.json(
          { ok: false, error: { code: "db_error", message: "We couldn't save the agreed budget right now. Please try again in a moment." } },
          { status: 500 }
        );
      }
      const { data: next } = await admin.from("license_requests").select("*").eq("id", id).single();
      return Response.json({ ok: true, data: { request: next } });
    }

    if (body.action === "sign") {
      if (row.status !== "accepted") {
        return Response.json(
          { ok: false, error: { code: "invalid_state", message: "Request must be accepted before signing." } },
          { status: 400 }
        );
      }
      if (!canSignContract(row)) {
        return Response.json(
          { ok: false, error: { code: "invalid_state", message: "Signing is locked until the brand completes the payment step (placeholder)." } },
          { status: 400 }
        );
      }
      const name =
        typeof body.signatory_name === "string" ? body.signatory_name.trim().slice(0, 200) : "";
      if (!name) {
        return Response.json(
          { ok: false, error: { code: "invalid_input", message: "signatory_name is required." } },
          { status: 400 }
        );
      }
      const side = body.side;
      if (side !== "creator" && side !== "brand") {
        return Response.json(
          { ok: false, error: { code: "invalid_input", message: "side must be creator or brand" } },
          { status: 400 }
        );
      }
      if (side === "creator" && access.role !== "creator") {
        return Response.json(
          { ok: false, error: { code: "forbidden", message: "Forbidden" } },
          { status: 403 }
        );
      }
      if (side === "brand" && access.role !== "brand") {
        return Response.json(
          { ok: false, error: { code: "forbidden", message: "Forbidden" } },
          { status: 403 }
        );
      }
      const now = new Date().toISOString();
      if (side === "creator" && row.creator_signed_contract_at) {
        return Response.json(
          { ok: false, error: { code: "already_signed", message: "Creator has already signed." } },
          { status: 400 }
        );
      }
      if (side === "brand" && row.brand_signed_contract_at) {
        return Response.json(
          { ok: false, error: { code: "already_signed", message: "Brand has already signed." } },
          { status: 400 }
        );
      }

      const patch =
        side === "creator"
          ? { creator_signed_contract_at: now, creator_signatory_name: name }
          : { brand_signed_contract_at: now, brand_signatory_name: name };

      const { error } = await admin.from("license_requests").update(patch).eq("id", id);
      if (error) {
        logger.error("workspace_state_sign_error", { requestId: id, side, code: error.code });
        return Response.json(
          { ok: false, error: { code: "db_error", message: "We couldn't record your signature right now. Please try again in a moment." } },
          { status: 500 }
        );
      }
      await applyEffectiveIfComplete(admin, id);
      const { data: next } = await admin.from("license_requests").select("*").eq("id", id).single();
      return Response.json({ ok: true, data: { request: next } });
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
