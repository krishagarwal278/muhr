import type { SupabaseClient } from "@supabase/supabase-js";

type ShareAssetRow = {
  id: string;
  user_id: string;
  file_path: string;
  encryption_key_id?: string | null;
  share_file_path?: string | null;
};

function extensionFromPath(filePath: string): string {
  const part = filePath.split(".").pop();
  return part && part.length <= 8 ? part : "bin";
}

export function brandShareStoragePath(
  userId: string,
  assetId: string,
  licenseRequestId: string,
  ext: string
): string {
  return `${userId}/brand_delivery/${licenseRequestId}/${assetId}.${ext}`;
}

/** Copy a plaintext vault file to a dedicated brand-delivery path. */
export async function ensureBrandShareCopy(
  storageClient: SupabaseClient,
  dbClient: SupabaseClient,
  asset: ShareAssetRow,
  licenseRequestId: string
): Promise<string | null> {
  if (asset.share_file_path) return asset.share_file_path;
  if (asset.encryption_key_id) return null;

  const ext = extensionFromPath(asset.file_path);
  const dest = brandShareStoragePath(asset.user_id, asset.id, licenseRequestId, ext);

  const { error: copyErr } = await storageClient.storage.from("assets").copy(asset.file_path, dest);

  if (copyErr) {
    return asset.file_path;
  }

  await dbClient.from("vault_assets").update({ share_file_path: dest }).eq("id", asset.id);

  return dest;
}

/** Store a creator-uploaded plaintext share copy for brand delivery. */
export async function saveBrandShareUpload(
  storageClient: SupabaseClient,
  dbClient: SupabaseClient,
  asset: ShareAssetRow,
  licenseRequestId: string,
  file: Blob,
  mimeType: string
): Promise<string> {
  const ext =
    mimeType.includes("png") ? "png" : mimeType.includes("jpeg") || mimeType.includes("jpg") ? "jpg" : "bin";
  const dest = brandShareStoragePath(asset.user_id, asset.id, licenseRequestId, ext);

  if (asset.share_file_path && asset.share_file_path !== dest) {
    await storageClient.storage.from("assets").remove([asset.share_file_path]);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadErr } = await storageClient.storage.from("assets").upload(dest, buffer, {
    contentType: mimeType,
    upsert: true,
  });

  if (uploadErr) {
    throw new Error(uploadErr.message);
  }

  await dbClient.from("vault_assets").update({ share_file_path: dest }).eq("id", asset.id);

  return dest;
}

/** Ensure brand-viewable copies exist for every delivery of a vault asset. */
export async function prepareBrandSharesForVaultAsset(
  storageClient: SupabaseClient,
  dbClient: SupabaseClient,
  vaultAssetId: string
): Promise<void> {
  const { data: asset } = await dbClient
    .from("vault_assets")
    .select("id, user_id, file_path, encryption_key_id, share_file_path")
    .eq("id", vaultAssetId)
    .maybeSingle();

  if (!asset || asset.encryption_key_id) return;

  const { data: deliveries } = await dbClient
    .from("license_deliveries")
    .select("license_request_id")
    .eq("vault_asset_id", vaultAssetId);

  for (const delivery of deliveries ?? []) {
    await ensureBrandShareCopy(storageClient, dbClient, asset, delivery.license_request_id);
  }
}
