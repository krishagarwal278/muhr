import crypto from "crypto";

import { isLegacyEncryptedFacePhoto } from "@/lib/vault/assetFilters";
import { isPlainImageBuffer, mimeFromImageBuffer } from "@/lib/vault/plainImage";
import { logger } from "@/lib/logger";
import type { VaultAsset } from "@/types";
import type { SupabaseClient } from "@supabase/supabase-js";

function isEncryptedFacePhoto(asset: VaultAsset): boolean {
  return asset.asset_type === "face_photo" && !!asset.encryption_key_id;
}

async function uploadPlainArchive(
  storageClient: SupabaseClient,
  userId: string,
  buffer: Buffer,
  mime: string,
): Promise<{ path: string; hash: string }> {
  const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
  const timestamp = Date.now();
  const randomId = crypto.randomBytes(8).toString("hex");
  const path = `${userId}/archive/${timestamp}-${randomId}.${ext}`;
  const hashSha256 = crypto.createHash("sha256").update(buffer).digest("hex");

  const { error } = await storageClient.storage.from("assets").upload(path, buffer, {
    contentType: mime,
    upsert: false,
  });
  if (error) throw error;
  return { path, hash: hashSha256 };
}

/**
 * Face photos in archive are always stored and served unencrypted.
 * Migrates legacy rows that still have encryption metadata (including already-archived).
 */
export async function migrateEncryptedFacePhotosToPlainArchive(
  supabase: SupabaseClient,
  storageClient: SupabaseClient,
  userId: string,
  rows: VaultAsset[],
): Promise<VaultAsset[]> {
  const out = [...rows];

  for (let i = 0; i < out.length; i++) {
    const asset = out[i];
    if (!isEncryptedFacePhoto(asset)) continue;

    const { data: blob, error: downloadErr } = await storageClient.storage
      .from("assets")
      .download(asset.file_path);

    if (downloadErr || !blob) {
      logger.warn("vault_face_archive_migrate_download_failed", { assetId: asset.id });
      continue;
    }

    const downloaded = Buffer.from(await blob.arrayBuffer());
    if (!isPlainImageBuffer(downloaded)) {
      continue;
    }

    const mime = mimeFromImageBuffer(downloaded, asset.original_mime_type ?? asset.mime_type);
    const oldPath = asset.file_path;
    const displayName = (asset.original_file_name ?? asset.file_name).replace(/\.enc$/i, "");
    let filePath = oldPath;
    let hashSha256 = crypto.createHash("sha256").update(downloaded).digest("hex");
    const fileSize = downloaded.length;

    const shouldMoveToArchivePath =
      isLegacyEncryptedFacePhoto(asset) || !oldPath.includes("/archive/");

    if (shouldMoveToArchivePath) {
      try {
        const uploaded = await uploadPlainArchive(storageClient, userId, downloaded, mime);
        filePath = uploaded.path;
        hashSha256 = uploaded.hash;
      } catch {
        logger.warn("vault_face_archive_migrate_upload_failed", { assetId: asset.id });
        continue;
      }
    }

    const { data: updated, error: updateErr } = await supabase
      .from("vault_assets")
      .update({
        file_path: filePath,
        file_name: displayName || asset.file_name,
        file_size: fileSize,
        mime_type: mime,
        hash_sha256: hashSha256,
        archived_at: asset.archived_at ?? new Date().toISOString(),
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
      .eq("id", asset.id)
      .eq("user_id", userId)
      .select("*")
      .single();

    if (updateErr || !updated) {
      if (shouldMoveToArchivePath && filePath !== oldPath) {
        await storageClient.storage.from("assets").remove([filePath]);
      }
      continue;
    }

    if (shouldMoveToArchivePath && oldPath !== filePath) {
      await storageClient.storage.from("assets").remove([oldPath]);
    }

    out[i] = updated as VaultAsset;
  }

  return out;
}
