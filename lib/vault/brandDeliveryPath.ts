import type { VaultAsset } from "@/types";

type DeliveryAssetFields = Pick<
  VaultAsset,
  "asset_type" | "file_path" | "mime_type" | "encryption_key_id" | "original_mime_type"
> & {
  share_file_path?: string | null;
};

/** Storage path brands can open via signed URL (plaintext image/audio/doc only). */
export function brandDeliveryStoragePath(asset: DeliveryAssetFields): string | null {
  if (asset.share_file_path) return asset.share_file_path;
  if (asset.encryption_key_id) return null;
  return asset.file_path ?? null;
}

export function brandDeliveryMimeType(asset: DeliveryAssetFields): string {
  if (asset.asset_type === "character_sheet" && asset.encryption_key_id) {
    return asset.original_mime_type ?? "image/png";
  }
  return asset.mime_type;
}

export function isBrandViewableDeliveredAsset(asset: DeliveryAssetFields): boolean {
  return brandDeliveryStoragePath(asset) !== null;
}

/** Character sheets sealed before plaintext delivery must be regenerated. */
export function isLegacyEncryptedCharacterSheet(asset: VaultAsset): boolean {
  return asset.asset_type === "character_sheet" && !!asset.encryption_key_id && !asset.share_file_path;
}
