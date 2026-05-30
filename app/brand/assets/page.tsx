"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { appPageTitleVariants } from "@/components/ui/page-header";
import { surfaceCardVariants } from "@/components/ui/surface-card";
import { outlineButtonVariants } from "@/components/ui/button-recipes";
import { cx } from "@/lib/cx";
import { dataFromApiJson } from "@/lib/api/response";
import { downloadBlob } from "@/lib/character-sheet/captureToBlob";

type DeliveryAsset = {
  id: string;
  vault_asset_id: string;
  delivered_at: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  asset_type: string;
  brand_view_ready: boolean;
};

type LicenseGroup = {
  id: string;
  status: string;
  duration_days: number;
  budget_inr: number | null;
  intended_use: string;
  contract_effective_at: string | null;
  brand_payment_cleared_at: string | null;
  brand_signed_contract_at: string | null;
  creator_signed_contract_at: string | null;
  delivery_count: number;
  deliveries: DeliveryAsset[];
};

type CreatorGroup = {
  creator_id: string;
  display_name: string | null;
  handle: string | null;
  licenses: LicenseGroup[];
};

function initials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function daysRemaining(effectiveAt: string | null, durationDays: number): number | null {
  if (!effectiveAt) return null;
  const end = new Date(effectiveAt);
  end.setDate(end.getDate() + durationDays);
  const diff = end.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function AssetIcon({ mimeType, assetType }: { mimeType: string; assetType: string }) {
  if (assetType === "character_sheet") {
    return (
      <svg className="h-5 w-5 text-neutral-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
      </svg>
    );
  }
  if (mimeType.startsWith("video/")) {
    return (
      <svg className="h-5 w-5 text-neutral-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
      </svg>
    );
  }
  if (mimeType.startsWith("image/")) {
    return (
      <svg className="h-5 w-5 text-neutral-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
      </svg>
    );
  }
  return (
    <svg className="h-5 w-5 text-neutral-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  );
}

export default function BrandAssetsPage() {
  const [creators, setCreators] = useState<CreatorGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCreatorId, setSelectedCreatorId] = useState<string | null>(null);
  const [fetchingUrl, setFetchingUrl] = useState<string | null>(null);
  const [viewer, setViewer] = useState<{
    url: string;
    delivery: DeliveryAsset;
    licenseId: string;
  } | null>(null);
  const [assetError, setAssetError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/brand/assets");
        if (!res.ok) return;
        const json = await res.json().catch(() => null);
        const data = dataFromApiJson<{ creators?: CreatorGroup[] }>(json);
        if (!cancelled && data?.creators) {
          setCreators(data.creators);
          if (data.creators.length > 0) {
            setSelectedCreatorId(data.creators[0].creator_id);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedCreator = creators.find((c) => c.creator_id === selectedCreatorId) ?? null;
  const selectedLicense = selectedCreator?.licenses[0] ?? null;

  const fetchDeliveryAccess = useCallback(
    async (licenseId: string, deliveryAsset: DeliveryAsset) => {
      const res = await fetch(`/api/licenses/requests/${licenseId}/deliveries`);
      if (!res.ok) throw new Error("Could not load asset.");
      const json = await res.json().catch(() => null);
      const data = dataFromApiJson<{
        deliveries?: Array<{
          vault_asset_id: string;
          signed_url?: string | null;
          view_blocked?: boolean;
          view_blocked_reason?: string | null;
          mime_type?: string;
        }>;
      }>(json);
      const match = data?.deliveries?.find(
        (d) => d.vault_asset_id === deliveryAsset.vault_asset_id
      );
      if (!match) throw new Error("Asset not found.");
      if (match.view_blocked) {
        throw new Error(
          match.view_blocked_reason ??
            "The creator still needs to publish a viewable copy of this asset."
        );
      }
      if (!match.signed_url) throw new Error("Download link unavailable. Try again.");
      return {
        url: match.signed_url,
        mimeType: match.mime_type ?? deliveryAsset.mime_type,
      };
    },
    []
  );

  const openAsset = useCallback(
    async (licenseId: string, deliveryAsset: DeliveryAsset) => {
      if (!deliveryAsset.brand_view_ready) return;
      setFetchingUrl(deliveryAsset.id);
      setAssetError(null);
      try {
        const access = await fetchDeliveryAccess(licenseId, deliveryAsset);
        if (access.mimeType.startsWith("image/")) {
          setViewer({ url: access.url, delivery: deliveryAsset, licenseId });
        } else {
          window.open(access.url, "_blank");
        }
      } catch (err) {
        setAssetError(err instanceof Error ? err.message : "Could not open asset.");
      } finally {
        setFetchingUrl(null);
      }
    },
    [fetchDeliveryAccess]
  );

  const downloadAsset = useCallback(
    async (licenseId: string, deliveryAsset: DeliveryAsset) => {
      if (!deliveryAsset.brand_view_ready) return;
      setFetchingUrl(deliveryAsset.id);
      setAssetError(null);
      try {
        const access = await fetchDeliveryAccess(licenseId, deliveryAsset);
        const res = await fetch(access.url);
        if (!res.ok) throw new Error("Could not download asset.");
        const blob = await res.blob();
        downloadBlob(blob, deliveryAsset.file_name);
      } catch (err) {
        setAssetError(err instanceof Error ? err.message : "Could not download asset.");
      } finally {
        setFetchingUrl(null);
      }
    },
    [fetchDeliveryAccess]
  );

  if (loading) {
    return (
      <div>
        <h1 className={appPageTitleVariants()}>Assets</h1>
        <div className="mt-6 space-y-3">
          <div className="h-32 animate-pulse rounded-xl bg-neutral-100" />
          <div className="h-48 animate-pulse rounded-xl bg-neutral-100" />
        </div>
      </div>
    );
  }

  if (creators.length === 0) {
    return (
      <div>
        <h1 className={appPageTitleVariants()}>Assets</h1>
        <p className="mt-2 max-w-xl text-sm text-neutral-600">
          Delivered assets from creators will appear here once a license is accepted and assets are shared.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className={appPageTitleVariants()}>Assets</h1>
      <p className="mt-2 max-w-xl text-sm text-neutral-600">
        Licensed creator assets.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {creators.map((creator) => {
          const license = creator.licenses[0];
          const days = license
            ? daysRemaining(license.contract_effective_at, license.duration_days)
            : null;
          const totalDeliveries = creator.licenses.reduce((s, l) => s + l.delivery_count, 0);
          const isActive = creator.creator_id === selectedCreatorId;

          return (
            <button
              key={creator.creator_id}
              type="button"
              onClick={() => setSelectedCreatorId(creator.creator_id)}
              className={cx(
                surfaceCardVariants({ padding: "md", interactive: "subtle" }),
                "w-full text-left",
                isActive && "ring-2 ring-neutral-950 ring-offset-1"
              )}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-100 to-emerald-50 text-sm font-semibold text-emerald-900">
                {initials(creator.display_name)}
              </div>
              <p className="mt-3 text-sm font-semibold text-neutral-950">
                {creator.display_name || "Creator"}
              </p>
              <p className="mt-0.5 text-xs text-neutral-600">
                {totalDeliveries} asset{totalDeliveries !== 1 ? "s" : ""} delivered
                {license ? ` · ${license.duration_days}-day licence` : ""}
              </p>
              <div className="mt-3 flex items-center justify-between">
                {days !== null ? (
                  <span className="rounded-full border border-emerald-600/25 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-900">
                    {days > 0 ? `${days} days left` : "Expired"}
                  </span>
                ) : (
                  <span className="rounded-full border border-amber-500/35 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-950">
                    Pending
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {selectedCreator && selectedLicense && (
        <div className={cx(surfaceCardVariants({ padding: "md", interactive: "none" }), "mt-4 space-y-4")}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-neutral-950">
                {selectedCreator.display_name || "Creator"}
              </h2>
              <p className="mt-0.5 text-sm text-neutral-600">{selectedLicense.intended_use}</p>
            </div>
            <Link
              href={`/brand/licenses/requests/${selectedLicense.id}`}
              className={outlineButtonVariants({ size: "sm" })}
            >
              View licence
            </Link>
          </div>

          {selectedLicense.contract_effective_at && (
            <LicenseTimer
              effectiveAt={selectedLicense.contract_effective_at}
              durationDays={selectedLicense.duration_days}
            />
          )}

          {selectedLicense.deliveries.length === 0 ? (
            <div className="rounded-lg border border-dashed border-black/20 bg-neutral-50/80 p-6 text-center text-sm text-neutral-700">
              Waiting for the creator to deliver assets.
            </div>
          ) : (
            <>
              {assetError && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                  {assetError}
                </p>
              )}
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
                Delivered assets
              </p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {selectedLicense.deliveries.map((d) => {
                  const blocked = !d.brand_view_ready;
                  return (
                  <div
                    key={d.id}
                    className={cx(
                      "flex flex-col gap-2 rounded-lg border bg-white p-3 transition",
                      blocked
                        ? "border-amber-200 bg-amber-50/40"
                        : "border-black/10 hover:border-black/20"
                    )}
                  >
                    <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-black/5">
                      <AssetIcon mimeType={d.mime_type} assetType={d.asset_type} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-neutral-950">{d.file_name}</p>
                      <p className="text-xs text-neutral-500">{formatSize(d.file_size)}</p>
                    </div>
                    <div className="flex shrink-0 flex-col gap-1">
                      <button
                        type="button"
                        disabled={blocked || fetchingUrl === d.id}
                        onClick={() => void openAsset(selectedLicense.id, d)}
                        className={outlineButtonVariants({ size: "sm" })}
                      >
                        {fetchingUrl === d.id ? "Loading…" : "Open"}
                      </button>
                      <button
                        type="button"
                        disabled={blocked || fetchingUrl === d.id}
                        onClick={() => void downloadAsset(selectedLicense.id, d)}
                        className={outlineButtonVariants({ size: "sm" })}
                      >
                        Download
                      </button>
                    </div>
                    </div>
                    {blocked && (
                      <p className="text-xs text-amber-900">
                        {d.asset_type === "character_sheet"
                          ? "Waiting for the creator to publish a viewable copy of this character sheet."
                          : "This asset is not yet available to view."}
                      </p>
                    )}
                  </div>
                  );
                })}
              </div>
              <p className="flex items-center gap-1.5 text-xs text-neutral-500">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V7.875c0-2.485-2.015-4.5-4.5-4.5s-4.5 2.015-4.5 4.5V10.5m-.75 0h10.5a1.5 1.5 0 0 1 1.5 1.5v7.5a1.5 1.5 0 0 1-1.5 1.5H6a1.5 1.5 0 0 1-1.5-1.5V12a1.5 1.5 0 0 1 1.5-1.5Z" />
                </svg>
                Links expire in 1 hr
              </p>
            </>
          )}
        </div>
      )}

      {viewer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setViewer(null)}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-black/10 px-4 py-3">
              <p className="truncate text-sm font-medium text-neutral-950">{viewer.delivery.file_name}</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void downloadAsset(viewer.licenseId, viewer.delivery)}
                  className={outlineButtonVariants({ size: "sm" })}
                >
                  Download
                </button>
                <button
                  type="button"
                  onClick={() => setViewer(null)}
                  className={outlineButtonVariants({ size: "sm" })}
                >
                  Close
                </button>
              </div>
            </div>
            <div className="flex max-h-[calc(90vh-56px)] items-center justify-center bg-neutral-950 p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={viewer.url}
                alt={viewer.delivery.file_name}
                className="max-h-[calc(90vh-88px)] max-w-full object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LicenseTimer({
  effectiveAt,
  durationDays,
}: {
  effectiveAt: string;
  durationDays: number;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const end = new Date(effectiveAt);
  end.setDate(end.getDate() + durationDays);
  const diff = Math.max(0, end.getTime() - now);

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const mins = Math.floor((diff / (1000 * 60)) % 60);
  const secs = Math.floor((diff / 1000) % 60);
  const pad = (n: number) => String(n).padStart(2, "0");

  const expired = diff === 0;

  return (
    <div
      className={cx(
        "flex flex-wrap items-center gap-4 rounded-lg px-4 py-3 text-sm",
        expired ? "border border-red-200 bg-red-50" : "bg-neutral-50"
      )}
    >
      <div className="flex items-center gap-1.5 font-mono text-lg font-semibold tabular-nums text-neutral-950">
        <span>{pad(days)}</span>
        <span className="text-neutral-400">:</span>
        <span>{pad(hours)}</span>
        <span className="text-neutral-400">:</span>
        <span>{pad(mins)}</span>
        <span className="text-neutral-400">:</span>
        <span>{pad(secs)}</span>
      </div>
      <p className="text-xs text-neutral-600">
        {expired
          ? "Licence expired. Assets are no longer accessible."
          : `Active until ${end.toLocaleDateString(undefined, { dateStyle: "medium" })}`}
      </p>
    </div>
  );
}
