"use client";

import { useState } from "react";
import { CANCELLATION_REASON_OPTIONS, type CancellationReasonKey } from "@/lib/license/cancellationReasons";
import { ghostButtonVariants, primaryButtonVariants } from "@/components/ui/button-recipes";
import { Modal } from "@/components/ui/modal";
import type { LicenseRequestRow } from "@/types/license";

type Step = "confirm" | "reason" | "done";

const SUPPORT = "support@muhr.app";

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
      overlayClassName="bg-black/70"
      panelClassName="max-h-[90vh] max-w-lg overflow-y-auto rounded-2xl border-white/15 bg-neutral-950 p-6 text-zinc-100 shadow-2xl"
    >
        {step === "confirm" ? (
          <div className="space-y-4">
            <h2 id="cancel-license-title" className="text-lg font-semibold tracking-tight text-white">
              Cancel this license?
            </h2>
            <p className="text-sm text-zinc-300">
              This withdraws the accepted request with <span className="font-medium text-zinc-50">{brandName}</span>.
              Status becomes <span className="font-medium text-amber-300">Withdrawn</span> immediately,
              we record a reason for our team, and the brand is emailed to cease use. Our team may follow up
              within 3–5 business days.
            </p>
            <ul className="list-disc space-y-1 pl-4 text-xs text-zinc-400">
              <li>Brand access through this Muhr request ends now</li>
              <li>You can still export any contract draft from the workspace until you close this</li>
              <li>Questions: {SUPPORT}</li>
            </ul>
            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <button type="button" onClick={onClose} className={ghostButtonVariants()}>
                Keep license
              </button>
              <button
                type="button"
                onClick={() => setStep("reason")}
                className="rounded-lg bg-red-500/90 px-4 py-2 text-sm font-medium text-white hover:bg-red-500"
              >
                Yes, cancel
              </button>
            </div>
          </div>
        ) : null}

        {step === "reason" ? (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold tracking-tight text-white">Why are you cancelling?</h2>
            <p className="text-xs text-zinc-400">We use this to improve Muhr and for support review only.</p>
            <fieldset className="space-y-2">
              {CANCELLATION_REASON_OPTIONS.map((opt) => (
                <label
                  key={opt.key}
                  className="flex cursor-pointer items-start gap-2 rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-zinc-100 hover:border-white/25"
                >
                  <input
                    type="radio"
                    name="cancel-reason"
                    className="mt-0.5"
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
                className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500"
              />
            ) : null}
            {error ? <p className="text-sm text-red-300">{error}</p> : null}
            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <button type="button" onClick={() => setStep("confirm")} className={ghostButtonVariants()}>
                Back
              </button>
              <button
                type="button"
                disabled={busy || !reason}
                onClick={() => void submit()}
                className={primaryButtonVariants()}
              >
                {busy ? "Submitting…" : "Submit cancellation"}
              </button>
            </div>
          </div>
        ) : null}

        {step === "done" ? (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/20 text-emerald-200">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold tracking-tight text-white">License cancelled</h2>
            <p className="text-sm text-zinc-300">
              Status: <span className="font-medium text-red-300">Withdrawn</span>
              <br />
              <span className="text-amber-300">Under review</span> — our team may contact you within 3–5
              business days.
            </p>
            <p className="text-xs text-zinc-400">
              Questions? <a className="text-emerald-300 hover:underline" href={`mailto:${SUPPORT}`}>{SUPPORT}</a>
            </p>
            {emailWarnings?.length ? (
              <div className="rounded-lg border border-amber-400/40 bg-amber-950/40 p-3 text-left text-xs text-amber-100">
                <p className="font-medium text-amber-200">Some emails could not be sent:</p>
                <ul className="mt-1 list-disc pl-4">
                  {emailWarnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
                <p className="mt-2 text-zinc-300">
                  Your cancellation is still saved. Check Resend domain limits in development.
                </p>
              </div>
            ) : null}
            <button type="button" onClick={onClose} className={primaryButtonVariants()}>
              Close
            </button>
          </div>
        ) : null}
    </Modal>
  );
}
