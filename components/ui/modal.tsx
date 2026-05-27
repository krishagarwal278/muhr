"use client";

import { useEffect, type ReactNode } from "react";
import { cx } from "@/lib/cx";

export function Modal({
  open,
  onClose,
  children,
  labelledBy,
  dismissible = true,
  pending = false,
  overlayClassName,
  panelClassName,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  labelledBy?: string;
  dismissible?: boolean;
  pending?: boolean;
  overlayClassName?: string;
  panelClassName?: string;
}) {
  useEffect(() => {
    if (!open || !dismissible) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !pending) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, pending, dismissible]);

  if (!open) return null;

  return (
    <div
      className={cx(
        "fixed inset-0 z-modal flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]",
        overlayClassName,
      )}
      role="presentation"
    >
      {dismissible ? (
        <button
          type="button"
          aria-label="Dismiss"
          className="absolute inset-0"
          disabled={pending}
          onClick={onClose}
        />
      ) : null}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={cx(
          "relative w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-5 shadow-lg",
          panelClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}
