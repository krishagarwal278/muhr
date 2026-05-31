import { requireUser } from "@/lib/auth/requireUser";
import { toApiError } from "@/lib/errors/apiError";
import { logger } from "@/lib/logger";
import { createRouteClient } from "@/lib/supabase/route";
import { runLegalReview, tiptapToPlainText } from "@/lib/ai/legalReview";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const user = await requireUser();
    const supabase = await createRouteClient();

    // load the license request row
    const { data: row, error: fetchErr } = await supabase
      .from("license_requests")
      .select("id, creator_id, brand_email, contract_body")
      .eq("id", id)
      .maybeSingle();

    if (fetchErr) {
      logger.error("license_review_fetch_error", { requestId: id, code: fetchErr.code });
      return Response.json({ ok: false, error: { code: "db_error", message: "Could not load license request" } }, { status: 500 });
    }
    if (!row) return Response.json({ ok: false, error: { code: "not_found", message: "Not found" } }, { status: 404 });

    const userEmail = user.email?.trim().toLowerCase();
    const brandEmail = (row.brand_email ?? "").toString().trim().toLowerCase();

    // access: creator OR brand email matches
    const allowed = user.id === row.creator_id || (userEmail && brandEmail && userEmail === brandEmail);
    if (!allowed) {
      return Response.json({ ok: false, error: { code: "forbidden", message: "Access denied" } }, { status: 403 });
    }

    const contractBody = row.contract_body ?? null;
    if (!contractBody) {
      return Response.json({ ok: false, error: { code: "no_contract", message: "No contract content to review" } }, { status: 400 });
    }

    const plain = tiptapToPlainText(contractBody);

    const review = await runLegalReview(plain);

    return Response.json({ ok: true, review });
  } catch (err) {
    const { status, code, message } = toApiError(err);
    logger.error("license_review_error", { err });
    return Response.json({ ok: false, error: { code, message } }, { status });
  }
}
