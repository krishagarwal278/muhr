import { requireUser } from "@/lib/auth/requireUser";
import { toApiError } from "@/lib/errors/apiError";
import { logger } from "@/lib/logger";
import { createRouteClient } from "@/lib/supabase/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    const supabase = await createRouteClient();

    const { data: assets, error } = await supabase
      .from("vault_assets")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      logger.error("vault_fetch_error", { userId: user.id, code: error.code });
      return Response.json(
        { ok: false, error: { code: "db_error", message: "Failed to fetch assets" } },
        { status: 500 }
      );
    }

    const assetsWithUrls = await Promise.all(
      (assets || []).map(async (asset) => {
        const { data: signedUrl } = await supabase.storage
          .from("assets")
          .createSignedUrl(asset.file_path, 3600);

        return {
          ...asset,
          signed_url: signedUrl?.signedUrl || null,
        };
      })
    );

    return Response.json({ ok: true, data: { assets: assetsWithUrls } });
  } catch (err) {
    const { status, code, message } = toApiError(err);
    return Response.json({ ok: false, error: { code, message } }, { status });
  }
}
