"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import Link from "next/link";
import type { KycStatus } from "@/types";
import { VoiceSampleRecorder } from "@/components/vault/VoiceSampleRecorder";
import { solidButtonVariants } from "@/components/ui/button-recipes";
import { cx } from "@/lib/cx";

function VaultBackLink({ backGuardRef }: { backGuardRef: RefObject<(() => boolean) | null> }) {
  return (
    <Link
      href="/vault"
      className="inline-flex items-center gap-1 text-sm font-medium text-neutral-700 hover:text-neutral-950"
      onClick={(e) => {
        if (backGuardRef.current?.()) e.preventDefault();
      }}
    >
      ← Back to Vault
    </Link>
  );
}

export default function VaultVoicePage() {
  const [kycStatus, setKycStatus] = useState<KycStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const backGuardRef = useRef<(() => boolean) | null>(null);

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
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="mx-auto flex max-w-3xl items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-black/15 border-t-neutral-950" />
      </div>
    );
  }

  if (kycStatus !== "verified") {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <VaultBackLink backGuardRef={backGuardRef} />
        <h1 className="text-2xl font-semibold tracking-tight">Verification required</h1>
        <p className="text-sm text-neutral-700">
          Verify your identity before you can record or upload voice samples.
        </p>
        <Link href="/profile#identity-verification" className={cx(solidButtonVariants(), "inline-flex")}>
          Go to verification
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <VaultBackLink backGuardRef={backGuardRef} />
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-neutral-950">Record a voice sample</h1>
        <p className="mt-1.5 text-sm text-neutral-700">
          Read the scrolling script or upload a clip (45 seconds to 2 minutes). Your audio is encrypted in
          the Vault and used only when you approve voice licenses.
        </p>
      </div>
      <VoiceSampleRecorder onRegisterBackGuard={(guard) => { backGuardRef.current = guard; }} />
    </div>
  );
}
