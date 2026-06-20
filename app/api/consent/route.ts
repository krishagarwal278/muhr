import { z } from "zod";
import { OTHER_USAGE_NOTES_MAX_LENGTH } from "@/lib/format/text";
import { normalizeLicenseTerritories } from "@/lib/license/territories";
import { requireUser } from "@/lib/auth/requireUser";
import { createRouteClient } from "@/lib/supabase/route";
import { parseJsonWithSchema } from "@/lib/api/parseJson";
import { toApiError } from "@/lib/errors/apiError";
import {
  DEFAULT_RULES_AND_RATES,
  rowPatchFromRulesAndRates,
  rulesAndRatesFromRow,
  type RulesAndRatesPayload,
} from "@/lib/consent/rulesAndRates";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toApiPayload(payload: RulesAndRatesPayload) {
  return payload;
}

const nullableRate = z
  .union([z.number().int().min(0).max(100_000_000), z.null()])
  .optional()
  .transform((v) => (v === undefined || v === 0 ? null : v));

const ConsentRulesSchema = z.object({
  channels: z.array(z.string()).default([]),
  territories: z
    .array(z.string())
    .default([])
    .transform((values) => normalizeLicenseTerritories(values)),
  blockedCategories: z.array(z.string()).default([]),
  allowVoiceSynthesis: z.boolean().default(false),
  allowFaceReenactment: z.boolean().default(false),
  requireApprovalPerUse: z.boolean().default(true),
  defaultDurationDays: z.number().int().min(1).max(365).default(90),
  faceOnlyRateInr: nullableRate,
  voiceFaceRateInr: nullableRate,
  voiceOnlyRateInr: nullableRate,
  otherRateInr: nullableRate,
  exclusivityUpliftPercent: z.number().int().min(0).max(200).default(40),
  ratePeriodDays: z.number().int().min(1).max(365).default(30),
  allowPaidSocial: z.boolean().default(true),
  allowBroadcast: z.boolean().default(true),
  allowPoliticalContent: z.boolean().default(false),
  allowAlcoholGambling: z.boolean().default(false),
  allowOther: z.boolean().default(true),
  otherUsageNotes: z
    .string()
    .max(OTHER_USAGE_NOTES_MAX_LENGTH)
    .nullable()
    .optional()
    .transform((v) => (v === undefined || v === null ? null : v.trim() || null)),
  requireExclusivityOptIn: z.boolean().default(true),
});

export async function GET() {
  try {
    const user = await requireUser();
    const supabase = await createRouteClient();

    const { data: rules, error } = await supabase
      .from("consent_rules")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      logger.error("consent_rules_fetch_error", { userId: user.id, code: error.code });
      return Response.json(
        { ok: false, error: { code: "db_error", message: "Failed to load consent rules" } },
        { status: 500 }
      );
    }

    const payload = rules ? rulesAndRatesFromRow(rules) : { ...DEFAULT_RULES_AND_RATES };
    return Response.json({ ok: true, data: toApiPayload(payload) });
  } catch (err) {
    const { status, code, message } = toApiError(err);
    return Response.json({ ok: false, error: { code, message } }, { status });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireUser();
    const input = await parseJsonWithSchema(request, ConsentRulesSchema);
    const supabase = await createRouteClient();
    const patch = rowPatchFromRulesAndRates(input as RulesAndRatesPayload);

    const { error } = await supabase.from("consent_rules").upsert(
      {
        user_id: user.id,
        ...patch,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    if (error) {
      logger.error("consent_rules_save_error", { userId: user.id, code: error.code });
      return Response.json(
        { ok: false, error: { code: "db_error", message: "Failed to save consent rules" } },
        { status: 500 }
      );
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ licensing_notes: patch.other_usage_notes })
      .eq("id", user.id);

    if (profileError) {
      logger.warn("consent_rules_profile_notes_sync_error", {
        userId: user.id,
        code: profileError.code,
      });
    }

    return Response.json({ ok: true, message: "Rules and rates saved" });
  } catch (err) {
    const { status, code, message } = toApiError(err);
    return Response.json({ ok: false, error: { code, message } }, { status });
  }
}
