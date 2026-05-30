import type { VaultAsset } from "@/types";

export function isActiveVaultAsset(asset: VaultAsset): boolean {
  return !asset.archived_at;
}

export function isArchivedVaultAsset(asset: VaultAsset): boolean {
  return !!asset.archived_at;
}

/** Legacy encrypted face uploads still in the vault table but hidden from the gallery. */
export function isLegacyEncryptedFacePhoto(asset: VaultAsset): boolean {
  return (
    isActiveVaultAsset(asset) &&
    asset.asset_type === "face_photo" &&
    !!asset.encryption_key_id
  );
}

/** Plain face photos shown in the vault gallery (not password-wrapped uploads). */
export function isVaultGalleryFacePhoto(asset: VaultAsset): boolean {
  return (
    isActiveVaultAsset(asset) &&
    asset.asset_type === "face_photo" &&
    !asset.encryption_key_id
  );
}

/** Assets a creator can share with a brand via signed links. */
export function isDeliverableVaultAsset(asset: VaultAsset): boolean {
  if (!isActiveVaultAsset(asset)) return false;
  if (asset.asset_type === "character_sheet") {
    return !asset.encryption_key_id || !!asset.share_file_path;
  }
  if (asset.asset_type === "face_photo") return !asset.encryption_key_id;
  if (asset.asset_type === "voice_sample" || asset.asset_type === "document") return true;
  return false;
}

export function filterVaultGalleryAssets<T extends VaultAsset>(assets: T[]): T[] {
  return assets.filter(
    (a) =>
      isVaultGalleryFacePhoto(a) ||
      a.asset_type === "character_sheet" ||
      a.asset_type === "voice_sample" ||
      a.asset_type === "document"
  );
}

export function filterDeliverableVaultAssets<T extends VaultAsset>(assets: T[]): T[] {
  return assets.filter(isDeliverableVaultAsset);
}

export function filterArchivedVaultAssets<T extends VaultAsset>(assets: T[]): T[] {
  return assets.filter(isArchivedVaultAsset);
}

export function filterLegacyEncryptedFacePhotos<T extends VaultAsset>(assets: T[]): T[] {
  return assets.filter(isLegacyEncryptedFacePhoto);
}
