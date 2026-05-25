import { requireUser } from "@/lib/auth/requireUser";
import { toApiError } from "@/lib/errors/apiError";
import { logger } from "@/lib/logger";
import { createRouteClient } from "@/lib/supabase/route";
import { createServiceRoleClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ assetId: string }> }
) {
  try {
    const { assetId } = await params;
    const user = await requireUser();
    const supabase = await createRouteClient();

    const { data: asset, error } = await supabase
      .from("vault_assets")
      .select("*")
      .eq("id", assetId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error || !asset) {
      return Response.json(
        { ok: false, error: { code: "not_found", message: "Not found" } },
        { status: 404 }
      );
    }

    return Response.json({ ok: true, data: { asset } });
  } catch (err) {
    const { status, code, message } = toApiError(err);
    return Response.json({ ok: false, error: { code, message } }, { status });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ assetId: string }> }
) {
  try {
    const { assetId } = await params;
    const user = await requireUser();
    const supabase = await createRouteClient();

    const { data: asset, error: fetchErr } = await supabase
      .from("vault_assets")
      .select("id,file_path")
      .eq("id", assetId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (fetchErr || !asset) {
      return Response.json(
        { ok: false, error: { code: "not_found", message: "Not found" } },
        { status: 404 }
      );
    }

    const admin = createServiceRoleClient();
    const storageClient = admin ?? supabase;

    const { error: storageErr } = await storageClient.storage.from("assets").remove([asset.file_path]);
    if (storageErr) {
      logger.warn("vault_storage_remove_error", { assetId, error: storageErr.message });
    }

    const { error: delErr } = await supabase
      .from("vault_assets")
      .delete()
      .eq("id", assetId)
      .eq("user_id", user.id);

    if (delErr) {
      logger.error("vault_delete_error", { userId: user.id, assetId, code: delErr.code });
      return Response.json(
        { ok: false, error: { code: "db_error", message: "Failed to delete asset" } },
        { status: 500 }
      );
    }

    return Response.json({ ok: true });
  } catch (err) {
    const { status, code, message } = toApiError(err);
    return Response.json({ ok: false, error: { code, message } }, { status });
  }
}
