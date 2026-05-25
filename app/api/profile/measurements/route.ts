import { z } from "zod";
import { requireUser } from "@/lib/auth/requireUser";
import { createRouteClient } from "@/lib/supabase/route";
import { parseJsonWithSchema } from "@/lib/api/parseJson";
import { toApiError, ApiHttpError } from "@/lib/errors/apiError";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MeasurementsSchema = z.object({
  height: z.string().trim().min(1).max(40),
  weight: z.string().trim().min(1).max(40),
  chest: z.string().trim().min(1).max(40),
  waist: z.string().trim().min(1).max(40),
  hips: z.string().trim().min(1).max(40),
  shoe_size: z.string().trim().min(1).max(40),
});

export async function GET() {
  try {
    const user = await requireUser();
    const supabase = await createRouteClient();

    const { data, error } = await supabase
      .from("profiles")
      .select("height, weight, chest, waist, hips, shoe_size, min_license_fee_inr, consent_video_completed, platform_license_signed")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      logger.error("measurements_fetch_error", { userId: user.id, code: error.code });
      return Response.json(
        { ok: false, error: { code: "db_error", message: "Failed to load measurements" } },
        { status: 500 }
      );
    }

    return Response.json({
      ok: true,
      data: {
        height: data?.height ?? "",
        weight: data?.weight ?? "",
        chest: data?.chest ?? "",
        waist: data?.waist ?? "",
        hips: data?.hips ?? "",
        shoeSize: data?.shoe_size ?? "",
        minLicenseFeeInr: data?.min_license_fee_inr ?? null,
        consentVideoCompleted: data?.consent_video_completed ?? false,
        platformLicenseSigned: data?.platform_license_signed ?? false,
      },
    });
  } catch (err) {
    const { status, code, message } = toApiError(err);
    return Response.json({ ok: false, error: { code, message } }, { status });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    const input = await parseJsonWithSchema(request, MeasurementsSchema).catch(() => {
      throw new ApiHttpError(400, "validation_error", "Please fill in all measurement fields.");
    });
    const supabase = await createRouteClient();

    const { error } = await supabase
      .from("profiles")
      .update({
        height: input.height,
        weight: input.weight,
        chest: input.chest,
        waist: input.waist,
        hips: input.hips,
        shoe_size: input.shoe_size,
      })
      .eq("id", user.id);

    if (error) {
      logger.error("measurements_save_error", { userId: user.id, code: error.code });
      return Response.json(
        { ok: false, error: { code: "db_error", message: "Could not save measurements" } },
        { status: 500 }
      );
    }

    return Response.json({ ok: true, message: "Measurements saved" });
  } catch (err) {
    const { status, code, message } = toApiError(err);
    return Response.json({ ok: false, error: { code, message } }, { status });
  }
}
