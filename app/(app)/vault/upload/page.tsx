"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import type { KycStatus } from "@/types";
import { encryptFileWithVaultPassword } from "@/lib/vault/crypto";
import { apiErrorMessage } from "@/lib/api/response";
import { vaultUploadFromApiJson } from "@/lib/api/vaultPayload";
import { outlineButtonVariants, solidButtonVariants } from "@/components/ui/button-recipes";
import { cx } from "@/lib/cx";

type AssetType = "face_photo" | "voice_sample" | "document" | null;
type UploadStep = "select" | "upload" | "complete";

export default function VaultUploadPage() {
  const [assetType, setAssetType] = useState<AssetType>(null);
  const [step, setStep] = useState<UploadStep>("select");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState("");
  const [kycStatus, setKycStatus] = useState<KycStatus | null>(null);
  const [identityLoading, setIdentityLoading] = useState(true);
  const [vaultPassword, setVaultPassword] = useState("");

  useEffect(() => {
    try {
      window.localStorage.removeItem("muhr_vault_password");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/identity");
        const data = res.ok ? await res.json() : {};
        const identity = data.data ?? data;
        if (!cancelled) {
          setKycStatus((identity.kycStatus as KycStatus) ?? "unverified");
        }
      } finally {
        if (!cancelled) setIdentityLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const kycVerified = kycStatus === "verified";

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...newFiles]);
      
      // Create previews for images
      newFiles.forEach((file) => {
        if (file.type.startsWith("image/")) {
          const reader = new FileReader();
          reader.onload = (e) => {
            setPreviews((prev) => [...prev, e.target?.result as string]);
          };
          reader.readAsDataURL(file);
        }
      });
    }
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  }, []);

  async function handleUpload() {
    if (files.length === 0 || !assetType) return;

    const encryptUpload = assetType !== "face_photo";
    if (encryptUpload && (!vaultPassword || vaultPassword.trim().length < 8)) {
      setError("Set a Vault password (min 8 chars) to encrypt this asset type.");
      return;
    }

    setUploading(true);
    setError("");

    let successCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      let fileToUpload: File = file;
      let encMeta: Awaited<ReturnType<typeof encryptFileWithVaultPassword>>["meta"] | null = null;

      if (encryptUpload) {
        try {
          const encrypted = await encryptFileWithVaultPassword(file, vaultPassword);
          fileToUpload = encrypted.encryptedFile;
          encMeta = encrypted.meta;
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Failed to encrypt file";
          console.error("Encrypt error:", e);
          setError(msg);
          break;
        }
      }

      const formData = new FormData();
      formData.append("file", fileToUpload);
      formData.append("asset_type", assetType);
      if (encMeta) {
        formData.append("encryption_version", String(encMeta.encryption_version));
        formData.append("encryption_alg", encMeta.encryption_alg);
        formData.append("encryption_iv", encMeta.encryption_iv_b64);
        formData.append("wrapped_data_key", encMeta.wrapped_data_key_b64);
        formData.append("wrapped_key_iv", encMeta.wrapped_key_iv_b64);
        formData.append("wrapped_key_salt", encMeta.wrapped_key_salt_b64);
        formData.append("original_file_name", encMeta.original_file_name);
        formData.append("original_mime_type", encMeta.original_mime_type);
      }
      
      try {
        const res = await fetch("/api/vault/upload", {
          method: "POST",
          body: formData,
        });
        
        const json = await res.json().catch(() => null);
        const upload = vaultUploadFromApiJson(json);

        if (res.ok && upload?.asset?.id) {
          successCount++;
        } else {
          const msg = apiErrorMessage(json, upload?.message ?? "Upload failed");
          console.error("Upload failed:", msg);
          setError(msg);
        }
      } catch (err) {
        console.error("Upload error:", err);
      }
      
      setUploadProgress(Math.round(((i + 1) / files.length) * 100));
    }
    
    setUploading(false);

    if (successCount === files.length) {
      setStep("complete");
    } else if (successCount > 0) {
      setError(`${successCount} of ${files.length} files uploaded successfully.`);
      setStep("complete");
    } else {
      setError("Failed to upload files. Please try again.");
    }
  }

  function handleContinue() {
    if (step === "select" && assetType) {
      setStep("upload");
    } else if (step === "upload" && files.length > 0) {
      handleUpload();
    }
  }

  if (identityLoading) {
    return (
      <div className="mx-auto flex max-w-2xl items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-black/15 border-t-neutral-950" />
      </div>
    );
  }

  if (!kycVerified) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <Link
            href="/vault"
            className="inline-flex items-center gap-1 text-sm font-medium text-neutral-700 hover:text-neutral-950"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            Back to Vault
          </Link>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-neutral-950">Verification required</h1>
          <p className="mt-1.5 text-sm text-neutral-700">
            Complete identity verification before uploading vault assets.
          </p>
        </div>
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-amber-200 bg-amber-100">
            <svg className="h-7 w-7 text-amber-800" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
          </div>
          <p className="text-sm font-medium leading-relaxed text-amber-950">
            Vault uploads are unlocked after your identity and liveness checks succeed.
          </p>
          <Link
            href="/profile#identity-verification"
            className={cx(solidButtonVariants({ size: "lg" }), "mt-6 inline-flex")}
          >
            Go to verification
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/vault"
          className="inline-flex items-center gap-1 text-sm font-medium text-neutral-700 hover:text-neutral-950"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Back to Vault
        </Link>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-neutral-950">Upload assets</h1>
        <p className="mt-1.5 text-sm text-neutral-700">Add identity assets to your secure vault</p>
      </div>

      {/* Progress indicator */}
      <div className="flex items-center gap-2">
        {["select", "upload", "complete"].map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                step === s
                  ? "bg-white text-black"
                  : ["select", "upload", "complete"].indexOf(step) > i
                    ? "bg-black/5 text-neutral-950"
                    : "bg-black/[0.03] text-neutral-900/40"
              }`}
            >
              {i + 1}
            </div>
            {i < 2 && (
              <div
                className={`h-px w-8 ${
                  ["select", "upload", "complete"].indexOf(step) > i
                    ? "bg-black/15"
                    : "bg-black/10"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="rounded-xl border border-black/10 bg-white/70 p-6">
        {step === "select" && (
          <div className="space-y-4">
            <h2 className="text-lg font-medium">What would you like to upload?</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                onClick={() => setAssetType("face_photo")}
                className={`rounded-xl border p-5 text-left transition ${
                  assetType === "face_photo"
                    ? "border-black/15 bg-black/5"
                    : "border-black/10 bg-white/70 hover:border-black/15 hover:bg-white"
                }`}
              >
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-black/[0.03]">
                  <svg className="h-5 w-5 text-neutral-900/70" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                  </svg>
                </div>
                <h3 className="font-medium">Face photos</h3>
                <p className="mt-1 text-sm text-neutral-700">Stored in plain view in your Vault (not encrypted)</p>
              </button>
              <Link
                href="/vault/voice"
                className="rounded-xl border border-black/10 bg-white/70 p-5 text-left transition hover:border-black/15 hover:bg-white"
              >
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-black/[0.03]">
                  <svg className="h-5 w-5 text-neutral-900/70" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                  </svg>
                </div>
                <h3 className="font-medium">Voice samples</h3>
                <p className="mt-1 text-sm text-neutral-700">Record with autoscroll script (encrypted)</p>
              </Link>
              <button
                onClick={() => setAssetType("document")}
                className={`rounded-xl border p-5 text-left transition ${
                  assetType === "document"
                    ? "border-black/15 bg-black/5"
                    : "border-black/10 bg-white/70 hover:border-black/15 hover:bg-white"
                }`}
              >
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-black/[0.03]">
                  <svg className="h-5 w-5 text-neutral-900/70" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                  </svg>
                </div>
                <h3 className="font-medium">Documents</h3>
                <p className="mt-1 text-sm text-neutral-700">Contracts, agreements, releases (encrypted)</p>
              </button>
            </div>
          </div>
        )}

        {step === "upload" && (
          <div className="space-y-4">
            <h2 className="text-lg font-medium">
              {assetType === "document" ? "Upload documents" : "Upload photos"}
            </h2>
            {assetType === "face_photo" ? (
              <p className="rounded-lg border border-violet-200/80 bg-violet-50/80 px-3 py-2 text-xs text-violet-950">
                Face photos are saved unencrypted so you can preview them in Vault. Only your{" "}
                <strong>character sheet</strong> is encrypted when you seal it from the Vault page.
              </p>
            ) : (
              <>
                {assetType === "document" && (
                  <p className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-700">
                    Upload likeness-related documents such as contracts, talent releases, or licensing agreements.
                    Documents are encrypted and can be shared alongside your other vault assets.
                  </p>
                )}
                <div className="rounded-xl border border-black/10 bg-white/70 p-4">
                <label className="block text-sm font-semibold text-neutral-800">Vault password</label>
                <p className="mt-1 text-xs leading-relaxed text-neutral-700">
                  Used to encrypt files before upload. If you lose it, Muhr can’t recover your assets.
                </p>
                <input
                  type="password"
                  value={vaultPassword}
                  onChange={(e) => setVaultPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  autoComplete="off"
                  className="mt-3 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-neutral-950 placeholder:text-neutral-500/70 focus:border-black/15 focus:outline-none"
                  disabled={uploading}
                />
                </div>
              </>
            )}
            <div className="rounded-xl border-2 border-dashed border-black/15 bg-white/60 p-8 text-center">
              <input
                type="file"
                multiple
                accept={assetType === "document" ? ".pdf,.doc,.docx,application/pdf" : "image/jpeg,image/png,image/webp"}
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
                disabled={uploading}
              />
              <label htmlFor="file-upload" className={uploading ? "cursor-not-allowed" : "cursor-pointer"}>
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-black/[0.03]">
                  <svg className="h-6 w-6 text-neutral-900/50" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                  </svg>
                </div>
                <p className="text-sm text-neutral-800">
                  Drag and drop or <span className="font-medium text-neutral-950 underline">browse files</span>
                </p>
                <p className="mt-1 text-xs text-neutral-600">
                  {assetType === "document" ? "PDF, DOC, DOCX up to 10MB each" : "JPG, PNG, WebP up to 10MB each"}
                </p>
              </label>
            </div>
            
            {files.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium">{files.length} file{files.length > 1 ? "s" : ""} selected</p>
                {assetType === "document" ? (
                  <div className="space-y-2">
                    {files.map((file, i) => (
                      <div key={i} className="group flex items-center gap-3 rounded-lg border border-black/10 bg-neutral-50 p-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-100">
                          <svg className="h-5 w-5 text-neutral-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-neutral-900">{file.name}</p>
                          <p className="text-xs text-neutral-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                        {!uploading && (
                          <button
                            onClick={() => removeFile(i)}
                            className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 transition hover:bg-neutral-200 hover:text-neutral-600"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                    {files.map((file, i) => (
                      <div key={i} className="group relative aspect-square overflow-hidden rounded-lg border border-black/10 bg-neutral-50">
                        {previews[i] ? (
                          <Image
                            src={previews[i]}
                            alt={file.name}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <svg className="h-6 w-6 text-neutral-900/38" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                            </svg>
                          </div>
                        )}
                        {!uploading && (
                          <button
                            onClick={() => removeFile(i)}
                            className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {uploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-700">Uploading...</span>
                  <span className="font-medium">{uploadProgress}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-black/10">
                  <div
                    className="h-full rounded-full bg-neutral-950 transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-900">{error}</p>
            )}
          </div>
        )}

        {step === "complete" && (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10">
              <svg className="h-7 w-7 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
            <h2 className="text-lg font-medium">Assets uploaded successfully</h2>
            <p className="text-sm text-neutral-700">
              {assetType === "document" 
                ? "Your documents are now encrypted and stored in your vault." 
                : "Your photos are now securely stored in your vault."}
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <Link href="/vault" className={solidButtonVariants()}>
                View vault
              </Link>
              <button
                onClick={() => {
                  setStep("select");
                  setAssetType(null);
                  setFiles([]);
                  setPreviews([]);
                  setUploadProgress(0);
                }}
                className={outlineButtonVariants()}
              >
                Upload more
              </button>
            </div>
          </div>
        )}

        {step !== "complete" && (
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleContinue}
              disabled={(step === "select" && !assetType) || (step === "upload" && files.length === 0) || uploading}
              className={solidButtonVariants()}
            >
              {uploading ? "Uploading..." : step === "upload" ? "Upload" : "Continue"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
