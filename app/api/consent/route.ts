import { z } from "zod";
import { requireUser } from "@/lib/auth/requireUser";
import { createRouteClient } from "@/lib/supabase/route";
import { parseJsonWithSchema } from "@/lib/api/parseJson";
import { toApiError } from "@/lib/errors/apiError";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_RULES = {
  channels: [],
  territories: [],
  blockedCategories: ["politics"],
  allowVoiceSynthesis: false,
  allowFaceReenactment: false,
  requireApprovalPerUse: true,
  defaultDurationDays: 90,
};

export async function GET() {
  try {
    const user = await requireUser();
    const supabase = await createRouteClient();

    const { data: rules, error } = await supabase
      .from("consent_rules")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error && error.code !== "PGRST116") {
      logger.error("consent_rules_fetch_error", { userId: user.id, code: error.code });
      return Response.json(
        { ok: false, error: { code: "db_error", message: "Failed to load consent rules" } },
        { status: 500 }
      );
    }

    if (!rules) {
      return Response.json({ ok: true, data: DEFAULT_RULES });
    }

    return Response.json({
      ok: true,
      data: {
        channels: rules.channels || [],
        territories: rules.territories || [],
        blockedCategories: rules.blocked_categories || ["politics"],
        allowVoiceSynthesis: rules.allow_voice_synthesis || false,
        allowFaceReenactment: rules.allow_face_reenactment || false,
        requireApprovalPerUse: rules.require_approval_per_use ?? true,
        defaultDurationDays: rules.default_duration_days || 90,
      },
    });
  } catch (err) {
    const { status, code, message } = toApiError(err);
    return Response.json({ ok: false, error: { code, message } }, { status });
  }
}

const ConsentRulesSchema = z.object({
  channels: z.array(z.string()).default([]),
  territories: z.array(z.string()).default([]),
  blockedCategories: z.array(z.string()).default([]),
  allowVoiceSynthesis: z.boolean().default(false),
  allowFaceReenactment: z.boolean().default(false),
  requireApprovalPerUse: z.boolean().default(true),
  defaultDurationDays: z.number().int().min(1).max(365).default(90),
});

export async function PUT(request: Request) {
  try {
    const user = await requireUser();
    const input = await parseJsonWithSchema(request, ConsentRulesSchema);
    const supabase = await createRouteClient();

    const { error } = await supabase
      .from("consent_rules")
      .upsert(
        {
          user_id: user.id,
          channels: input.channels,
          territories: input.territories,
          blocked_categories: input.blockedCategories,
          allow_voice_synthesis: input.allowVoiceSynthesis,
          allow_face_reenactment: input.allowFaceReenactment,
          require_approval_per_use: input.requireApprovalPerUse,
          default_duration_days: input.defaultDurationDays,
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

    return Response.json({ ok: true, message: "Consent rules saved" });
  } catch (err) {
    const { status, code, message } = toApiError(err);
    return Response.json({ ok: false, error: { code, message } }, { status });
  }
}
