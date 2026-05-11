"use client";

import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { LicenseCancelDialog } from "@/components/license/LicenseCancelDialog";
import { LicenseContractEditor } from "@/components/license/LicenseContractEditor";
import { cancellationReasonLabel } from "@/lib/license/cancellationReasons";
import { ghostButtonVariants, primaryButtonVariants } from "@/components/ui/button-recipes";
import { surfaceCardVariants } from "@/components/ui/surface-card";
import { cx } from "@/lib/cx";
import type { LicenseRequestRow } from "@/types/license";

type VaultAssetRow = {
  id: string;
  file_path: string;
  mime_type?: string | null;
  signed_url?: string | null;
  created_at?: string;
};

function StatusBadge({ status }: { status: LicenseRequestRow["status"] }) {
  if (status === "accepted") {
    return (
      <span className="rounded-full border border-emerald-600/25 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-900">
        Accepted
      </span>
    );
  }
  if (status === "withdrawn") {
    return (
      <span className="rounded-full border border-red-500/30 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-900">
        Withdrawn
      </span>
    );
  }
  if (status === "declined") {
    return (
      <span className="rounded-full border border-neutral-200 bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-800">
        Declined
      </span>
    );
  }
  if (status === "expired") {
    return (
      <span className="rounded-full border border-amber-500/35 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-950">
        Expired
      </span>
    );
  }
  return (
    <span className="rounded-full border border-amber-500/35 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-950">
      Pending
    </span>
  );
}

export function LicenseRequestWorkspace({ initialRequest }: { initialRequest: LicenseRequestRow }) {
  const router = useRouter();
  const [request, setRequest] = useState<LicenseRequestRow>(initialRequest);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [showDecline, setShowDecline] = useState(false);
  const [emailBody, setEmailBody] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [busy, setBusy] = useState(false);
  const [assets, setAssets] = useState<VaultAssetRow[]>([]);
  const [assetsLoading, setAssetsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const reloadRequest = useCallback(async () => {
    const res = await fetch(`/api/licenses/incoming/${request.id}`);
    if (!res.ok) return;
    const data = await res.json().catch(() => ({}));
    if (data.request) setRequest(data.request as LicenseRequestRow);
  }, [request.id]);

  const isPending = request.status === "pending";
  const isWithdrawn = request.status === "withdrawn";
  const canEmailBrand = request.status === "accepted" || request.status === "declined";
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/vault");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data.assets)) {
          setAssets(data.assets as VaultAssetRow[]);
        }
      } finally {
        if (!cancelled) setAssetsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function respond(action: "accept" | "decline") {
    setMessage(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/licenses/incoming/${request.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          decline_reason: action === "decline" ? declineReason.trim() || null : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(typeof data.error === "string" ? data.error : "Update failed");
        return;
      }
      setShowDecline(false);
      setDeclineReason("");
      setMessage(action === "accept" ? "Request accepted." : "Request declined.");
      await reloadRequest();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function sendBrandEmail() {
    setMessage(null);
    const trimmed = emailBody.trim();
    if (trimmed.length < 1) {
      setMessage("Write a message before sending.");
      return;
    }
    setEmailSending(true);
    try {
      const res = await fetch(`/api/licenses/incoming/${request.id}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(typeof data.error === "string" ? data.error : "Could not send email");
        return;
      }
      setEmailBody("");
      setMessage("Email sent to the brand.");
    } catch {
      setMessage("Network error");
    } finally {
      setEmailSending(false);
    }
  }

  async function copyAssetLink(asset: VaultAssetRow) {
    const url = asset.signed_url;
    if (!url) {
      setMessage("No download link available. Try refreshing the page.");
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(asset.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setMessage("Could not copy to clipboard.");
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/licenses"
          className="inline-flex items-center gap-1 text-sm font-medium text-neutral-700 hover:text-neutral-950"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Back to Licenses
        </Link>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">
                {request.brand_name}
                {request.brand_company ? (
                  <span className="font-normal text-neutral-600"> · {request.brand_company}</span>
                ) : null}
              </h1>
              <StatusBadge status={request.status} />
            </div>
            <p className="mt-1 text-sm text-neutral-700">{request.brand_email}</p>
            {request.brand_website ? (
              <a
                href={request.brand_website.startsWith("http") ? request.brand_website : `https://${request.brand_website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block text-sm font-medium text-emerald-800 underline-offset-2 hover:text-emerald-950 hover:underline"
              >
                {request.brand_website}
              </a>
            ) : null}
          </div>
          {request.status === "accepted" ? (
            <div className="shrink-0 sm:pt-1">
              <button
                type="button"
                onClick={() => setCancelOpen(true)}
                className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-900 shadow-sm hover:bg-red-100"
              >
                Cancel license
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {isWithdrawn ? (
        <div className="space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-5">
          <p className="text-sm font-semibold text-amber-950">Under review</p>
          <p className="text-sm text-amber-950/90">
            This license is <span className="font-semibold text-red-800">withdrawn</span>. The brand was
            notified to cease use. Our team may follow up within 3–5 business days. Reason recorded:{" "}
            <span className="text-neutral-950">{cancellationReasonLabel(request.cancellation_reason)}</span>
            {request.cancellation_note ? (
              <>
                {" "}
                — <span className="text-neutral-900/85">{request.cancellation_note}</span>
              </>
            ) : null}
          </p>
          <p className="text-xs text-neutral-700">
            Questions?{" "}
            <a href="mailto:support@muhr.app" className="font-medium text-emerald-800 hover:underline">
              support@muhr.app
            </a>
          </p>
        </div>
      ) : null}

      {message && (
        <p className="rounded-lg border border-emerald-600/25 bg-emerald-50 px-3 py-2.5 text-sm font-medium text-emerald-950 shadow-sm">
          {message}
        </p>
      )}

      {/* What they’re asking for */}
      <section className="space-y-3">
        <h2 className="text-lg font-medium">What they need</h2>
        <div className={cx(surfaceCardVariants({ padding: "md", interactive: "none" }), "space-y-4")}>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-600">Intended use</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-900/85">{request.intended_use}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-600">Channels</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {(request.channels ?? []).length ? (
                  (request.channels ?? []).map((c) => (
                    <span
                      key={c}
                      className="rounded-full bg-black/5 px-2.5 py-0.5 text-xs text-neutral-900/80"
                    >
                      {c}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-neutral-600">—</span>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-600">Territories</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {(request.territories ?? []).length ? (
                  (request.territories ?? []).map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-black/10 px-2.5 py-0.5 text-xs text-neutral-900/60"
                    >
                      {t}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-neutral-600">—</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-6 border-t border-black/10 pt-4 text-sm">
            <div>
              <p className="text-xs font-medium text-neutral-600">Duration</p>
              <p className="mt-0.5 font-semibold text-neutral-900">{request.duration_days} days</p>
            </div>
            <div>
              <p className="text-xs font-medium text-neutral-600">Budget (INR)</p>
              <p className="mt-0.5 font-semibold text-neutral-900">
                {request.budget_inr != null ? `₹${request.budget_inr.toLocaleString("en-IN")}` : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-neutral-600">Submitted</p>
              <p className="mt-0.5 font-semibold text-neutral-900">
                {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
              </p>
            </div>
            {request.responded_at ? (
              <div>
                <p className="text-xs font-medium text-neutral-600">Responded</p>
                <p className="mt-0.5 font-semibold text-neutral-900">
                  {formatDistanceToNow(new Date(request.responded_at), { addSuffix: true })}
                </p>
              </div>
            ) : null}
          </div>
          {request.status === "declined" && request.decline_reason ? (
            <p className="border-t border-black/10 pt-4 text-sm text-neutral-800">
              <span className="font-medium text-neutral-600">Your note to the brand: </span>
              {request.decline_reason}
            </p>
          ) : null}
        </div>
      </section>

      {isPending && (
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Respond</h2>
          <div className={cx(surfaceCardVariants({ padding: "md", interactive: "none" }), "space-y-3")}>
            <p className="text-sm text-neutral-800">
              Accept to move forward with payment, messaging, and delivering assets from this page.
            </p>
            {showDecline ? (
              <div className="space-y-2">
                <textarea
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  placeholder="Optional note to the brand (optional)"
                  rows={3}
                  className="w-full resize-y rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-neutral-950 outline-none placeholder:text-neutral-900/40"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void respond("decline")}
                    className="rounded-lg border border-red-300 bg-red-100 px-4 py-2 text-sm font-semibold text-red-900 hover:bg-red-200 disabled:opacity-50"
                  >
                    Confirm decline
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setShowDecline(false);
                      setDeclineReason("");
                    }}
                    className={ghostButtonVariants()}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void respond("accept")}
                  className={primaryButtonVariants()}
                >
                  Accept request
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setShowDecline(true)}
                  className={ghostButtonVariants()}
                >
                  Decline
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Contract — server-backed draft + local browser backup; signing is offline */}
      {request.status === "accepted" && (
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Contract</h2>
          <div className={cx(surfaceCardVariants({ padding: "md", interactive: "none" }), "space-y-2")}>
            <p className="text-sm text-neutral-800">
              Draft loads from Muhr when you open this page and saves to your account while you edit (use{" "}
              <span className="font-medium text-neutral-950">Save now</span> if you want an immediate sync). Export Word or
              PDF for counsel and for signing outside Muhr, then email the brand or use your own e-sign tool.
            </p>
            <LicenseContractEditor
              request={request}
              onRequestUpdated={(next) => setRequest(next)}
            />
          </div>
        </section>
      )}

      {/* Payment — Stripe etc. next; no longer gated on in-app signatures */}
      {request.status === "accepted" && (
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Payment</h2>
          <div className={cx(surfaceCardVariants({ padding: "md", interactive: "none" }), "space-y-3")}>
            <p className="text-sm text-neutral-800">
              When you are ready to collect fees in-app, connect a payment provider (e.g. Stripe Connect).
              Final contract execution remains between you and the brand outside Muhr.
            </p>
            <button type="button" disabled className={cx(primaryButtonVariants(), "cursor-not-allowed opacity-45")}>
              Accept payment (coming soon)
            </button>
          </div>
        </section>
      )}

      {/* Email brand */}
      {canEmailBrand && (
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Message the brand</h2>
          <div className={cx(surfaceCardVariants({ padding: "md", interactive: "none" }), "space-y-3")}>
            <p className="text-sm text-neutral-800">
              Delivers to <span className="font-mono text-sm text-neutral-900">{request.brand_email}</span>{" "}
              <span className="text-neutral-600">from</span>{" "}
              <span className="font-mono text-sm text-neutral-900">communication@muhr.app</span>
              <span className="text-neutral-600">
                {" "}
                (set <span className="font-mono text-xs">RESEND_FROM_EMAIL</span> if you use another verified sender).
              </span>{" "}
              The email quotes your text as “The creator said: …”. Requires{" "}
              <span className="font-mono text-xs">RESEND_API_KEY</span> and a verified domain in Resend.
            </p>
            <textarea
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
              rows={5}
              placeholder="Write your message to the brand…"
              className="w-full resize-y rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-neutral-950 outline-none placeholder:text-neutral-900/40"
            />
            <button
              type="button"
              disabled={emailSending}
              onClick={() => void sendBrandEmail()}
              className={primaryButtonVariants()}
            >
              {emailSending ? "Sending…" : "Send email"}
            </button>
          </div>
        </section>
      )}

      {/* Deliver assets */}
      {request.status === "accepted" && (
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Deliver assets</h2>
          <div className={cx(surfaceCardVariants({ padding: "md", interactive: "none" }), "space-y-3")}>
            <p className="text-sm text-neutral-800">
              Copy time-limited download links to paste into your email, or open an asset to verify before
              sharing. Links expire after about an hour — generate a fresh one before sending.
            </p>
            {assetsLoading ? (
              <div className="h-20 animate-pulse rounded-lg bg-neutral-100" />
            ) : assets.length === 0 ? (
              <div className="rounded-lg border border-dashed border-black/20 bg-neutral-50/80 p-4 text-center text-sm text-neutral-800">
                <p className="font-medium text-neutral-900">No vault assets yet.</p>
                <Link
                  href="/vault/upload"
                  className="mt-2 inline-block font-semibold text-emerald-800 underline-offset-2 hover:text-emerald-950 hover:underline"
                >
                  Upload assets
                </Link>
              </div>
            ) : (
              <ul className="space-y-2">
                {assets.map((a) => (
                  <li
                    key={a.id}
                    className="flex flex-col gap-2 rounded-lg border border-black/10 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-mono text-xs text-neutral-900/70">{a.file_path}</p>
                      <p className="text-[11px] text-neutral-600">{a.mime_type ?? "file"}</p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Link
                        href={`/vault/${a.id}`}
                        className="inline-flex items-center justify-center rounded-lg border border-black/10 bg-neutral-50 px-3 py-1.5 text-xs font-medium text-neutral-950 transition hover:border-black/20 hover:bg-neutral-100"
                      >
                        Open
                      </Link>
                      <button
                        type="button"
                        onClick={() => void copyAssetLink(a)}
                        disabled={!a.signed_url}
                        className={primaryButtonVariants({ size: "sm" })}
                      >
                        {copiedId === a.id ? "Copied" : "Copy link"}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {cancelOpen ? (
        <LicenseCancelDialog
          requestId={request.id}
          brandName={request.brand_name}
          onClose={() => setCancelOpen(false)}
          onCancelled={(next) => {
            setRequest(next);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}
