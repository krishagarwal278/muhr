import crypto from "crypto";

import { requireUser } from "@/lib/auth/requireUser";
import { toApiError } from "@/lib/errors/apiError";
import { logger } from "@/lib/logger";
import { createRouteClient } from "@/lib/supabase/route";
import { createServiceRoleClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Decrypt client-side, then post plaintext here to move into archive (unencrypted). */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ assetId: string }> }
) {
  try {
    const { assetId } = await params;
    const user = await requireUser();
    const supabase = await createRouteClient();

    const { data: asset, error: fetchErr } = await supabase
      .from("vault_assets")
      .select("*")
      .eq("id", assetId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (fetchErr || !asset) {
      return Response.json(
        { ok: false, error: { code: "not_found", message: "Not found" } },
        { status: 404 }
      );
    }

    if (asset.asset_type !== "face_photo") {
      return Response.json(
        { ok: false, error: { code: "invalid_type", message: "Only face photos can be archived this way." } },
        { status: 400 }
      );
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return Response.json(
        { ok: false, error: { code: "invalid_input", message: "Invalid form data" } },
        { status: 400 }
      );
    }

    const file = formData.get("file") as File | null;
    if (!file) {
      return Response.json(
        { ok: false, error: { code: "missing_file", message: "No file provided" } },
        { status: 400 }
      );
    }

    const mime = file.type || asset.original_mime_type || "image/jpeg";
    if (!ALLOWED_IMAGE_TYPES.includes(mime)) {
      return Response.json(
        { ok: false, error: { code: "invalid_mime", message: "Use JPEG, PNG, or WebP." } },
        { status: 400 }
      );
    }

    const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
    const timestamp = Date.now();
    const randomId = crypto.randomBytes(8).toString("hex");
    const newPath = `${user.id}/archive/${timestamp}-${randomId}.${ext}`;
    const oldPath = asset.file_path;

    const buffer = Buffer.from(await file.arrayBuffer());
    const hashSha256 = crypto.createHash("sha256").update(buffer).digest("hex");

    const admin = createServiceRoleClient();
    const storageClient = admin ?? supabase;

    const { error: uploadError } = await storageClient.storage.from("assets").upload(newPath, buffer, {
      contentType: mime,
      upsert: false,
    });

    if (uploadError) {
      logger.error("vault_archive_upload_error", { assetId, error: uploadError.message });
      return Response.json(
        { ok: false, error: { code: "upload_failed", message: "Failed to store archived photo" } },
        { status: 500 }
      );
    }

    const displayName = asset.original_file_name ?? asset.file_name;

    const { data: updated, error: updateErr } = await supabase
      .from("vault_assets")
      .update({
        file_path: newPath,
        file_name: displayName.replace(/\.enc$/i, "") || `archived-${timestamp}.${ext}`,
        file_size: file.size,
        mime_type: mime,
        hash_sha256: hashSha256,
        archived_at: new Date().toISOString(),
        encryption_key_id: null,
        encryption_version: null,
        encryption_alg: null,
        encryption_iv: null,
        wrapped_data_key: null,
        wrapped_key_iv: null,
        wrapped_key_salt: null,
        original_file_name: null,
        original_mime_type: null,
      })
      .eq("id", assetId)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (updateErr || !updated) {
      await storageClient.storage.from("assets").remove([newPath]);
      logger.error("vault_archive_update_error", { assetId, code: updateErr?.code });
      return Response.json(
        { ok: false, error: { code: "db_error", message: "Failed to archive asset" } },
        { status: 500 }
      );
    }

    if (oldPath !== newPath) {
      const { error: removeErr } = await storageClient.storage.from("assets").remove([oldPath]);
      if (removeErr) {
        logger.warn("vault_archive_old_storage_remove_error", { assetId, error: removeErr.message });
      }
    }

    const { data: signedUrl } = await supabase.storage.from("assets").createSignedUrl(newPath, 3600);

    return Response.json({
      ok: true,
      data: {
        asset: { ...updated, signed_url: signedUrl?.signedUrl ?? null },
      },
    });
  } catch (err) {
    const { status, code, message } = toApiError(err);
    return Response.json({ ok: false, error: { code, message } }, { status });
  }
}
