"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";

import { CharacterSheetPreview } from "@/components/vault/CharacterSheetPreview";
import { buildCharacterSheetPngBlob } from "@/lib/character-sheet/buildSheetBlob";
import { downloadBlob } from "@/lib/character-sheet/captureToBlob";
import { sheetTheme as t } from "@/lib/character-sheet/theme";
import { encryptFileWithVaultPassword } from "@/lib/vault/crypto";
import type {
  CharacterSheetGenerateResponse,
  CharacterSheetStatusResponse,
} from "@/lib/character-sheet/types";
import { apiErrorMessage } from "@/lib/api/response";
import { characterSheetGenerateFromApiJson, vaultUploadFromApiJson } from "@/lib/api/vaultPayload";

type ForgeStep = "idle" | "forging" | "preview" | "sealing" | "done";

interface CharacterSheetForgeProps {
  status: CharacterSheetStatusResponse;
  kycVerified: boolean;
  onSealed: () => void;
}

export function CharacterSheetForge({ status, kycVerified, onSealed }: CharacterSheetForgeProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<ForgeStep>("idle");
  const [forgeProgress, setForgeProgress] = useState(0);
  const [generated, setGenerated] = useState<CharacterSheetGenerateResponse | null>(null);
  const [vaultPassword, setVaultPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [isRegenerate, setIsRegenerate] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const replaceVaultAssetIdRef = useRef<string | null>(null);

  const startForge = useCallback(async (regenerate = false) => {
    if (!kycVerified) {
      setError("Complete identity verification before sealing to the Vault.");
      return;
    }
    if (regenerate) {
      replaceVaultAssetIdRef.current = status.vaultAssetId;
    } else {
      replaceVaultAssetIdRef.current = null;
    }
    setIsRegenerate(regenerate);
    setOpen(true);
    setStep("forging");
    setError(null);
    setForgeProgress(8);

    const tick = window.setInterval(() => {
      setForgeProgress((p) => Math.min(p + 4, 92));
    }, 180);

    try {
      const res = await fetch("/api/character-sheet/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regenerate }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(apiErrorMessage(json, "Could not build character sheet"));
        setStep("idle");
        setOpen(false);
        return;
      }
      const generatedSheet = characterSheetGenerateFromApiJson(json);
      if (!generatedSheet) {
        setError("Could not build character sheet");
        setStep("idle");
        setOpen(false);
        return;
      }
      setGenerated(generatedSheet);
      setForgeProgress(100);
      await new Promise((r) => setTimeout(r, 400));
      setStep("preview");
    } catch {
      setError("Network error while building sheet");
      setOpen(false);
      setStep("idle");
    } finally {
      window.clearInterval(tick);
    }
  }, [kycVerified, status.vaultAssetId]);

  async function getSheetBlob(): Promise<Blob> {
    if (!generated) throw new Error("No sheet data");
    return buildCharacterSheetPngBlob(generated);
  }

  async function handleDownload() {
    if (!generated) return;
    setDownloading(true);
    setError(null);
    try {
      const blob = await getSheetBlob();
      const safeName = generated.displayName.replace(/[^\w.-]+/g, "-").slice(0, 40);
      const ext = blob.type.includes("png") ? "png" : "jpg";
      downloadBlob(blob, `muhr-character-sheet-${safeName}.${ext}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed");
    } finally {
      setDownloading(false);
    }
  }

  async function sealToVault() {
    if (!generated || !previewRef.current) return;
    if (!vaultPassword || vaultPassword.trim().length < 8) {
      setError("Vault password must be at least 8 characters.");
      return;
    }

    setStep("sealing");
    setError(null);

    try {
      const blob = await getSheetBlob();
      const mime = blob.type || "image/jpeg";
      const ext = mime.includes("png") ? "png" : "jpg";
      const file = new File([blob], `muhr-character-sheet.${ext}`, { type: mime });
      const { encryptedFile, meta } = await encryptFileWithVaultPassword(file, vaultPassword);

      const formData = new FormData();
      formData.append("file", encryptedFile);
      formData.append("asset_type", "character_sheet");
      formData.append("encryption_version", String(meta.encryption_version));
      formData.append("encryption_alg", meta.encryption_alg);
      formData.append("encryption_iv", meta.encryption_iv_b64);
      formData.append("wrapped_data_key", meta.wrapped_data_key_b64);
      formData.append("wrapped_key_iv", meta.wrapped_key_iv_b64);
      formData.append("wrapped_key_salt", meta.wrapped_key_salt_b64);
      formData.append("original_file_name", `Character Sheet — Encrypted.${ext}`);
      formData.append("original_mime_type", mime);

      const uploadRes = await fetch("/api/vault/upload", { method: "POST", body: formData });
      const uploadJson = await uploadRes.json().catch(() => null);
      const uploadData = vaultUploadFromApiJson(uploadJson);
      if (!uploadRes.ok || !uploadData?.asset?.id) {
        setError(apiErrorMessage(uploadJson, uploadData?.message ?? "Upload failed"));
        setStep("preview");
        return;
      }

      await fetch("/api/character-sheet/seal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vaultAssetId: uploadData.asset.id,
          generationMode: generated.mode,
          replaceVaultAssetId: replaceVaultAssetIdRef.current ?? undefined,
        }),
      });

      setStep("done");
      onSealed();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not seal character sheet");
      setStep("preview");
    }
  }

  const locked = status.status === "locked";
  const sealed = status.status === "sealed";
  const syncPercent = Math.min(
    100,
    (status.photoCount / status.minPhotos) * 50 + (status.hasMeasurements ? 50 : 0)
  );

  return (
    <>
      <div
        className="relative overflow-hidden rounded-2xl border p-6 shadow-xl"
        style={{
          background: t.gradientBg,
          borderColor: t.borderStrong,
          color: t.text,
          boxShadow: `0 0 40px ${t.purpleGlow}`,
        }}
      >
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-blue-500/15 blur-3xl" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest"
                style={{ borderColor: t.border, color: t.textMuted, backgroundColor: t.accentMuted }}
              >
                Character sheet
              </span>
              {sealed && (
                <span
                  className="rounded border px-2 py-0.5 text-[10px] font-semibold uppercase"
                  style={{ borderColor: "rgba(74,222,128,0.35)", color: t.success, backgroundColor: t.successBg }}
                >
                  Sealed
                </span>
              )}
            </div>
            <h2 className="text-2xl font-semibold tracking-tight">Build your character sheet</h2>
            <p className="text-sm" style={{ color: t.textMuted }}>
              {sealed
                ? "Your password-protected sheet is in the Vault. Regenerate anytime to rebuild from your latest photos and measurements in Profile."
                : "Turn your photos and measurements into a brand-ready reference sheet. Export it for outreach, then seal an encrypted copy in your Vault."}
            </p>

            {sealed && (
              <p className="text-xs" style={{ color: t.textDim }}>
                {status.photoCount}/{status.minPhotos} photos · {status.hasMeasurements ? "Stats synced" : "Add measurements in Profile"}
              </p>
            )}

            {!sealed && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between text-xs" style={{ color: t.textDim }}>
                  <span>Profile sync</span>
                  <span className="tabular-nums">
                    {status.photoCount}/{status.minPhotos} photos · {status.hasMeasurements ? "Stats ✓" : "Stats —"}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${syncPercent}%`, background: t.progress }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:items-stretch sm:min-w-[11rem]">
            {sealed && status.vaultAssetId ? (
              <>
                <Link
                  href={`/vault/${status.vaultAssetId}`}
                  className="rounded-lg border border-white/20 bg-white/10 px-5 py-2.5 text-center text-sm font-semibold transition hover:bg-white/15"
                >
                  View & download
                </Link>
                <button
                  type="button"
                  onClick={() => void startForge(true)}
                  disabled={!status.eligible || step === "forging"}
                  className="rounded-lg border border-violet-400/40 bg-violet-500/20 px-5 py-2.5 text-center text-sm font-semibold text-violet-100 transition hover:bg-violet-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {step === "forging" && isRegenerate ? "Regenerating…" : "Regenerate character sheet"}
                </button>
              </>
            ) : locked ? (
              <Link
                href="/profile#complete-profile"
                className="rounded-lg border border-white/15 bg-white/5 px-5 py-2.5 text-center text-sm font-medium transition hover:bg-white/10"
              >
                Complete profile first
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => void startForge(false)}
                disabled={!status.eligible || step === "forging"}
                className="rounded-lg bg-gradient-to-r from-violet-500 to-indigo-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition hover:from-violet-400 hover:to-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {step === "forging" ? "Building…" : "Build character sheet"}
              </button>
            )}
            {!sealed && !locked}
          </div>
        </div>

        {error && !open && (
          <p className="relative mt-4 rounded-lg border border-red-500/30 bg-red-950/40 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border p-5 shadow-2xl"
            style={{ borderColor: t.border, backgroundColor: t.canvas, color: t.text }}
          >
            {step === "forging" && (
              <div className="flex flex-col items-center py-16 text-center">
                <div className="relative h-20 w-20">
                  <div
                    className="absolute inset-0 animate-spin rounded-full border-2 border-transparent"
                    style={{ borderTopColor: t.text }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg className="h-8 w-8 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
                      />
                    </svg>
                  </div>
                </div>
                <h3 className="mt-6 text-xl font-semibold">
                  {isRegenerate ? "Regenerating character sheet…" : "Building character sheet…"}
                </h3>
                <p className="mt-2 max-w-sm text-sm" style={{ color: t.textMuted }}>
                  {isRegenerate
                    ? "Loading your latest photos from Profile and composing a new sheet."
                    : "Composing your reference angles and measurements."}
                </p>
                <div className="mt-6 h-2 w-64 overflow-hidden rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
                  <div
                    className="h-full transition-all duration-200"
                    style={{ width: `${forgeProgress}%`, background: t.progress }}
                  />
                </div>
                <p className="mt-2 font-mono text-xs" style={{ color: t.textDim }}>
                  {forgeProgress}%
                </p>
              </div>
            )}

            {(step === "preview" || step === "sealing") && generated && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold">{isRegenerate ? "New sheet preview" : "Preview"}</h3>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={downloading || step === "sealing"}
                      onClick={() => void handleDownload()}
                      className="rounded-lg border border-white/15 px-3 py-1.5 text-sm font-medium transition hover:bg-white/10 disabled:opacity-50"
                    >
                      {downloading ? "Preparing…" : "Download PNG"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        setStep("idle");
                        setGenerated(null);
                        setIsRegenerate(false);
                        replaceVaultAssetIdRef.current = null;
                      }}
                      className="rounded-lg px-3 py-1.5 text-sm"
                      style={{ color: t.textMuted }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
                <div ref={previewRef}>
                  <CharacterSheetPreview
                    data={generated}
                    aiImageUrl={generated.mode === "ai" ? generated.imageUrl : undefined}
                  />
                </div>
                <div className="rounded-lg border p-4" style={{ borderColor: t.border, backgroundColor: t.panel }}>
                  <label className="mb-1.5 block text-xs font-medium" style={{ color: t.textMuted }}>
                    Vault password (for sealing only)
                  </label>
                  <input
                    type="password"
                    value={vaultPassword}
                    onChange={(e) => setVaultPassword(e.target.value)}
                    placeholder="Encrypt before storing in Vault"
                    className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none"
                    style={{ borderColor: t.border, color: t.text }}
                  />
                </div>
                {error && <p className="text-sm text-red-400">{error}</p>}
                <button
                  type="button"
                  disabled={step === "sealing"}
                  onClick={() => void sealToVault()}
                  className="w-full rounded-lg bg-white py-3 text-sm font-semibold text-neutral-950 disabled:opacity-60"
                >
                  {step === "sealing"
                    ? isRegenerate
                      ? "Replacing sealed copy…"
                      : "Sealing to Vault…"
                    : isRegenerate
                      ? "Replace sealed copy in Vault"
                      : "Seal encrypted copy in Vault"}
                </button>
              </div>
            )}

            {step === "done" && (
              <div className="flex flex-col items-center py-12 text-center">
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-full border text-xl"
                  style={{ borderColor: "rgba(74,222,128,0.4)", color: t.success }}
                >
                  ✓
                </div>
                <h3 className="mt-4 text-xl font-semibold">
                  {isRegenerate ? "Character sheet updated" : "Sealed in Vault"}
                </h3>
                <p className="mt-2 max-w-sm text-sm" style={{ color: t.textMuted }}>
                  {isRegenerate
                    ? "Your Vault now has the new encrypted sheet. View & download uses the latest version."
                    : "Download the PNG anytime from the asset page to share with brands. Your Vault copy stays encrypted."}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setStep("idle");
                    setGenerated(null);
                    setIsRegenerate(false);
                    replaceVaultAssetIdRef.current = null;
                  }}
                  className="mt-6 rounded-lg border border-white/15 px-5 py-2 text-sm font-medium"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
