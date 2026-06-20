"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { decryptToBlobWithVaultPassword, type VaultEncryptionMetadataV1 } from "@/lib/vault/crypto";
import { solidButtonVariants, outlineButtonVariants } from "@/components/ui/button-recipes";
import { cx } from "@/lib/cx";

const LEGACY_VAULT_PASSWORD_KEY = "muhr_vault_password";

export function DecryptedDocumentDownload({
  signedUrl,
  meta,
}: {
  signedUrl: string;
  meta: VaultEncryptionMetadataV1;
}) {
  const [password, setPassword] = useState("");
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    try {
      window.localStorage.removeItem(LEGACY_VAULT_PASSWORD_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const handleDecrypt = useCallback(async () => {
    const pwd = password.trim();
    if (pwd.length < 8) {
      setError("Vault password must be at least 8 characters.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(signedUrl);
      if (!res.ok) {
        setError("Could not load encrypted document.");
        return;
      }
      const ciphertext = await res.arrayBuffer();
      const blob = await decryptToBlobWithVaultPassword({ ciphertext, password: pwd, meta });
      const url = URL.createObjectURL(blob);
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = url;
      setObjectUrl(url);
      setPassword("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not decrypt document.");
    } finally {
      setBusy(false);
    }
  }, [password, signedUrl, meta]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  if (objectUrl) {
    return (
      <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-emerald-800">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
          Document decrypted
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <a
            href={objectUrl}
            download={meta.original_file_name}
            className={cx(solidButtonVariants(), "flex-1 justify-center gap-2")}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Download
          </a>
          {meta.original_mime_type === "application/pdf" && (
            <a
              href={objectUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cx(outlineButtonVariants(), "flex-1 justify-center gap-2")}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
              View PDF
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-black/10 bg-neutral-50 p-4">
      <p className="text-sm text-neutral-700">
        This document is encrypted. Enter your Vault password to download.
      </p>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && password.trim().length >= 8) {
            void handleDecrypt();
          }
        }}
        placeholder="Vault password"
        autoComplete="off"
        className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm"
      />
      {error && <p className="text-sm text-red-800">{error}</p>}
      <button
        type="button"
        onClick={() => void handleDecrypt()}
        disabled={busy}
        className={cx(solidButtonVariants(), "w-full justify-center gap-2")}
      >
        {busy ? (
          "Decrypting…"
        ) : (
          <>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 1 1 9 0v3.75M3.75 21.75h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H3.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
            Decrypt & download
          </>
        )}
      </button>
    </div>
  );
}
