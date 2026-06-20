"use client";

import type { VaultAsset } from "@/types";
import { ArchiveVaultAssetButton } from "@/components/vault/ArchiveVaultAssetButton";
import { RestoreVaultAssetButton } from "@/components/vault/RestoreVaultAssetButton";
import { DeleteAssetButton } from "@/components/vault/DeleteAssetButton";
import { DecryptedDocumentDownload } from "./DecryptedDocumentDownload";

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

  if (asset.asset_type === "document") {
    return (
      <div className="space-y-3 pt-2">
        {asset.signed_url && asset.encryption_key_id && (
          <DecryptedDocumentDownload
            signedUrl={asset.signed_url}
            meta={{
              encryption_version: 1,
              encryption_alg: "AES-256-GCM",
              encryption_iv_b64: asset.encryption_iv ?? "",
              wrapped_data_key_b64: asset.wrapped_data_key ?? "",
              wrapped_key_iv_b64: asset.wrapped_key_iv ?? "",
              wrapped_key_salt_b64: asset.wrapped_key_salt ?? "",
              original_file_name: asset.original_file_name ?? asset.file_name,
              original_mime_type: asset.original_mime_type ?? "application/pdf",
            }}
          />
        )}
        <div className="flex flex-col gap-2 sm:flex-row">
          <ArchiveVaultAssetButton asset={asset} className="flex-1" />
          <DeleteAssetButton
            assetId={asset.id}
            label="Delete document"
            confirmDescription="This document will be permanently removed from your vault."
          />
        </div>
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
