"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function DeleteAssetButton({ assetId }: { assetId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex-1">
      <button
        type="button"
        disabled={pending}
        className="w-full rounded-lg bg-red-500/10 py-2.5 text-sm font-medium text-red-400 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
        onClick={() => {
          const ok = window.confirm("Delete this asset? This cannot be undone.");
          if (!ok) return;

          setError(null);
          startTransition(async () => {
            const res = await fetch(`/api/vault/${assetId}`, { method: "DELETE" });
            if (!res.ok) {
              const data = await res.json().catch(() => ({}));
              setError(typeof data?.error === "string" ? data.error : "Could not delete asset.");
              return;
            }

            router.push("/vault");
            router.refresh();
          });
        }}
      >
        {pending ? "Deleting…" : "Delete asset"}
      </button>
      {error ? <p className="mt-2 text-xs text-red-300/90">{error}</p> : null}
    </div>
  );
}

