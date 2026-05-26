"use client";

import Image from "next/image";
import Link from "next/link";
import { isArchivedVaultAsset } from "@/lib/vault/assetFilters";
import { RestoreVaultAssetButton } from "@/components/vault/RestoreVaultAssetButton";
import { DeleteAssetButton } from "@/components/vault/DeleteAssetButton";
import type { VaultAsset } from "@/types";

type AssetWithUrl = VaultAsset & { signed_url: string | null };

export function ArchivePhotoCard({
  asset,
  onChanged,
}: {
  asset: AssetWithUrl;
  onChanged?: () => void;
}) {
  const archived = isArchivedVaultAsset(asset);
  const canPreview = !asset.encryption_key_id;
  const previewSrc = canPreview ? `/api/vault/${asset.id}/preview` : null;

  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-black/10 bg-white shadow-sm">
      <Link href={`/vault/${asset.id}`} className="relative block aspect-square bg-neutral-100">
        {previewSrc ? (
          // eslint-disable-next-line @next/next/no-img-element -- same-origin preview stream
          <img
            src={previewSrc}
            alt=""
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-amber-50 via-orange-50/80 to-neutral-100 px-3">
            <Image src="/logo.png" alt="" width={36} height={36} className="rounded-lg opacity-70" />
            <p className="text-center text-[10px] font-medium text-amber-950/80">Photo locked</p>
          </div>
        )}
        <div className="pointer-events-none absolute bottom-2 right-2 rounded-md border border-white/40 bg-white/90 p-1 shadow-sm">
          <Image src="/logo.png" alt="" width={16} height={16} className="rounded-sm" />
        </div>
        <span className="pointer-events-none absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
          Archived
        </span>
      </Link>
      <div className="flex items-center gap-1 border-t border-black/5 p-2">
        {archived ? (
          <RestoreVaultAssetButton
            assetId={asset.id}
            onComplete={onChanged}
            className="flex-1"
            compact
          />
        ) : null}
        <DeleteAssetButton
          assetId={asset.id}
          variant="icon"
          redirectHref="/vault/archive"
          onDeleted={onChanged}
        />
      </div>
    </article>
  );
}
