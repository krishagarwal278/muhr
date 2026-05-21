"use client";

import Link from "next/link";
import { SignedStorageImage } from "@/components/ui/SignedStorageImage";
import type { VaultAsset } from "@/types";
import type { CreatorSecurityState } from "@/types/vault";
import { computeSecurityBadges } from "@/lib/vault/security";
import { SecurityBadges } from "@/components/vault/SecurityBadges";

export type VaultAssetWithUrl = VaultAsset & {
  signed_url: string | null;
};

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

export function VaultGridAssetCard({
  asset,
  creator,
}: {
  asset: VaultAssetWithUrl;
  creator: CreatorSecurityState;
}) {
  const badges = computeSecurityBadges(toSecurityInput(asset), creator);

  const isEncryptedSheet = asset.asset_type === "character_sheet" && !!asset.encryption_key_id;

  return (
    <Link
      href={`/vault/${asset.id}`}
      className={`group relative block overflow-hidden rounded-xl border bg-white transition ${
        isEncryptedSheet
          ? "border-violet-300/50 hover:border-violet-400/70"
          : "border-black/10 hover:border-black/20"
      }`}
    >
      <div className="relative aspect-square">
        {isEncryptedSheet ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#1a1033] via-[#12121f] to-[#0f172a] p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-violet-400/30 bg-violet-500/10">
              <svg className="h-6 w-6 text-violet-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.5 10.5V7.875c0-2.485-2.015-4.5-4.5-4.5s-4.5 2.015-4.5 4.5V10.5m-.75 0h10.5a1.5 1.5 0 0 1 1.5 1.5v7.5a1.5 1.5 0 0 1-1.5 1.5H6a1.5 1.5 0 0 1-1.5-1.5V12a1.5 1.5 0 0 1 1.5-1.5Z"
                />
              </svg>
            </div>
            <p className="text-center text-xs font-semibold text-violet-100">Character sheet</p>
            <p className="text-center text-[10px] text-violet-300/70">Password required</p>
          </div>
        ) : asset.signed_url && !asset.encryption_key_id ? (
          <SignedStorageImage
            src={asset.signed_url}
            alt={asset.file_name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover transition group-hover:scale-105"
          />
        ) : asset.encryption_key_id ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 bg-black/40">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10">
              <svg className="h-5 w-5 text-zinc-200" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.5 10.5V7.875c0-2.485-2.015-4.5-4.5-4.5s-4.5 2.015-4.5 4.5V10.5m-.75 0h10.5a1.5 1.5 0 0 1 1.5 1.5v7.5a1.5 1.5 0 0 1-1.5 1.5H6a1.5 1.5 0 0 1-1.5-1.5V12a1.5 1.5 0 0 1 1.5-1.5Z"
                />
              </svg>
            </div>
            <p className="text-xs font-medium text-zinc-200">Encrypted</p>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <svg className="h-8 w-8 text-neutral-900/28" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
              />
            </svg>
          </div>
        )}
      </div>
      <div className="border-t border-black/10 bg-neutral-50 px-2 py-1.5">
        <SecurityBadges badges={badges} />
      </div>
      <div className="border-t border-black/10 bg-neutral-50 px-3 py-2">
        <p className="truncate text-[11px] font-mono text-neutral-900/55">{asset.id.substring(0, 8).toUpperCase()}</p>
      </div>
    </Link>
  );
}

export function VaultRowAssetCard({
  asset,
  creator,
}: {
  asset: VaultAssetWithUrl;
  creator: CreatorSecurityState;
}) {
  const badges = computeSecurityBadges(toSecurityInput(asset), creator);

  return (
    <Link
      href={`/vault/${asset.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-black/10 bg-white transition hover:border-black/20"
    >
      <div className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-black/5">
          <svg className="h-5 w-5 text-neutral-900/55" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
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
  );
}
