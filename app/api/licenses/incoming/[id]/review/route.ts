import { z } from "zod";
import { requireUser } from "@/lib/auth/requireUser";
import { toApiError } from "@/lib/errors/apiError";
import { logger } from "@/lib/logger";
import { createRouteClient } from "@/lib/supabase/route";
import { createServiceRoleClient } from "@/lib/supabase/service";
import {
  computeFingerprint,
  mapLegalReviewError,
  runLegalReview,
  tiptapToPlainText,
} from "@/lib/ai/legalReview";

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

    // fingerprint for cache
    const fingerprint = computeFingerprint(contractText, metadata as Record<string, unknown>);

    // Try to use service role client for cache & counters if available
    const service = createServiceRoleClient();

    // Check cache
    if (service) {
      try {
        const { data: cached, error: cacheErr } = await service
          .from("ai_review_cache")
          .select("result, expires_at")
          .eq("fingerprint", fingerprint)
          .maybeSingle();
        if (!cacheErr && cached?.expires_at && new Date(cached.expires_at) > new Date()) {
          return Response.json({ ok: true, review: cached.result });
        }
      } catch (e) {
        logger.warn("ai_cache_lookup_failed", { err: e });
      }
    }

    // Enforce per-user daily cap via DB function (atomic)
    const dailyLimit = parseInt(process.env.OPENAI_DAILY_LIMIT ?? '20', 10);
    const estimatedCents = parseInt(process.env.AI_REVIEW_EST_COST_CENTS ?? '50', 10);
    if (service) {
      try {
        const day = new Date().toISOString().slice(0,10);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rpcRes: any = await (service as any).rpc('ai_review_increment', { p_user: user.id, p_inc_count: 1, p_inc_cents: estimatedCents, p_day: day, p_limit: dailyLimit });
        const row0 = Array.isArray(rpcRes) ? rpcRes[0] as { ok?: boolean } : (rpcRes as { ok?: boolean } | undefined);
        if (row0 && row0.ok === false) {
          return Response.json({ ok: false, error: { code: 'over_quota', message: 'Daily review quota exceeded' } }, { status: 429 });
        }
      } catch (e) {
        // If rpc not available or failed, fall back to best-effort (do not block review)
        logger.warn('ai_counter_rpc_failed', { err: e });
      }
    }

    // Run the legal review (server-side LLM call)
    const review = await runLegalReview(contractText, metadata as Record<string, unknown>);

    logger.warn("license_review_completed", { requestId: id, userId: user.id, overallRisk: review.overallRisk });

    // Insert into cache with TTL
    if (service) {
      try {
        const ttlDays = parseInt(process.env.AI_CACHE_TTL_DAYS ?? '7', 10);
        const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000).toISOString();
        await service.from('ai_review_cache').insert([{ fingerprint, result: review, created_at: new Date().toISOString(), expires_at: expiresAt }]);
      } catch (e) {
        logger.warn('ai_cache_insert_failed', { err: e });
      }

      // Optional persistence behind feature flag
      try {
        if (process.env.SAVE_LEGAL_REVIEW_PERSISTENCE === 'true') {
          await service.from('legal_reviews').insert([{ license_request_id: id, user_id: user.id, overall_risk: review.overallRisk, result: review }]);
        }
      } catch (e) {
        logger.warn('ai_persist_failed', { err: e });
      }
    }

    return Response.json({ ok: true, review });
  } catch (err) {
    const api = toApiError(err);
    if (api.code !== "internal_error") {
      return Response.json({ ok: false, error: { code: api.code, message: api.message } }, { status: api.status });
    }
    const mapped = mapLegalReviewError(err);
    logger.error("license_review_error", {
      code: mapped.code,
      message: err instanceof Error ? err.message : String(err),
    });
    return Response.json(
      { ok: false, error: { code: mapped.code, message: mapped.message } },
      { status: mapped.status }
    );
  }
}
