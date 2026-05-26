import { requireUser } from "@/lib/auth/requireUser";
import { toApiError } from "@/lib/errors/apiError";
import { logger } from "@/lib/logger";
import { createRouteClient } from "@/lib/supabase/route";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { migrateEncryptedFacePhotosToPlainArchive } from "@/lib/vault/facePhotoArchiveMigration";

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

    const admin = createServiceRoleClient();
    const storageClient = admin ?? supabase;
    const rows = await migrateEncryptedFacePhotosToPlainArchive(
      supabase,
      storageClient,
      user.id,
      assets ?? [],
    );
    const activeRows = rows.filter((a) => !a.archived_at);
    const archivedRows = rows.filter((a) => a.archived_at);

    const signAssets = async (list: typeof rows) =>
      Promise.all(
        list.map(async (asset) => {
          const { data: signedUrl } = await supabase.storage
            .from("assets")
            .createSignedUrl(asset.file_path, 3600);
          return {
            ...asset,
            signed_url: signedUrl?.signedUrl || null,
          };
        })
      );

    const [activeAssets, archivedAssets] = await Promise.all([
      signAssets(activeRows),
      signAssets(archivedRows),
    ]);

    return Response.json({ ok: true, data: { assets: activeAssets, archived: archivedAssets } });
  } catch (err) {
    const { status, code, message } = toApiError(err);
    return Response.json({ ok: false, error: { code, message } }, { status });
  }
}
