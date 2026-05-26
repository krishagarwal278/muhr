"use client";

import type { VaultAsset } from "@/types";
import { collectArchiveGalleryItems } from "@/lib/vault/archiveGallery";
import { ArchivePhotoCard } from "@/components/vault/ArchivePhotoCard";

type AssetWithUrl = VaultAsset & { signed_url: string | null };

export function VaultArchiveSection({
  assets,
  archived,
  onChanged,
}: {
  assets: AssetWithUrl[];
  archived: AssetWithUrl[];
  onChanged?: () => void;
}) {
  const items = collectArchiveGalleryItems(assets, archived);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {items.map((asset) => (
        <ArchivePhotoCard key={asset.id} asset={asset} onChanged={onChanged} />
      ))}
    </div>
  );
}

export { archiveGalleryItemCount as vaultArchiveItemCount } from "@/lib/vault/archiveGallery";
