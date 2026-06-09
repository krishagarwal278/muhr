"use client";

import { useState } from "react";
import { MUHR_CONTACT_EMAIL } from "@/lib/app/contactEmail";
import { CANCELLATION_REASON_OPTIONS, type CancellationReasonKey } from "@/lib/license/cancellationReasons";
import {
  dangerButtonVariants,
  solidButtonVariants,
  subtleButtonVariants,
} from "@/components/ui/button-recipes";
import { Modal } from "@/components/ui/modal";
import { cx } from "@/lib/cx";
import type { LicenseRequestRow } from "@/types/license";

type Step = "confirm" | "reason" | "done";

const SUPPORT = MUHR_CONTACT_EMAIL;

export function LicenseCancelDialog({
  requestId,
  brandName,
  onClose,
  onCancelled,
}: {
  requestId: string;
  brandName: string;
  onClose: () => void;
  onCancelled: (next: LicenseRequestRow) => void;
}) {
  const [step, setStep] = useState<Step>("confirm");
  const [reason, setReason] = useState<CancellationReasonKey | "">("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailWarnings, setEmailWarnings] = useState<string[] | null>(null);

  async function submit() {
    if (!reason) return;
    if (reason === "other" && note.trim().length < 3) {
      setError("Please add a few words under Other.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/licenses/incoming/${requestId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, note: note.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Cancellation failed");
        return;
      }
      if (data.request) onCancelled(data.request as LicenseRequestRow);
      if (Array.isArray(data.email_warnings) && data.email_warnings.length) {
        setEmailWarnings(data.email_warnings as string[]);
      }
      setStep("done");
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      labelledBy="cancel-license-title"
      pending={busy}
      panelClassName="max-h-[90vh] max-w-lg overflow-y-auto"
    >
      {step === "confirm" ? (
        <div className="space-y-4">
          <h2 id="cancel-license-title" className="text-base font-semibold text-neutral-950">
            Cancel this license?
          </h2>
          <p className="text-sm text-neutral-700">
            This withdraws the accepted request with{" "}
            <span className="font-medium text-neutral-950">{brandName}</span>. Status becomes{" "}
            <span className="font-medium text-amber-900">Withdrawn</span> immediately, we record a
            reason for our team, and the brand is emailed to cease use. Our team may follow up within
            3–5 business days.
          </p>
          <ul className="list-disc space-y-1 pl-4 text-sm text-neutral-700">
            <li>Brand access through this Muhr request ends now</li>
            <li>You can still export any contract draft from the workspace until you close this</li>
            <li>
              Questions:{" "}
              <a href={`mailto:${SUPPORT}`} className="font-medium text-emerald-800 hover:underline">
                {SUPPORT}
              </a>
            </li>
          </ul>
          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className={subtleButtonVariants()}>
              Keep license
            </button>
            <button
              type="button"
              onClick={() => setStep("reason")}
              className={dangerButtonVariants({ size: "md" })}
            >
              Yes, cancel
            </button>
          </div>
        </div>
      ) : null}

      {step === "reason" ? (
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-neutral-950">Why are you cancelling?</h2>
          <p className="text-sm text-neutral-600">
            We use this to improve Muhr and for support review only.
          </p>
          <fieldset className="space-y-2">
            {CANCELLATION_REASON_OPTIONS.map((opt) => (
              <label
                key={opt.key}
                className={cx(
                  "flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm transition",
                  reason === opt.key
                    ? "border-neutral-900 bg-neutral-50 text-neutral-950"
                    : "border-black/10 bg-white text-neutral-800 hover:border-black/20 hover:bg-neutral-50",
                )}
              >
                <input
                  type="radio"
                  name="cancel-reason"
                  className="mt-0.5 accent-neutral-950"
                  checked={reason === opt.key}
                  onChange={() => {
                    setReason(opt.key);
                    setError(null);
                  }}
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </fieldset>
          {reason === "other" ? (
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Briefly describe…"
              className="w-full resize-y rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-neutral-950 outline-none placeholder:text-neutral-500 focus:border-black/20"
            />
          ) : null}
          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <button type="button" onClick={() => setStep("confirm")} className={subtleButtonVariants()}>
              Back
            </button>
            <button
              type="button"
              disabled={busy || !reason}
              onClick={() => void submit()}
              className={solidButtonVariants()}
            >
              {busy ? "Submitting…" : "Submit cancellation"}
            </button>
          </div>
        </div>
      ) : null}

      {step === "done" ? (
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-neutral-950">License cancelled</h2>
          <p className="text-sm text-neutral-700">
            Status: <span className="font-medium text-red-800">Withdrawn</span>
            <br />
            <span className="font-medium text-amber-900">Under review</span> — our team may contact you
            within 3–5 business days.
          </p>
          <p className="text-sm text-neutral-600">
            Questions?{" "}
            <a className="font-medium text-emerald-800 hover:underline" href={`mailto:${SUPPORT}`}>
              {SUPPORT}
            </a>
          </p>
          {emailWarnings?.length ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-left text-sm text-amber-950">
              <p className="font-medium">Some emails could not be sent:</p>
              <ul className="mt-1 list-disc pl-4 text-amber-900">
                {emailWarnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
              <p className="mt-2 text-neutral-700">
                Your cancellation is still saved. Check Resend domain limits in development.
              </p>
            </div>
          ) : null}
          <button type="button" onClick={onClose} className={solidButtonVariants()}>
            Close
          </button>
        </div>
      ) : null}
    </Modal>
  );
}
