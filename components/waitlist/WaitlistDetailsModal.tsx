"use client";

import { useEffect, useRef } from "react";
import { outlineButtonVariants, solidButtonVariants } from "@/components/ui/button-recipes";

interface WaitlistDetailsModalProps {
  open: boolean;
  email: string;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (instagram: string, profession: string) => void;
}

export function WaitlistDetailsModal({
  open,
  email,
  loading,
  error,
  onClose,
  onSubmit,
}: WaitlistDetailsModalProps) {
  const instagramRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) instagramRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="waitlist-details-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        aria-label="Close"
        onClick={onClose}
      />
      <form
        className="relative z-10 w-full max-w-md rounded-2xl border border-black/10 bg-white p-6 shadow-xl"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          onSubmit(String(fd.get("instagram") ?? ""), String(fd.get("profession") ?? ""));
        }}
      >
        <h2 id="waitlist-details-title" className="text-lg font-semibold text-neutral-950">
          A few more details
        </h2>
        <p className="mt-1 text-sm text-neutral-600">
          Help us learn about you — we saved <span className="font-medium text-neutral-900">{email}</span>.
        </p>

        {error && (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
            {error}
          </p>
        )}

        <div className="mt-4 space-y-4">
          <div>
            <label htmlFor="waitlist-instagram" className="mb-1.5 block text-sm font-medium text-neutral-900">
              Instagram profile
            </label>
            <input
              id="waitlist-instagram"
              name="instagram"
              ref={instagramRef}
              required
              placeholder="@yourhandle"
              maxLength={120}
              className="w-full rounded-lg border border-black/10 px-4 py-2.5 text-sm text-neutral-950 outline-none focus:border-black/20"
            />
          </div>
          <div>
            <label htmlFor="waitlist-profession" className="mb-1.5 block text-sm font-medium text-neutral-900">
              Profession
            </label>
            <input
              id="waitlist-profession"
              name="profession"
              required
              placeholder="e.g. Actor, model, creator"
              maxLength={120}
              className="w-full rounded-lg border border-black/10 px-4 py-2.5 text-sm text-neutral-950 outline-none focus:border-black/20"
            />
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className={outlineButtonVariants()}
          >
            Skip for now
          </button>
          <button
            type="submit"
            disabled={loading}
            className={solidButtonVariants()}
          >
            {loading ? "Saving…" : "Continue"}
          </button>
        </div>
      </form>
    </div>
  );
}
