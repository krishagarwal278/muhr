"use client";

import type { VaultAsset } from "@/types";
import { ArchiveVaultAssetButton } from "@/components/vault/ArchiveVaultAssetButton";
import { RestoreVaultAssetButton } from "@/components/vault/RestoreVaultAssetButton";
import { DeleteAssetButton } from "@/components/vault/DeleteAssetButton";

type AssetWithUrl = VaultAsset & { signed_url?: string | null };

export function VaultAssetActions({ asset }: { asset: AssetWithUrl }) {
  if (asset.archived_at) {
    return (
      <div className="flex flex-col gap-2 pt-2 sm:flex-row">
        <RestoreVaultAssetButton assetId={asset.id} className="flex-1" />
        <DeleteAssetButton assetId={asset.id} label="Delete permanently" />
      </div>
    );
  }

  if (asset.asset_type === "character_sheet") {
    return <DeleteAssetButton assetId={asset.id} />;
  }

  if (asset.asset_type === "voice_sample") {
    return (
      <div className="flex flex-col gap-2 pt-2 sm:flex-row">
        <DeleteAssetButton
          assetId={asset.id}
          label="Delete voice sample"
          confirmDescription="This voice sample will be permanently removed from your vault."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 pt-2 sm:flex-row">
      {asset.signed_url && asset.asset_type === "face_photo" && !asset.encryption_key_id ? (
        <a
          href={asset.signed_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 rounded-lg border border-black/15 bg-white py-2.5 text-center text-sm font-medium text-neutral-950 transition hover:bg-neutral-50"
        >
          View full size
        </a>
      ) : null}
      {!asset.encryption_key_id ? (
        <ArchiveVaultAssetButton asset={asset} className="flex-1" />
      ) : null}
    </div>
  );
}
