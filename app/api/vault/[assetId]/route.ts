import { requireUser } from "@/lib/auth/requireUser";
import { toApiError } from "@/lib/errors/apiError";
import { logger } from "@/lib/logger";
import { createRouteClient } from "@/lib/supabase/route";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { migrateEncryptedFacePhotosToPlainArchive } from "@/lib/vault/facePhotoArchiveMigration";

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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ assetId: string }> }
) {
  try {
    const { assetId } = await params;
    const user = await requireUser();
    const supabase = await createRouteClient();

    let body: { action?: string };
    try {
      body = await request.json();
    } catch {
      return Response.json(
        { ok: false, error: { code: "invalid_input", message: "Invalid JSON body" } },
        { status: 400 }
      );
    }

    const action = body.action;
    if (action !== "archive" && action !== "restore") {
      return Response.json(
        { ok: false, error: { code: "invalid_action", message: "action must be archive or restore" } },
        { status: 400 }
      );
    }

    const { data: fetched, error: fetchErr } = await supabase
      .from("vault_assets")
      .select("*")
      .eq("id", assetId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (fetchErr || !fetched) {
      return Response.json(
        { ok: false, error: { code: "not_found", message: "Not found" } },
        { status: 404 }
      );
    }

    let asset = fetched;

    if (action === "archive") {
      if (asset.asset_type === "character_sheet") {
        return Response.json(
          { ok: false, error: { code: "invalid_type", message: "Character sheets cannot be archived." } },
          { status: 400 }
        );
      }
      if (asset.encryption_key_id && asset.asset_type === "face_photo") {
        const admin = createServiceRoleClient();
        const storageClient = admin ?? supabase;
        const [migrated] = await migrateEncryptedFacePhotosToPlainArchive(
          supabase,
          storageClient,
          user.id,
          [asset],
        );
        asset = migrated;
        if (asset.encryption_key_id) {
          return Response.json(
            {
              ok: false,
              error: {
                code: "encrypted_archive_locked",
                message:
                  "This photo uses old per-photo encryption we cannot unlock. Delete it and upload again from Vault (face photos are no longer encrypted).",
              },
            },
            { status: 400 },
          );
        }
      }
      if (asset.archived_at) {
        const { data: signedUrl } = await supabase.storage
          .from("assets")
          .createSignedUrl(asset.file_path, 3600);
        return Response.json({
          ok: true,
          data: { asset: { ...asset, signed_url: signedUrl?.signedUrl ?? null } },
        });
      }
    }

    if (action === "restore" && !asset.archived_at) {
      return Response.json({ ok: true, data: { asset } });
    }

    const { data: updated, error: updateErr } = await supabase
      .from("vault_assets")
      .update({
        archived_at: action === "archive" ? new Date().toISOString() : null,
      })
      .eq("id", assetId)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (updateErr || !updated) {
      logger.error("vault_patch_error", { userId: user.id, assetId, code: updateErr?.code });
      return Response.json(
        { ok: false, error: { code: "db_error", message: "Failed to update asset" } },
        { status: 500 }
      );
    }

    const { data: signedUrl } = await supabase.storage
      .from("assets")
      .createSignedUrl(updated.file_path, 3600);

    return Response.json({
      ok: true,
      data: { asset: { ...updated, signed_url: signedUrl?.signedUrl ?? null } },
    });
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
