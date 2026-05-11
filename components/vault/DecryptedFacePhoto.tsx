"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { decryptToBlobWithVaultPassword, type VaultEncryptionMetadataV1 } from "@/lib/vault/crypto";

/** Legacy key; remove if present so plaintext passwords are not left in storage. */
const LEGACY_VAULT_PASSWORD_KEY = "muhr_vault_password";

export function DecryptedFacePhoto({
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
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

  if (objectUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- blob URL from decrypted bytes
    return <img src={objectUrl} alt={meta.original_file_name} className="h-full w-full object-contain" />;
  }

  return (
    <div className="flex aspect-square w-full flex-col items-center justify-center gap-4 bg-black px-6 text-center">
      <p className="max-w-sm text-sm text-zinc-300">
        Enter your vault password to decrypt this asset. It is kept in memory only for this page and is not stored in
        the browser.
      </p>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") void handleDecrypt();
        }}
        placeholder="Vault password"
        autoComplete="off"
        className="w-full max-w-xs rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-white/30 focus:outline-none"
        disabled={busy}
      />
      {error && <p className="max-w-sm text-sm text-red-300">{error}</p>}
      <button
        type="button"
        onClick={() => void handleDecrypt()}
        disabled={busy}
        className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-zinc-200 disabled:opacity-50"
      >
        {busy ? "Decrypting…" : "Decrypt preview"}
      </button>
    </div>
  );
}
