"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { decryptToBlobWithVaultPassword, type VaultEncryptionMetadataV1 } from "@/lib/vault/crypto";
import { downloadBlob } from "@/lib/character-sheet/captureToBlob";
import { solidButtonVariants } from "@/components/ui/button-recipes";
import { cx } from "@/lib/cx";

export function CharacterSheetExport({
  signedUrl,
  meta,
  displayFileName = "muhr-character-sheet.png",
}: {
  signedUrl: string;
  meta: VaultEncryptionMetadataV1;
  displayFileName?: string;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const decryptedBlobRef = useRef<Blob | null>(null);

  useEffect(() => {
    return () => {
      decryptedBlobRef.current = null;
    };
  }, []);

  const decrypt = useCallback(async (): Promise<Blob | null> => {
    const pwd = password.trim();
    if (pwd.length < 8) {
      setError("Vault password must be at least 8 characters.");
      return null;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(signedUrl);
      if (!res.ok) {
        setError("Could not load encrypted character sheet.");
        return null;
      }
      const ciphertext = await res.arrayBuffer();
      const blob = await decryptToBlobWithVaultPassword({ ciphertext, password: pwd, meta });
      decryptedBlobRef.current = blob;
      return blob;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not decrypt.");
      return null;
    } finally {
      setBusy(false);
    }
  }, [password, signedUrl, meta]);

  async function handleDownload() {
    let blob = decryptedBlobRef.current;
    if (!blob) {
      blob = await decrypt();
    }
    if (!blob) return;
    downloadBlob(blob, displayFileName);
  }

  return (
    <div className="rounded-xl border border-black/10 bg-neutral-50 p-4">
      <p className="text-sm font-medium text-neutral-950">Export for brands</p>
      <p className="mt-1 text-xs text-neutral-600">
        Decrypt and download your character sheet PNG to attach in email or messages.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Vault password"
          autoComplete="off"
          className="flex-1 rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-black/25"
          disabled={busy}
        />
        <button
          type="button"
          onClick={() => void handleDownload()}
          disabled={busy}
          className={cx(solidButtonVariants(), "shrink-0")}
        >
          {busy ? "Decrypting…" : "Download PNG"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
