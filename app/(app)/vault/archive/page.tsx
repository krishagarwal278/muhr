"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { VaultAsset } from "@/types";
import { vaultListFromApiJson } from "@/lib/api/vaultPayload";
import { VaultArchiveHeader } from "@/components/vault/VaultArchiveHeader";
import {
  VaultArchiveSection,
  vaultArchiveItemCount,
} from "@/components/vault/VaultArchiveSection";

interface AssetWithUrl extends VaultAsset {
  signed_url: string | null;
}

export default function VaultArchivePage() {
  const [assets, setAssets] = useState<AssetWithUrl[]>([]);
  const [archivedAssets, setArchivedAssets] = useState<AssetWithUrl[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/vault");
      const json = await res.json().catch(() => null);
      if (res.ok) {
        const list = vaultListFromApiJson(json);
        if (list) {
          setAssets(list.assets);
          setArchivedAssets(list.archived);
        }
      }
    } catch (error) {
      console.error("Error fetching archive:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const itemCount = vaultArchiveItemCount(assets, archivedAssets);
  const isEmpty = !loading && itemCount === 0;

  return (
    <div className="space-y-6">
      <VaultArchiveHeader itemCount={loading ? undefined : itemCount} />

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-950" />
        </div>
      ) : isEmpty ? (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-neutral-300 py-14">
          <Image src="/logo.png" alt="" width={48} height={48} className="mb-3 rounded-xl opacity-70" />
          <p className="text-sm font-medium text-neutral-800">No archived photos</p>
          <Link href="/vault" className="mt-4 text-sm font-medium text-violet-700 hover:underline">
            Back to vault
          </Link>
        </div>
      ) : (
        <VaultArchiveSection
          assets={assets}
          archived={archivedAssets}
          onChanged={() => void load()}
        />
      )}
    </div>
  );
}
