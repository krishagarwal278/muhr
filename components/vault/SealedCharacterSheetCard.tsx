"use client";

import Link from "next/link";
import type { VaultAssetWithUrl } from "@/components/vault/AssetCard";
import type { CreatorSecurityState } from "@/types/vault";
import { SecurityBadges } from "@/components/vault/SecurityBadges";
import { computeSecurityBadges } from "@/lib/vault/security";

export function SealedCharacterSheetCard({
  asset,
  creator,
}: {
  asset: VaultAssetWithUrl;
  creator: CreatorSecurityState;
}) {
  const badges = computeSecurityBadges(
    {
      id: asset.id,
      created_at: asset.created_at,
      hash_sha256: asset.hash_sha256 ?? null,
      encryption_key_id: asset.encryption_key_id ?? null,
      transparency_log_url: asset.transparency_log_url ?? null,
      last_accessed_at: asset.last_accessed_at ?? null,
    },
    creator
  );

  return (
    <Link
      href={`/vault/${asset.id}`}
      className="group relative flex overflow-hidden rounded-2xl border-2 border-violet-400/40 bg-gradient-to-br from-[#1a1033] via-[#12121f] to-[#0f172a] shadow-lg shadow-violet-500/10 transition hover:border-violet-300/60 hover:shadow-violet-500/20"
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-violet-600/10 via-transparent to-blue-600/10" />
      <div className="relative flex w-full flex-col gap-4 p-5 sm:flex-row sm:items-center">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-violet-400/30 bg-violet-500/10">
          <svg className="h-8 w-8 text-violet-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.5 10.5V7.875c0-2.485-2.015-4.5-4.5-4.5s-4.5 2.015-4.5 4.5V10.5m-.75 0h10.5a1.5 1.5 0 0 1 1.5 1.5v7.5a1.5 1.5 0 0 1-1.5 1.5H6a1.5 1.5 0 0 1-1.5-1.5V12a1.5 1.5 0 0 1 1.5-1.5Z"
            />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-violet-300">Encrypted character sheet</p>
          <h3 className="mt-1 text-lg font-semibold text-white group-hover:text-violet-100">
            {asset.original_file_name ?? asset.file_name ?? "Character sheet"}
          </h3>
          <p className="mt-1 text-sm text-violet-200/70">
            Decrypt & download to share with brands · Only you hold the vault password
          </p>
          <div className="mt-3">
            <SecurityBadges badges={badges} />
          </div>
        </div>
        <span className="shrink-0 self-center rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white ring-1 ring-white/20 transition group-hover:bg-white/15">
          Open →
        </span>
      </div>
    </Link>
  );
}
