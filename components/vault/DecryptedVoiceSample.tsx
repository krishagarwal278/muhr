"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { decryptToBlobWithVaultPassword, type VaultEncryptionMetadataV1 } from "@/lib/vault/crypto";
import { primaryButtonVariants, solidButtonVariants } from "@/components/ui/button-recipes";
import { cx } from "@/lib/cx";

const LEGACY_VAULT_PASSWORD_KEY = "muhr_vault_password";

export function DecryptedVoiceSample({
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
        setError("Could not load encrypted asset.");
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
      setError(e instanceof Error ? e.message : "Could not decrypt asset.");
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
      <div className="border-b border-black/10 bg-neutral-950 px-4 py-8">
        <audio src={objectUrl} controls className="w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-3 border-b border-black/10 bg-neutral-50 px-6 py-8">
      <p className="text-sm text-neutral-700">This voice sample is encrypted. Enter your Vault password to listen.</p>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Vault password"
        autoComplete="off"
        className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm"
      />
      {error ? <p className="text-sm text-red-800">{error}</p> : null}
      <button
        type="button"
        onClick={() => void handleDecrypt()}
        disabled={busy}
        className={cx(busy ? primaryButtonVariants() : solidButtonVariants())}
      >
        {busy ? "Decrypting…" : "Decrypt & play"}
      </button>
    </div>
  );
}
