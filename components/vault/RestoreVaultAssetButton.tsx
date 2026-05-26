"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { apiErrorMessage } from "@/lib/api/response";
import { solidButtonVariants } from "@/components/ui/button-recipes";
import { cx } from "@/lib/cx";

export function RestoreVaultAssetButton({
  assetId,
  onComplete,
  className,
  compact = false,
}: {
  assetId: string;
  onComplete?: () => void;
  className?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className={className}>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const res = await fetch(`/api/vault/${assetId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "restore" }),
            });
            const json = await res.json().catch(() => null);
            if (!res.ok) {
              setError(apiErrorMessage(json, "Could not restore."));
              return;
            }
            onComplete?.();
            router.refresh();
          });
        }}
        className={cx(
          compact
            ? "flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-black/10 bg-neutral-50 text-xs font-medium text-neutral-900 hover:bg-neutral-100 disabled:opacity-60"
            : cx(solidButtonVariants({ size: "sm" }), "w-full sm:w-auto"),
        )}
        title="Restore to vault"
      >
        {compact ? (
          <>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
            </svg>
            {pending ? "…" : "Restore"}
          </>
        ) : pending ? (
          "Restoring…"
        ) : (
          "Restore to vault"
        )}
      </button>
      {error ? <p className="mt-1 text-xs text-red-700">{error}</p> : null}
    </div>
  );
}
