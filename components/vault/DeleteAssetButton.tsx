"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { apiErrorMessage } from "@/lib/api/response";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function DeleteAssetButton({
  assetId,
  label = "Delete asset",
  variant = "default",
  redirectHref = "/vault",
  confirmDescription = "This asset will be permanently removed. This cannot be undone.",
  onDeleted,
}: {
  assetId: string;
  label?: string;
  variant?: "default" | "compact" | "icon";
  /** Set to `null` to stay on the current page after delete. */
  redirectHref?: string | null;
  confirmDescription?: string;
  onDeleted?: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const buttonClass =
    variant === "icon"
      ? "flex h-8 w-8 items-center justify-center rounded-lg border border-red-200/80 bg-white/95 text-red-700 shadow-sm transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
      : variant === "compact"
        ? "w-full rounded-lg border border-red-200 bg-red-50 py-1.5 text-xs font-medium text-red-800 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
        : "w-full rounded-lg bg-red-500/10 py-2.5 text-sm font-medium text-red-400 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60";

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/vault/${assetId}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setError(apiErrorMessage(json, "Could not delete asset."));
        setDialogOpen(false);
        return;
      }

      setDialogOpen(false);
      onDeleted?.();
      if (redirectHref !== null) {
        router.push(redirectHref ?? "/vault");
      }
      router.refresh();
    });
  }

  return (
    <>
      <div className={variant === "default" ? "flex-1" : undefined}>
        <button
          type="button"
          disabled={pending}
          className={buttonClass}
          title="Delete permanently"
          onClick={() => setDialogOpen(true)}
        >
          {variant === "icon" ? (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
              />
            </svg>
          ) : pending ? (
            "Deleting…"
          ) : (
            label
          )}
        </button>
        {error ? (
          <p className={variant === "compact" ? "mt-1 text-xs text-red-700" : "mt-2 text-xs text-red-300/90"}>
            {error}
          </p>
        ) : null}
      </div>

      <ConfirmDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Delete permanently?"
        description={confirmDescription}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        destructive
        pending={pending}
        onConfirm={handleConfirm}
      />
    </>
  );
}
