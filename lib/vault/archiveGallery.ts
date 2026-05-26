import type { VaultAsset } from "@/types";
import {
  filterArchivedVaultAssets,
  filterLegacyEncryptedFacePhotos,
} from "@/lib/vault/assetFilters";

export function collectArchiveGalleryItems<T extends VaultAsset>(
  activeAssets: T[],
  archivedAssets: T[],
): T[] {
  return [...filterArchivedVaultAssets(archivedAssets), ...filterLegacyEncryptedFacePhotos(activeAssets)];
}

export function archiveGalleryItemCount(activeAssets: VaultAsset[], archivedAssets: VaultAsset[]): number {
  return collectArchiveGalleryItems(activeAssets, archivedAssets).length;
}
