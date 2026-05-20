"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { KycStatusBadge } from "@/components/KycStatusBadge";
import { ProfileCompletionCard } from "@/components/profile/ProfileCompletionCard";
import type { ProfileCompletionItem } from "@/lib/profile/completion";
import { TooltipProvider } from "@/components/ui/tooltip";
import { VaultGridAssetCard, VaultRowAssetCard } from "@/components/vault/AssetCard";
import type { KycStatus, VaultAsset } from "@/types";
import type { CreatorSecurityState } from "@/types/vault";

interface AssetWithUrl extends VaultAsset {
  signed_url: string | null;
}

export default function VaultPage() {
  const [assets, setAssets] = useState<AssetWithUrl[]>([]);
  const [kycStatus, setKycStatus] = useState<KycStatus | null>(null);
  const [kycVerifiedAt, setKycVerifiedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [profilePercent, setProfilePercent] = useState(0);
  const [profileItems, setProfileItems] = useState<ProfileCompletionItem[]>([]);

  useEffect(() => {
    fetchAssets();
  }, []);

  async function fetchAssets() {
    try {
      const [vaultRes, identityRes, completionRes] = await Promise.all([
        fetch("/api/vault"),
        fetch("/api/identity"),
        fetch("/api/profile/completion"),
      ]);
      const data = await vaultRes.json();
      const identityData = identityRes.ok ? await identityRes.json() : {};
      if (data.assets) {
        setAssets(data.assets);
      }
      setKycStatus((identityData.kycStatus as KycStatus) ?? "unverified");
      setKycVerifiedAt((identityData.kycVerifiedAt as string | null) ?? null);
      if (completionRes.ok) {
        const c = await completionRes.json();
        setProfilePercent(c.percent ?? 0);
        setProfileItems(c.items ?? []);
      }
    } catch (error) {
      console.error("Error fetching assets:", error);
    } finally {
      setLoading(false);
    }
  }

  const kycVerified = kycStatus === "verified";

  const creatorSecurity: CreatorSecurityState = {
    kyc_status: kycStatus ?? "unverified",
    kyc_verified_at: kycVerifiedAt,
  };

  const facePhotos = assets.filter((a) => a.asset_type === "face_photo");
  const voiceSamples = assets.filter((a) => a.asset_type === "voice_sample");
  const documents = assets.filter((a) => a.asset_type === "document");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2 gap-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">Vault</h1>
            {!loading && kycStatus !== null && (
              <KycStatusBadge status={kycStatus} />
            )}
            {!loading && profileItems.length > 0 && (
              <span className="rounded-full border border-black/10 bg-black/5 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-neutral-800">
                {profilePercent}% complete
              </span>
            )}
          </div>
          <p className="text-sm text-neutral-900/60">
            Your secured identity assets
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
          {kycVerified ? (
            <Link
              href="/vault/upload"
              className="flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black transition hover:opacity-90"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Upload
            </Link>
          ) : (
            <Link
              href="/settings#identity-verification"
              className="flex items-center justify-center gap-2 rounded-lg border border-amber-500/40 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-950 transition hover:bg-amber-100"
            >
              Verify identity first
            </Link>
          )}
        </div>
      </div>

      {!loading && profileItems.length > 0 && profilePercent < 100 && (
        <ProfileCompletionCard percent={profilePercent} items={profileItems} compact />
      )}

      {/* Asset categories */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-black/10 bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-900/70">Face photos</span>
            <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs font-medium text-neutral-950">
              {loading ? (
                <span className="inline-block h-4 w-6 animate-pulse rounded bg-black/10" />
              ) : (
                facePhotos.length
              )}
            </span>
          </div>
        </div>
        <div className="rounded-xl border border-black/10 bg-white p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-neutral-900/70">Voice samples</span>
              <span className="rounded bg-black/5 px-1.5 py-0.5 text-[10px] font-medium text-neutral-900/60">
                Coming soon
              </span>
            </div>
            <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs font-medium text-neutral-950">
              {loading ? (
                <span className="inline-block h-4 w-6 animate-pulse rounded bg-black/10" />
              ) : (
                voiceSamples.length
              )}
            </span>
          </div>
        </div>
        <div className="rounded-xl border border-black/10 bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-900/70">Documents</span>
            <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs font-medium text-neutral-950">
              {loading ? (
                <span className="inline-block h-4 w-6 animate-pulse rounded bg-black/10" />
              ) : (
                documents.length
              )}
            </span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-950" />
        </div>
      ) : assets.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 py-16">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-black/5">
            <svg
              className="h-7 w-7 text-neutral-900/45"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium">No assets yet</h3>
          <p className="mt-1 max-w-sm text-center text-sm text-neutral-900/60">
            Upload photos to secure your identity and enable licensing.
          </p>
          {kycVerified ? (
            <Link
              href="/vault/upload"
              className="mt-6 rounded-lg border border-black/15 bg-neutral-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-900"
            >
              Upload your first asset
            </Link>
          ) : (
            <Link
              href="/settings#identity-verification"
              className="mt-6 rounded-lg border border-amber-500/40 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-950 transition hover:bg-amber-100"
            >
              Complete verification to upload
            </Link>
          )}
        </div>
      ) : (
        <TooltipProvider>
          <div className="space-y-6">
            {facePhotos.length > 0 && (
              <div>
                <h2 className="mb-4 text-lg font-medium">Face photos</h2>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {facePhotos.map((asset) => (
                    <VaultGridAssetCard key={asset.id} asset={asset} creator={creatorSecurity} />
                  ))}
                </div>
              </div>
            )}

            {voiceSamples.length > 0 && (
              <div>
                <h2 className="mb-4 text-lg font-medium">Voice samples</h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {voiceSamples.map((asset) => (
                    <VaultRowAssetCard key={asset.id} asset={asset} creator={creatorSecurity} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </TooltipProvider>
      )}
    </div>
  );
}
