import { getRouteHandlerUser } from "@/lib/auth/routeHandlerUser";
import { toApiError } from "@/lib/errors/apiError";
import { getLicenseWorkspaceAccess } from "@/lib/license/workspaceAccess";
import type { LicensePaymentSummary } from "@/types/payments";
import { createRouteClient } from "@/lib/supabase/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toSummary(row: Record<string, unknown>): LicensePaymentSummary {
  return {
    id: String(row.id),
    licenseRequestId: String(row.license_request_id),
    amountPaise: Number(row.amount_paise),
    currency: String(row.currency ?? "INR"),
    status: row.status as LicensePaymentSummary["status"],
    creatorPayoutStatus: row.creator_payout_status as LicensePaymentSummary["creatorPayoutStatus"],
    rzpPaymentId: row.rzp_payment_id ? String(row.rzp_payment_id) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
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

    const { data, error } = await supabase
      .from("license_payments")
      .select("*")
      .eq("license_request_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return Response.json(
        { ok: false, error: { code: "db_error", message: "Could not load payment." } },
        { status: 500 }
      );
    }

    return Response.json({
      ok: true,
      data: {
        payment: data ? toSummary(data as Record<string, unknown>) : null,
        brandPaymentCleared: Boolean(access.row.brand_payment_cleared_at),
      },
    });
  } catch (err) {
    const { status, code, message } = toApiError(err);
    return Response.json({ ok: false, error: { code, message } }, { status });
  }
}
