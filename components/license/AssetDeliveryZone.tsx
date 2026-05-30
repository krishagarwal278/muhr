"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { cx } from "@/lib/cx";
import { surfaceCardVariants } from "@/components/ui/surface-card";
import {
  solidButtonVariants,
  outlineButtonVariants,
} from "@/components/ui/button-recipes";
import { isContractInForce } from "@/lib/license/workspaceAccess";
import { dataFromApiJson, apiErrorMessage } from "@/lib/api/response";
import { decryptToBlobWithVaultPassword } from "@/lib/vault/crypto";
import type { LicenseRequestRow, LicenseDeliveryWithAsset } from "@/types/license";
import type { VaultAssetWithUrl } from "@/lib/api/vaultPayload";

type VaultAssetRow = VaultAssetWithUrl;

function assetIcon(asset: VaultAssetRow) {
  const path = asset.file_path?.toLowerCase() ?? "";
  const mime = asset.mime_type ?? "";
  if (path.includes("character_sheet") || asset.asset_type === "character_sheet") {
    return (
      <svg className="h-5 w-5 text-neutral-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
      </svg>
    );
  }
  if (mime.startsWith("video/")) {
    return (
      <svg className="h-5 w-5 text-neutral-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
      </svg>
    );
  }
  if (mime.startsWith("image/")) {
    return (
      <svg className="h-5 w-5 text-neutral-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
      </svg>
    );
  }
  return (
    <svg className="h-5 w-5 text-neutral-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  );
}

function assetLabel(asset: VaultAssetRow): string {
  const path = asset.file_path?.toLowerCase() ?? "";
  if (path.includes("character_sheet") || asset.asset_type === "character_sheet")
    return "Character sheet";
  if (path.includes("face") || asset.asset_type === "face_photo") return "Face photo";
  if (asset.asset_type === "voice_sample") return "Voice sample";
  return asset.file_name;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function AssetDeliveryZone({
  request,
  assets,
  assetsLoading,
}: {
  request: LicenseRequestRow;
  assets: VaultAssetRow[];
  assetsLoading: boolean;
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deliveredRecords, setDeliveredRecords] = useState<LicenseDeliveryWithAsset[]>([]);
  const [delivering, setDelivering] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [vaultOpen, setVaultOpen] = useState(true);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [publishPassword, setPublishPassword] = useState("");
  const [publishTargetId, setPublishTargetId] = useState<string | null>(null);

  const inForce = isContractInForce(request);

  const reloadDeliveries = useCallback(async () => {
    const res = await fetch(`/api/licenses/requests/${request.id}/deliveries`);
    if (!res.ok) return;
    const json = await res.json().catch(() => null);
    const data = dataFromApiJson<{ deliveries?: LicenseDeliveryWithAsset[] }>(json);
    if (data?.deliveries) setDeliveredRecords(data.deliveries);
  }, [request.id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/licenses/requests/${request.id}/deliveries`);
        if (!res.ok) return;
        const json = await res.json().catch(() => null);
        const data = dataFromApiJson<{ deliveries?: LicenseDeliveryWithAsset[] }>(json);
        if (!cancelled && data?.deliveries) {
          setDeliveredRecords(data.deliveries);
        }
      } catch {
        // silent
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [request.id]);

  const deliveredIds = useMemo(
    () => new Set(deliveredRecords.map((d) => d.vault_asset_id)),
    [deliveredRecords]
  );

  const availableAssets = useMemo(
    () => assets.filter((a) => !deliveredIds.has(a.id)),
    [assets, deliveredIds]
  );

  const selectedAssets = useMemo(
    () => assets.filter((a) => selectedIds.has(a.id)),
    [assets, selectedIds]
  );

  const toggleAsset = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const addAsset = useCallback((id: string) => {
    setSelectedIds((prev) => new Set(prev).add(id));
  }, []);

  const removeAsset = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  async function deliver() {
    if (selectedIds.size === 0) return;
    setMessage(null);
    setDelivering(true);
    try {
      const res = await fetch(`/api/licenses/requests/${request.id}/deliveries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vault_asset_ids: Array.from(selectedIds) }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setMessage(apiErrorMessage(json, "Could not deliver assets."));
        return;
      }
      const data = dataFromApiJson<{
        deliveries?: Array<{
          id: string;
          vault_asset_id: string;
          delivered_by: string;
          delivered_at: string;
        }>;
      }>(json);
      const deliveredCount = selectedIds.size;
      setDeliveredRecords((prev) => {
        const existing = new Set(prev.map((d) => d.vault_asset_id));
        const merged = [...prev];
        for (const id of selectedIds) {
          if (existing.has(id)) continue;
          const asset = assets.find((a) => a.id === id);
          const row = data?.deliveries?.find((d) => d.vault_asset_id === id);
          merged.push({
            id: row?.id ?? `pending-${id}`,
            license_request_id: request.id,
            vault_asset_id: id,
            delivered_by: row?.delivered_by ?? "",
            delivered_at: row?.delivered_at ?? new Date().toISOString(),
            file_name: asset?.file_name ?? "Vault asset",
            file_path: asset?.file_path ?? "",
            file_size: asset?.file_size ?? 0,
            mime_type: asset?.mime_type ?? "",
            asset_type: asset?.asset_type ?? "",
          });
        }
        return merged;
      });
      setSelectedIds(new Set());
      setMessage(`${deliveredCount} asset${deliveredCount > 1 ? "s" : ""} delivered.`);
    } catch {
      setMessage("Network error.");
    } finally {
      setDelivering(false);
    }
  }

  async function publishBrandShare(assetId: string) {
    const asset = assets.find((a) => a.id === assetId);
    if (!asset?.signed_url || !asset.encryption_key_id) {
      setMessage("Could not load encrypted character sheet.");
      return;
    }
    const password = publishPassword.trim();
    if (password.length < 8) {
      setMessage("Vault password must be at least 8 characters.");
      return;
    }

    setPublishingId(assetId);
    setMessage(null);
    try {
      const fileRes = await fetch(asset.signed_url);
      if (!fileRes.ok) {
        setMessage("Could not load encrypted character sheet.");
        return;
      }
      const ciphertext = await fileRes.arrayBuffer();
      const blob = await decryptToBlobWithVaultPassword({
        ciphertext,
        password,
        meta: {
          encryption_version: 1,
          encryption_alg: "AES-256-GCM",
          encryption_iv_b64: asset.encryption_iv ?? "",
          wrapped_data_key_b64: asset.wrapped_data_key ?? "",
          wrapped_key_iv_b64: asset.wrapped_key_iv ?? "",
          wrapped_key_salt_b64: asset.wrapped_key_salt ?? "",
          original_file_name: asset.original_file_name ?? asset.file_name,
          original_mime_type: asset.original_mime_type ?? "image/jpeg",
        },
      });

      const formData = new FormData();
      formData.append("file", blob, "character-sheet.jpg");
      const res = await fetch(
        `/api/vault/${assetId}/brand-share?license_request_id=${request.id}`,
        { method: "POST", body: formData }
      );
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setMessage(apiErrorMessage(json, "Could not publish brand copy."));
        return;
      }
      setPublishTargetId(null);
      setPublishPassword("");
      setMessage("Brand can now view and download this character sheet.");
      await reloadDeliveries();
    } catch {
      setMessage("Wrong vault password or could not decrypt.");
    } finally {
      setPublishingId(null);
    }
  }

  async function revokeAsset(assetId: string) {
    try {
      const res = await fetch(`/api/licenses/requests/${request.id}/deliveries`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vault_asset_id: assetId }),
      });
      if (res.ok) {
        setDeliveredRecords((prev) =>
          prev.filter((d) => d.vault_asset_id !== assetId)
        );
        setMessage("Asset access revoked.");
      }
    } catch {
      setMessage("Could not revoke access.");
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }
  function handleDragLeave() {
    setDragOver(false);
  }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const id = e.dataTransfer.getData("text/plain");
    if (id && !deliveredIds.has(id)) addAsset(id);
  }

  if (assetsLoading) {
    return (
      <section className="space-y-3">
        <h2 className="text-lg font-medium">Deliver assets</h2>
        <div className="h-32 animate-pulse rounded-xl bg-neutral-100" />
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-medium">Deliver assets</h2>

      {!inForce && (
        <div className="flex items-start gap-2.5 rounded-lg border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          <p>
            The agreement is not yet fully in force (requires both signatures + payment).
            You can still deliver assets, but consider waiting until terms are binding.
          </p>
        </div>
      )}

      {message && (
        <p className="rounded-lg border border-emerald-600/25 bg-emerald-50 px-3 py-2.5 text-sm font-medium text-emerald-950">
          {message}
        </p>
      )}

      {assets.length === 0 ? (
        <div className={cx(surfaceCardVariants({ padding: "md", interactive: "none" }))}>
          <div className="rounded-lg border border-dashed border-black/20 bg-neutral-50/80 p-6 text-center">
            <p className="text-sm font-medium text-neutral-900">No vault assets yet.</p>
            <Link
              href="/vault/upload"
              className="mt-2 inline-block text-sm font-semibold text-emerald-800 underline-offset-2 hover:text-emerald-950 hover:underline"
            >
              Upload assets to your vault
            </Link>
          </div>
        </div>
      ) : (
        <div className={cx(surfaceCardVariants({ padding: "md", interactive: "none" }), "space-y-4")}>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cx(
              "rounded-xl border-2 border-dashed transition-colors",
              dragOver
                ? "border-emerald-400 bg-emerald-50/50"
                : selectedAssets.length > 0
                  ? "border-black/10 bg-white"
                  : "border-black/15 bg-neutral-50/60"
            )}
          >
            {selectedAssets.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                <svg className="h-7 w-7 text-neutral-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
                </svg>
                <p className="text-sm font-medium text-neutral-700">Drag vault assets here</p>
                <p className="text-xs text-neutral-500">Or select from your vault below</p>
              </div>
            ) : (
              <div className="space-y-1 p-3">
                {selectedAssets.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center gap-3 rounded-lg bg-neutral-50 p-2.5"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-black/5">
                      {assetIcon(a)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-neutral-950">
                        {assetLabel(a)}
                      </p>
                      <p className="text-xs text-neutral-500">{formatSize(a.file_size)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAsset(a.id)}
                      className="shrink-0 rounded-md p-1 text-neutral-400 transition hover:bg-black/5 hover:text-neutral-700"
                      aria-label={`Remove ${assetLabel(a)}`}
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="overflow-hidden rounded-xl border border-black/10">
            <button
              type="button"
              onClick={() => setVaultOpen((v) => !v)}
              className="flex w-full items-center justify-between bg-neutral-50 px-4 py-2.5 text-left text-sm font-medium text-neutral-800 transition hover:bg-neutral-100"
            >
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 text-neutral-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V7.875c0-2.485-2.015-4.5-4.5-4.5s-4.5 2.015-4.5 4.5V10.5m-.75 0h10.5a1.5 1.5 0 0 1 1.5 1.5v7.5a1.5 1.5 0 0 1-1.5 1.5H6a1.5 1.5 0 0 1-1.5-1.5V12a1.5 1.5 0 0 1 1.5-1.5Z" />
                </svg>
                Your vault
                <span className="text-xs font-normal text-neutral-500">
                  · {availableAssets.length} available
                </span>
              </span>
              <svg
                className={cx(
                  "h-4 w-4 text-neutral-400 transition-transform",
                  vaultOpen ? "rotate-0" : "-rotate-90"
                )}
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
            {vaultOpen && (
              <div className="max-h-56 divide-y divide-black/5 overflow-y-auto">
                {availableAssets.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-neutral-500">
                    {deliveredIds.size > 0
                      ? "All vault assets have been delivered."
                      : "No deliverable assets in your vault."}
                  </p>
                ) : (
                  availableAssets.map((a) => {
                    const isSelected = selectedIds.has(a.id);
                    return (
                      <div
                        key={a.id}
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData("text/plain", a.id)}
                        className={cx(
                          "flex cursor-grab items-center gap-3 px-4 py-2.5 transition",
                          isSelected ? "bg-emerald-50/50" : "hover:bg-neutral-50"
                        )}
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-black/5">
                          {assetIcon(a)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-neutral-900">
                            {assetLabel(a)}
                          </p>
                          <p className="text-xs text-neutral-500">{formatSize(a.file_size)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleAsset(a.id)}
                          className={outlineButtonVariants({ size: "sm" })}
                        >
                          {isSelected ? "Remove" : "Add"}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-black/10 pt-3">
            <p className="text-sm text-neutral-600">
              {selectedIds.size === 0
                ? "No files selected"
                : `${selectedIds.size} file${selectedIds.size > 1 ? "s" : ""} · ${formatSize(
                    selectedAssets.reduce((s, a) => s + a.file_size, 0)
                  )}`}
            </p>
            <button
              type="button"
              disabled={selectedIds.size === 0 || delivering}
              onClick={() => void deliver()}
              className={solidButtonVariants()}
            >
              {delivering ? "Delivering…" : "Deliver to brand"}
            </button>
          </div>
        </div>
      )}

      {deliveredRecords.length > 0 && (
        <div className={cx(surfaceCardVariants({ padding: "md", interactive: "none" }), "space-y-2")}>
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
            Delivered
          </p>
          <ul className="divide-y divide-black/5">
            {deliveredRecords.map((record) => {
              const asset = assets.find((a) => a.id === record.vault_asset_id);
              const label = asset ? assetLabel(asset) : record.file_name;
              const size = asset?.file_size ?? record.file_size;
              const needsPublish =
                record.brand_view_ready === false &&
                asset?.asset_type === "character_sheet" &&
                !!asset.encryption_key_id;

              return (
                <li key={record.id} className="space-y-2 py-2.5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50">
                      <svg className="h-3.5 w-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-neutral-900">{label}</p>
                      <p className="text-xs text-neutral-500">{formatSize(size)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void revokeAsset(record.vault_asset_id)}
                      className="text-xs font-medium text-red-700 transition hover:text-red-900"
                    >
                      Revoke
                    </button>
                  </div>
                  {needsPublish && (
                    <div className="ml-10 rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2.5">
                      <p className="text-xs text-amber-950">
                        Brands cannot open legacy encrypted sheets. Enter your vault password to publish a viewable copy.
                      </p>
                      {publishTargetId === record.vault_asset_id ? (
                        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                          <input
                            type="password"
                            value={publishPassword}
                            onChange={(e) => setPublishPassword(e.target.value)}
                            placeholder="Vault password"
                            className="flex-1 rounded-lg border border-black/10 bg-white px-3 py-1.5 text-sm outline-none"
                          />
                          <button
                            type="button"
                            disabled={publishingId === record.vault_asset_id}
                            onClick={() => void publishBrandShare(record.vault_asset_id)}
                            className={outlineButtonVariants({ size: "sm" })}
                          >
                            {publishingId === record.vault_asset_id ? "Publishing…" : "Publish for brand"}
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setPublishTargetId(record.vault_asset_id)}
                          className={cx(outlineButtonVariants({ size: "sm" }), "mt-2")}
                        >
                          Enable brand viewing
                        </button>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
