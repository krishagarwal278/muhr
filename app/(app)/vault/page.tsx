"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { KycStatusBadge } from "@/components/KycStatusBadge";
import { ProfileCompletionCard } from "@/components/profile/ProfileCompletionCard";
import type { ProfileCompletionItem } from "@/lib/profile/completion";
import { TooltipProvider } from "@/components/ui/tooltip";
import { VaultGridAssetCard, VaultRowAssetCard } from "@/components/vault/AssetCard";
import { VoiceSampleAssetCard } from "@/components/vault/VoiceSampleAssetCard";
import { CharacterSheetForge } from "@/components/vault/CharacterSheetForge";
import type { CharacterSheetStatusResponse } from "@/lib/character-sheet/types";
import type { KycStatus, VaultAsset } from "@/types";
import type { CreatorSecurityState } from "@/types/vault";
import { completionFromApiJson } from "@/lib/api/profilePayload";
import { characterSheetFromApiJson, vaultListFromApiJson } from "@/lib/api/vaultPayload";
import { vaultArchiveItemCount } from "@/components/vault/VaultArchiveSection";
import {
  ghostButtonVariants,
  outlineButtonVariants,
  solidButtonVariants,
} from "@/components/ui/button-recipes";
import { cx } from "@/lib/cx";
import { isVaultGalleryFacePhoto } from "@/lib/vault/assetFilters";
import { VaultCategoryTabs, type VaultCategoryTab } from "@/components/vault/VaultCategoryTabs";

interface AssetWithUrl extends VaultAsset {
  signed_url: string | null;
}

export default function VaultPage() {
  const [assets, setAssets] = useState<AssetWithUrl[]>([]);
  const [archivedAssets, setArchivedAssets] = useState<AssetWithUrl[]>([]);
  const [kycStatus, setKycStatus] = useState<KycStatus | null>(null);
  const [kycVerifiedAt, setKycVerifiedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [profilePercent, setProfilePercent] = useState(0);
  const [profileItems, setProfileItems] = useState<ProfileCompletionItem[]>([]);
  const [characterSheet, setCharacterSheet] = useState<CharacterSheetStatusResponse | null>(null);
  const [activeTab, setActiveTab] = useState<VaultCategoryTab>("face");

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
        const vaultList = vaultListFromApiJson(vaultJson);
        if (vaultList) {
          setAssets(vaultList.assets);
          setArchivedAssets(vaultList.archived);
        }
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

  const vaultFacePhotos = assets.filter(isVaultGalleryFacePhoto);
  const characterSheets = assets.filter((a) => a.asset_type === "character_sheet");
  const facePhotoCount = vaultFacePhotos.length;
  const showVaultGallery = vaultFacePhotos.length > 0 || characterSheets.length > 0;
  const voiceSamples = assets.filter((a) => a.asset_type === "voice_sample");
  const documents = assets.filter((a) => a.asset_type === "document");
  const archiveCount = loading ? 0 : vaultArchiveItemCount(assets, archivedAssets);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2 gap-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">Vault</h1>
            {!loading && kycStatus !== null && kycStatus !== "verified" && (
              <KycStatusBadge status={kycStatus} />
            )}
            {!loading && profileItems.length > 0 && profilePercent < 100 && (
              <span className="rounded-full border border-black/10 bg-black/5 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-neutral-800">
                {profilePercent}% complete
              </span>
            )}
          </div>
          <p className="text-sm text-neutral-900/60">
            Your secured identity assets and encrypted character sheet
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end">
          <Link href="/vault/archive" className={cx(ghostButtonVariants(), "gap-2 justify-center")}>
            <svg
              className="h-4 w-4 text-neutral-600"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z"
              />
            </svg>
            Archive
            {!loading && archiveCount > 0 ? (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-amber-950">
                {archiveCount}
              </span>
            ) : null}
          </Link>
          {kycVerified ? (
            <Link
              href="/vault/upload"
              className={cx(solidButtonVariants(), "gap-2 justify-center")}
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
        <div className="rounded-xl border border-sky-200/60 bg-gradient-to-br from-sky-50/50 to-emerald-50/30 p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-sky-950">Voice samples</span>
            <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-900">
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
            Upload face photos or record a voice sample to secure your identity for licensing.
          </p>
          {kycVerified ? (
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link href="/vault/upload" className={solidButtonVariants()}>
                Upload photos
              </Link>
              <Link href="/vault/voice" className={outlineButtonVariants()}>
                Record voice
              </Link>
            </div>
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
            <VaultCategoryTabs
              active={activeTab}
              onChange={setActiveTab}
              counts={{
                face: facePhotoCount,
                voice: voiceSamples.length,
                documents: documents.length,
                sheetLabel: characterSheets.length > 0
                  ? "Sealed"
                  : characterSheet?.eligible
                    ? "Ready"
                    : "Locked",
              }}
            />

            {activeTab === "sheet" && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-neutral-950">Character sheet</h2>
                {characterSheets.length > 0 ? (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                    {characterSheets.map((asset) => (
                      <VaultGridAssetCard key={asset.id} asset={asset} creator={creatorSecurity} />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-neutral-600">
                    Build and seal your sheet from the banner above when your profile is complete.
                  </p>
                )}
              </div>
            )}

            {activeTab === "face" && (
              <div>
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-neutral-950">Face photos</h2>
                    <p className="mt-1 text-sm text-neutral-600">
                      Reference photos for building the sheet are in{" "}
                      <Link href="/profile#complete-profile" className="font-medium text-violet-700 underline-offset-2 hover:underline">
                        Profile
                      </Link>
                      .
                    </p>
                  </div>
                  {kycVerified && (
                    <Link href="/vault/upload" className={cx(solidButtonVariants(), "shrink-0 justify-center gap-2")}>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                      Upload photo
                    </Link>
                  )}
                </div>
                {showVaultGallery && vaultFacePhotos.length > 0 ? (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                    {vaultFacePhotos.map((asset) => (
                      <VaultGridAssetCard key={asset.id} asset={asset} creator={creatorSecurity} />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-neutral-300 py-12 text-center">
                    <p className="text-sm text-neutral-600">No face photos in Vault yet.</p>
                    {kycVerified ? (
                      <Link href="/vault/upload" className={cx(solidButtonVariants(), "mt-4 inline-flex")}>
                        Upload photos
                      </Link>
                    ) : null}
                  </div>
                )}
              </div>
            )}

            {activeTab === "voice" && (
              <div>
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-neutral-950">Voice samples</h2>
                    <p className="mt-1 text-sm text-neutral-600">
                      Record with the scrolling script or upload a clip (45 seconds to 2 minutes). Encrypted in your
                      Vault for voice licensing.
                    </p>
                  </div>
                  {kycVerified ? (
                    <Link href="/vault/voice" className={cx(solidButtonVariants(), "shrink-0 justify-center gap-2")}>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                      </svg>
                      Record sample
                    </Link>
                  ) : null}
                </div>
                {voiceSamples.length > 0 ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {voiceSamples.map((asset) => (
                      <VoiceSampleAssetCard
                        key={asset.id}
                        asset={asset}
                        creator={creatorSecurity}
                        onDeleted={() => void fetchAssets()}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-sky-200 bg-sky-50/40 py-12 text-center">
                    <p className="text-sm text-neutral-700">No voice samples yet — add one for voice licensing.</p>
                    {kycVerified ? (
                      <Link href="/vault/voice" className={cx(solidButtonVariants(), "mt-4 inline-flex")}>
                        Record a sample
                      </Link>
                    ) : (
                      <Link
                        href="/profile#identity-verification"
                        className="mt-4 inline-flex rounded-lg border border-amber-500/40 bg-amber-50 px-4 py-2 text-sm font-medium text-neutral-900"
                      >
                        Verify identity to record
                      </Link>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === "documents" && (
              <div>
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-neutral-950">Documents</h2>
                    <p className="mt-1 text-sm text-neutral-600">
                      Likeness-related documents such as contracts, releases, and agreements. Encrypted and shareable with your vault assets.
                    </p>
                  </div>
                  {kycVerified && (
                    <Link href="/vault/upload" className={cx(solidButtonVariants(), "shrink-0 justify-center gap-2")}>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                      Upload document
                    </Link>
                  )}
                </div>
                {documents.length > 0 ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {documents.map((asset) => (
                      <VaultRowAssetCard key={asset.id} asset={asset} creator={creatorSecurity} />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-neutral-300 py-12 text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100">
                      <svg className="h-6 w-6 text-neutral-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                      </svg>
                    </div>
                    <p className="text-sm text-neutral-600">No documents uploaded yet.</p>
                    <p className="mt-1 text-xs text-neutral-500">Upload contracts, releases, or licensing agreements.</p>
                    {kycVerified && (
                      <Link href="/vault/upload" className={cx(solidButtonVariants(), "mt-4 inline-flex")}>
                        Upload document
                      </Link>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </TooltipProvider>
      )}
    </div>
  );
}
