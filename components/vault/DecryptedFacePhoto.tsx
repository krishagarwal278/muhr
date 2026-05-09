"use client";

import { useEffect, useMemo, useState } from "react";
import { decryptToBlobWithVaultPassword, type VaultEncryptionMetadataV1 } from "@/lib/vault/crypto";

export function DecryptedFacePhoto({
  signedUrl,
  meta,
}: {
  signedUrl: string;
  meta: VaultEncryptionMetadataV1;
}) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const initialPassword = useMemo(() => {
    if (typeof window === "undefined") return "";
    return (
      window.localStorage.getItem("muhr_vault_password") ||
      ""
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    let activeObjectUrl: string | null = null;

    (async () => {
      try {
        const password = initialPassword;
        if (!password || password.trim().length < 8) {
          setError("Missing Vault password on this device.");
          return;
        }

        const res = await fetch(signedUrl);
        if (!res.ok) {
          setError("Could not load encrypted asset.");
          return;
        }
        const ciphertext = await res.arrayBuffer();
        const blob = await decryptToBlobWithVaultPassword({ ciphertext, password, meta });
        activeObjectUrl = URL.createObjectURL(blob);
        if (!cancelled) setObjectUrl(activeObjectUrl);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not decrypt asset.");
      }
    })();

    return () => {
      cancelled = true;
      if (activeObjectUrl) URL.revokeObjectURL(activeObjectUrl);
    };
  }, [signedUrl, meta, initialPassword]);

  if (error) {
    return (
      <div className="flex aspect-square w-full items-center justify-center bg-black text-center">
        <p className="max-w-sm px-6 text-sm text-zinc-300">{error}</p>
      </div>
    );
  }

  if (!objectUrl) {
    return (
      <div className="flex aspect-square w-full items-center justify-center bg-black">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
      </div>
    );
  }

  // Use <img> since we now have a blob: URL.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={objectUrl} alt={meta.original_file_name} className="h-full w-full object-contain" />;
}

