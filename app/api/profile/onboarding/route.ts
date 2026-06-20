import { z } from "zod";

import { requireUser } from "@/lib/auth/requireUser";
import { toApiError } from "@/lib/errors/apiError";
import { safeParseJson } from "@/lib/api/parseJson";
import { logger } from "@/lib/logger";
import { createRouteClient } from "@/lib/supabase/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  minLicenseFeeInr: z.number().int().positive().max(100_000_000).optional(),
  platformLicenseSigned: z.boolean().optional(),
});

export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    const supabase = await createRouteClient();

    const body = await safeParseJson(request);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { ok: false, error: { code: "validation_error", message: "Invalid fields" } },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = {};
    if (parsed.data.minLicenseFeeInr !== undefined) {
      updates.min_license_fee_inr = parsed.data.minLicenseFeeInr;
    }
    if (parsed.data.platformLicenseSigned !== undefined) {
      updates.platform_license_signed = parsed.data.platformLicenseSigned;
    }

    if (Object.keys(updates).length === 0) {
      return Response.json(
        { ok: false, error: { code: "no_changes", message: "No valid fields" } },
        { status: 400 }
      );
    }

    const { error } = await supabase.from("profiles").update(updates).eq("id", user.id);
    if (error) {
      logger.error("onboarding_patch_error", { userId: user.id, code: error.code });
      return Response.json(
        { ok: false, error: { code: "db_error", message: "Could not save" } },
        { status: 500 }
      );
    }

    return Response.json({ ok: true });
  } catch (err) {
    const { status, code, message } = toApiError(err);
    return Response.json({ ok: false, error: { code, message } }, { status });
  }
}
