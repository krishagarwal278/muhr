"use client";

import { useEffect, useId, useRef } from "react";
import {
  dangerButtonVariants,
  solidButtonVariants,
  subtleButtonVariants,
} from "@/components/ui/button-recipes";
import { Modal } from "@/components/ui/modal";
import { cx } from "@/lib/cx";

export function ConfirmDialog({
  open,
  onClose,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  pending = false,
  destructive = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  pending?: boolean;
  destructive?: boolean;
}) {
  const titleId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} labelledBy={titleId} pending={pending}>
      <h2 id={titleId} className="text-base font-semibold text-neutral-950">
        {title}
      </h2>
      {description ? <p className="mt-2 text-sm text-neutral-600">{description}</p> : null}
      <div className="mt-5 flex justify-end gap-2">
        <button
          ref={cancelRef}
          type="button"
          disabled={pending}
          onClick={() => onClose()}
          className={subtleButtonVariants()}
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => onConfirm()}
          className={cx(destructive ? dangerButtonVariants({ size: "md" }) : solidButtonVariants())}
        >
          {pending ? "Please wait…" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
