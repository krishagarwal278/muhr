"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { VaultAsset } from "@/types";
import { apiErrorMessage } from "@/lib/api/response";
import { outlineButtonVariants } from "@/components/ui/button-recipes";
import { cx } from "@/lib/cx";

type AssetWithUrl = VaultAsset & { signed_url?: string | null };

export function ArchiveVaultAssetButton({
  asset,
  onComplete,
  className,
}: {
  asset: AssetWithUrl;
  onComplete?: () => void;
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (asset.asset_type === "character_sheet" || asset.encryption_key_id) {
    return null;
  }

  function finish() {
    onComplete?.();
    router.push("/vault/archive");
    router.refresh();
  }

  return (
    <div className={cx("space-y-2", className)}>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          const ok = window.confirm("Move this photo to Archive?");
          if (!ok) return;
          setError(null);
          startTransition(async () => {
            const res = await fetch(`/api/vault/${asset.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "archive" }),
            });
            const json = await res.json().catch(() => null);
            if (!res.ok) {
              setError(apiErrorMessage(json, "Could not move to archive."));
              return;
            }
            finish();
          });
        }}
        className={cx(outlineButtonVariants(), "w-full")}
      >
        {pending ? "Moving…" : "Move to archive"}
      </button>
      {error ? <p className="text-xs text-red-700">{error}</p> : null}
    </div>
  );
}
