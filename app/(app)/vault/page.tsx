"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { KycStatusBadge } from "@/components/KycStatusBadge";
import { ProfileCompletionCard } from "@/components/profile/ProfileCompletionCard";
import type { ProfileCompletionItem } from "@/lib/profile/completion";
import { TooltipProvider } from "@/components/ui/tooltip";
import { VaultGridAssetCard, VaultRowAssetCard } from "@/components/vault/AssetCard";
import { CharacterSheetForge } from "@/components/vault/CharacterSheetForge";
import type { CharacterSheetStatusResponse } from "@/lib/character-sheet/types";
import type { KycStatus, VaultAsset } from "@/types";
import type { CreatorSecurityState } from "@/types/vault";
import { completionFromApiJson } from "@/lib/api/profilePayload";
import { characterSheetFromApiJson, vaultAssetsFromApiJson } from "@/lib/api/vaultPayload";
import { solidButtonVariants } from "@/components/ui/button-recipes";
import { cx } from "@/lib/cx";

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
  const [characterSheet, setCharacterSheet] = useState<CharacterSheetStatusResponse | null>(null);

  useEffect(() => {
    fetchAssets();
  }, []);

  async function fetchAssets() {
    try {
      const [vaultRes, identityRes, completionRes, sheetRes] = await Promise.all([
        fetch("/api/vault"),
        fetch("/api/identity"),
        fetch("/api/profile/completion"),
        fetch("/api/character-sheet"),
      ]);
      const vaultJson = await vaultRes.json().catch(() => null);
      const identityData = identityRes.ok ? await identityRes.json() : {};
      const identity = identityData.data ?? identityData;
      if (vaultRes.ok) {
        const vaultAssets = vaultAssetsFromApiJson(vaultJson);
        if (vaultAssets) setAssets(vaultAssets);
      }
      setKycStatus((identity.kycStatus as KycStatus) ?? "unverified");
      setKycVerifiedAt((identity.kycVerifiedAt as string | null) ?? null);
      if (completionRes.ok) {
        const c = completionFromApiJson(await completionRes.json().catch(() => null));
        if (c) {
          setProfilePercent(c.percent);
          setProfileItems(c.items as ProfileCompletionItem[]);
        }
      }
      if (sheetRes.ok) {
        const sheet = characterSheetFromApiJson(await sheetRes.json().catch(() => null));
        if (sheet) setCharacterSheet(sheet);
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

  const vaultFacePhotos = assets.filter((a) => a.asset_type === "face_photo" && !a.encryption_key_id);
  const characterSheets = assets.filter((a) => a.asset_type === "character_sheet");
  const facePhotoCount = vaultFacePhotos.length + characterSheets.length;
  const showVaultGallery = vaultFacePhotos.length > 0 || characterSheets.length > 0;
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
            Your secured identity assets and encrypted character sheet
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
          {kycVerified ? (
            <Link
              href="/vault/upload"
              className={cx(solidButtonVariants(), "gap-2")}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Upload
            </Link>
          ) : (
            <Link
              href="/profile#identity-verification"
              className="flex items-center justify-center gap-2 rounded-lg border border-amber-500/40 bg-amber-50 px-4 py-2 text-sm font-medium text-neutral-900 transition hover:bg-amber-100"
            >
              Verify identity first
            </Link>
          )}
        </div>
      </div>

      {!loading && profileItems.length > 0 && profilePercent < 100 && (
        <ProfileCompletionCard percent={profilePercent} items={profileItems} compact />
      )}

      {!loading && characterSheet && (
        <CharacterSheetForge
          status={characterSheet}
          kycVerified={kycVerified}
          onSealed={() => void fetchAssets()}
        />
      )}

      {/* Asset categories */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-indigo-200/60 bg-gradient-to-br from-indigo-50/80 to-violet-50/50 p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-indigo-950">Character sheet</span>
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-900">
              {loading ? (
                <span className="inline-block h-4 w-10 animate-pulse rounded bg-black/10" />
              ) : characterSheets.length > 0 ? (
                "Sealed"
              ) : characterSheet?.eligible ? (
                "Ready"
              ) : (
                "Locked"
              )}
            </span>
          </div>
        </div>
        <div className="rounded-xl border border-violet-200/60 bg-gradient-to-br from-violet-50/50 to-sky-50/30 p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-violet-950">Face photos</span>
            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-900">
              {loading ? (
                <span className="inline-block h-4 w-6 animate-pulse rounded bg-black/10" />
              ) : (
                facePhotoCount
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
              className={cx(solidButtonVariants(), "mt-6")}
            >
              Upload your first asset
            </Link>
          ) : (
            <Link
              href="/profile#identity-verification"
              className="mt-6 rounded-lg border border-amber-500/40 bg-amber-50 px-4 py-2 text-sm font-medium text-neutral-900 transition hover:bg-amber-100"
            >
              Complete verification to upload
            </Link>
          )}
        </div>
      ) : (
        <TooltipProvider>
          <div className="space-y-6">
            {showVaultGallery && (
              <div>
                <h2 className="mb-2 text-lg font-semibold text-neutral-950">Face photos</h2>
                <p className="mb-4 text-sm text-neutral-600">
                  Vault uploads are visible here. Your character sheet is stored encrypted — open it and enter your
                  vault password to view or download. Reference photos for building the sheet are in{" "}
                  <Link href="/profile#complete-profile" className="font-medium text-violet-700 underline-offset-2 hover:underline">
                    Profile
                  </Link>
                  .
                </p>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {vaultFacePhotos.map((asset) => (
                    <VaultGridAssetCard key={asset.id} asset={asset} creator={creatorSecurity} />
                  ))}
                  {characterSheets.map((asset) => (
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
