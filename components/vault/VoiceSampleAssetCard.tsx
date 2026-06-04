"use client";

import Link from "next/link";
import type { CreatorSecurityState } from "@/types/vault";
import { computeSecurityBadges } from "@/lib/vault/security";
import { SecurityBadges } from "@/components/vault/SecurityBadges";
import { DeleteAssetButton } from "@/components/vault/DeleteAssetButton";
import type { VaultAssetWithUrl } from "@/components/vault/AssetCard";

function toSecurityInput(asset: VaultAssetWithUrl) {
  return {
    id: asset.id,
    created_at: asset.created_at,
    hash_sha256: asset.hash_sha256 ?? null,
    encryption_key_id: asset.encryption_key_id ?? null,
    transparency_log_url: asset.transparency_log_url ?? null,
    last_accessed_at: asset.last_accessed_at ?? null,
  };
}

export function VoiceSampleAssetCard({
  asset,
  creator,
  onDeleted,
}: {
  asset: VaultAssetWithUrl;
  creator: CreatorSecurityState;
  onDeleted?: () => void;
}) {
  const badges = computeSecurityBadges(toSecurityInput(asset), creator);

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-black/10 bg-white transition hover:border-black/20">
      <div className="absolute right-2 top-2 z-10">
        <DeleteAssetButton
          assetId={asset.id}
          variant="icon"
          redirectHref={null}
          confirmDescription="This voice sample will be permanently removed from your vault."
          onDeleted={onDeleted}
        />
      </div>
      <Link href={`/vault/${asset.id}`} className="flex flex-col pr-12">
        <div className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-50">
            <svg className="h-5 w-5 text-sky-800" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z"
              />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{asset.file_name}</p>
            <p className="text-xs text-neutral-900/55">{(asset.file_size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
        </div>
        <div className="border-t border-black/10 bg-neutral-50 px-3 py-1.5">
          <SecurityBadges badges={badges} />
        </div>
      </Link>
    </div>
  );
}
