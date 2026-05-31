import { requireUser } from "@/lib/auth/requireUser";
import { toApiError } from "@/lib/errors/apiError";
import { logger } from "@/lib/logger";
import { createRouteClient } from "@/lib/supabase/route";
import { runLegalReview, tiptapToPlainText } from "@/lib/ai/legalReview";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const user = await requireUser();
    const supabase = await createRouteClient();

    // parse body (optional contract_text sent from client - do not persist)
    const BodySchema = z.object({ contract_text: z.string().max(20000).optional() }).strict();
    let body: z.infer<typeof BodySchema> | null = null;
    try {
      const raw = await request.json().catch(() => null);
      body = BodySchema.parse(raw ?? {});
    } catch {
      // invalid body -> reject
      return Response.json({ ok: false, error: { code: "invalid_input", message: "Invalid request body" } }, { status: 400 });
    }

    // load the license request row (only safe fields)
    const { data: row, error: fetchErr } = await supabase
      .from("license_requests")
      .select(
        "id, creator_id, brand_email, brand_name, brand_company, intended_use, duration_days, budget_inr, channels, territories, contract_body"
      )
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

    const contractText = body?.contract_text && body.contract_text.trim().length > 0
      ? body.contract_text.trim()
      : contractBody
        ? tiptapToPlainText(contractBody)
        : null;

    if (!contractText) {
      return Response.json({ ok: false, error: { code: "no_contract", message: "No contract content to review" } }, { status: 400 });
    }

    // Build metadata for the model (only safe fields)
    const metadata = {
      id: row.id,
      brand_name: row.brand_name ?? null,
      brand_company: row.brand_company ?? null,
      intended_use: row.intended_use ?? null,
      duration_days: row.duration_days ?? null,
      budget_inr: row.budget_inr ?? null,
      channels: row.channels ?? null,
      territories: row.territories ?? null,
    };

    // Do not log the contract text. Log only that a review started and the length.
    logger.warn("license_review_started", { requestId: id, userId: user.id, contractLength: contractText.length });

    const review = await runLegalReview(contractText, metadata);

    logger.warn("license_review_completed", { requestId: id, userId: user.id, overallRisk: review.overallRisk });

    return Response.json({ ok: true, review });
  } catch (err) {
    const { status, code, message } = toApiError(err);
    logger.error("license_review_error", { err });
    return Response.json({ ok: false, error: { code, message } }, { status });
  }
}
