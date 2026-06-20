"use client";

import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { LicenseCancelDialog } from "@/components/license/LicenseCancelDialog";
import { LicenseContractEditor } from "@/components/license/LicenseContractEditor";
import { CounterOfferForm } from "@/components/license/CounterOfferForm";
import { CounterOffersList } from "@/components/license/CounterOffersList";
import { AssetDeliveryZone } from "@/components/license/AssetDeliveryZone";
import { OtherUsageNotesDisplay } from "@/components/license/OtherUsageNotesDisplay";
import { cancellationReasonLabel } from "@/lib/license/cancellationReasons";
import {
  dangerButtonVariants,
  ghostButtonVariants,
  outlineButtonVariants,
  primaryButtonVariants,
} from "@/components/ui/button-recipes";
import { dataFromApiJson, apiErrorMessage } from "@/lib/api/response";
import { profileFromApiJson } from "@/lib/api/profilePayload";
import { vaultAssetsFromApiJson } from "@/lib/api/vaultPayload";
import { filterDeliverableVaultAssets } from "@/lib/vault/assetFilters";
import { surfaceCardVariants } from "@/components/ui/surface-card";
import { cx } from "@/lib/cx";
import type { LicenseRequestRow } from "@/types/license";
import type { VaultAssetWithUrl } from "@/lib/api/vaultPayload";

type VaultAssetRow = VaultAssetWithUrl;

type CounterOfferRow = {
  id: string;
  license_request_id: string;
  channels: string[];
  territories: string[];
  duration_days: number;
  proposed_budget_inr: number;
  note: string | null;
  status: "pending" | "accepted" | "declined";
  created_at: string;
  responded_at: string | null;
};

function formatInr(n: number | null | undefined): string {
  if (n == null) return "—";
  return `₹${n.toLocaleString("en-IN")}`;
}

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

export function LicenseRequestWorkspace({
  initialRequest,
  creatorOtherUsageNotes = null,
  backHref = "/licenses",
  backLabel = "Back to Licenses",
  viewerRole = "creator",
}: {
  initialRequest: LicenseRequestRow;
  creatorOtherUsageNotes?: string | null;
  backHref?: string;
  backLabel?: string;
  viewerRole?: "creator" | "brand";
}) {
  const router = useRouter();
  const [request, setRequest] = useState<LicenseRequestRow>(initialRequest);
  const isBrand = viewerRole === "brand";
  const [cancelOpen, setCancelOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [showDecline, setShowDecline] = useState(false);
  const [showCounterOffer, setShowCounterOffer] = useState(false);
  const [creatorMinLicenseFeeInr, setCreatorMinLicenseFeeInr] = useState<number | null>(null);
  const [emailBody, setEmailBody] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [busy, setBusy] = useState(false);
  const [assets, setAssets] = useState<VaultAssetRow[]>([]);
  const [assetsLoading, setAssetsLoading] = useState(true);
  const [counterOffers, setCounterOffers] = useState<CounterOfferRow[]>([]);
  const [counterOffersLoading, setCounterOffersLoading] = useState(true);
  const [brandSignatoryName, setBrandSignatoryName] = useState("");

  const brandPaymentCleared = Boolean(request.brand_payment_cleared_at);
  const brandCanViewContract =
    request.status === "accepted" && (!isBrand || brandPaymentCleared);
  const licenseFeeInr = request.agreed_budget_inr ?? request.budget_inr;

  const reloadRequest = useCallback(async () => {
    const url = isBrand
      ? `/api/licenses/workspace/${request.id}`
      : `/api/licenses/incoming/${request.id}`;
    const res = await fetch(url);
    if (!res.ok) return;
    const json = await res.json().catch(() => null);
    const data = dataFromApiJson<{ request?: LicenseRequestRow }>(json);
    if (data?.request) setRequest(data.request);
  }, [request.id, isBrand]);

  const loadCounterOffers = useCallback(async () => {
    setCounterOffersLoading(true);
    try {
      const res = await fetch(`/api/licenses/requests/${request.id}/counter-offers`);
      const json = await res.json().catch(() => null);
      const data = dataFromApiJson<{ counterOffers?: CounterOfferRow[] }>(json);
      if (res.ok && Array.isArray(data?.counterOffers)) {
        setCounterOffers(data.counterOffers);
      } else if (!res.ok && res.status !== 503) {
        console.warn("[license workspace] counter-offers load failed", res.status);
      }
    } catch (e) {
      console.warn("[license workspace] counter-offers load error", e);
    } finally {
      setCounterOffersLoading(false);
    }
  }, [request.id]);

  const isPending = request.status === "pending";
  const isWithdrawn = request.status === "withdrawn";
  const hasPendingCounterOffer = counterOffers.some((o) => o.status === "pending");
  const canEmailBrand =
    !isBrand && (request.status === "accepted" || request.status === "declined");
  
  useEffect(() => {
    if (isBrand) {
      setAssetsLoading(false);
    }
    void loadCounterOffers();
    
    if (isBrand) return;
    
    let cancelled = false;
    (async () => {
      try {
        const [vaultRes, profileRes] = await Promise.all([
          fetch("/api/vault"),
          fetch("/api/profile"),
        ]);
        if (!cancelled) {
          if (vaultRes.ok) {
            const vaultAssets = vaultAssetsFromApiJson(await vaultRes.json().catch(() => null));
            if (vaultAssets) {
              setAssets(filterDeliverableVaultAssets(vaultAssets) as VaultAssetRow[]);
            }
          }
          if (profileRes.ok) {
            const profileData = profileFromApiJson(await profileRes.json().catch(() => null));
            if (typeof profileData?.minLicenseFeeInr === "number") {
              setCreatorMinLicenseFeeInr(profileData.minLicenseFeeInr);
            }
          }
        }
      } finally {
        if (!cancelled) setAssetsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isBrand, loadCounterOffers]);

  useEffect(() => {
    if (hasPendingCounterOffer) {
      setShowCounterOffer(false);
    }
  }, [hasPendingCounterOffer]);

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

  async function submitCounterOffer(offer: {
    channels: string[];
    territories: string[];
    durationDays: number;
    proposedBudgetInr: number;
    note: string;
  }) {
    setMessage(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/licenses/incoming/${request.id}/counter-offer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(offer),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(apiErrorMessage(data, "Could not submit counter-offer"));
        return;
      }
      setShowCounterOffer(false);
      setMessage("Counter-offer sent. The brand will be notified by email if they are not on Muhr yet.");
      await Promise.all([reloadRequest(), loadCounterOffers()]);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function respondToCounterOffer(counterOfferId: string, action: "accept" | "decline") {
    setMessage(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/licenses/counter-offers/${counterOfferId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(typeof data.error === "string" ? data.error : "Could not respond to counter-offer");
        return;
      }
      setMessage(
        action === "accept"
          ? "Counter-offer accepted. The license terms have been updated."
          : "Counter-offer declined."
      );
      await Promise.all([reloadRequest(), loadCounterOffers()]);
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

  async function patchWorkspaceState(body: Record<string, unknown>) {
    setMessage(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/licenses/workspace/${request.id}/state`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(typeof data.error === "string" ? data.error : "Update failed");
        return;
      }
      if (data.request) setRequest(data.request as LicenseRequestRow);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 text-sm font-medium text-neutral-700 hover:text-neutral-950"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          {backLabel}
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
          {!isBrand && request.status === "accepted" ? (
            <div className="shrink-0 sm:pt-1">
              <button
                type="button"
                onClick={() => setCancelOpen(true)}
                className={cx(
                  outlineButtonVariants(),
                  "border-red-300 text-red-900 shadow-sm hover:bg-red-100",
                )}
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
            <a href="mailto:contact@muhr.app" className="font-medium text-emerald-800 hover:underline">
              contact@muhr.app
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
          <OtherUsageNotesDisplay
            notes={creatorOtherUsageNotes}
            label={isBrand ? "Creator other usage notes" : "Your other usage notes"}
          />
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

      {/* Counter-offers */}
      {!counterOffersLoading && counterOffers.length > 0 && (
        <CounterOffersList
          counterOffers={counterOffers}
          viewerRole={viewerRole}
          onAccept={isBrand ? (id) => void respondToCounterOffer(id, "accept") : undefined}
          onDecline={isBrand ? (id) => void respondToCounterOffer(id, "decline") : undefined}
          busy={busy}
        />
      )}

      {isPending && !isBrand && (
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Respond</h2>
          <div className={cx(surfaceCardVariants({ padding: "md", interactive: "none" }), "space-y-3")}>
            {hasPendingCounterOffer && !showCounterOffer && !showDecline ? (
              <div className="rounded-lg border border-purple-200 bg-purple-50/80 px-4 py-3 text-sm text-purple-950">
                <p className="font-medium">Counter-offer sent — waiting on the brand</p>
                <p className="mt-1 text-purple-900/80">
                  Your proposed terms are listed above. You can still accept or decline their original
                  request, or wait for the brand to respond to your counter-offer.
                </p>
              </div>
            ) : null}
            {showDecline ? (
              <div className="space-y-2">
                <textarea
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  placeholder="Optional note to brand"
                  rows={3}
                  className="w-full resize-y rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-neutral-950 outline-none placeholder:text-neutral-900/40"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void respond("decline")}
                    className={dangerButtonVariants({ size: "md" })}
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
            ) : showCounterOffer ? (
              <CounterOfferForm
                creatorMinLicenseFeeInr={creatorMinLicenseFeeInr}
                originalChannels={request.channels ?? []}
                originalTerritories={request.territories ?? []}
                originalDurationDays={request.duration_days ?? 30}
                originalBudgetInr={request.budget_inr}
                originalIntendedUse={request.intended_use}
                onSubmit={submitCounterOffer}
                onCancel={() => setShowCounterOffer(false)}
                busy={busy}
              />
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
                {!hasPendingCounterOffer ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setShowCounterOffer(true)}
                    className={cx(
                      outlineButtonVariants(),
                      "border-purple-400 bg-purple-100 text-purple-950 shadow-sm transition hover:border-purple-500 hover:bg-purple-200 hover:text-purple-950",
                    )}
                  >
                    Negotiate terms
                  </button>
                ) : null}
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

      {/* Brand: mock payment before contract unlock */}
      {isBrand && request.status === "accepted" ? (
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Payment</h2>
          <div className={cx(surfaceCardVariants({ padding: "md", interactive: "none" }), "space-y-4")}>
            {brandPaymentCleared ? (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
                <span className="font-medium">Payment recorded</span>
                <span className="text-emerald-900/80">
                  {formatInr(licenseFeeInr)} · preview placeholder (Stripe coming soon)
                </span>
              </div>
            ) : (
              <>
                <p className="text-sm text-neutral-800">Mock checkout — no card charged.</p>
                <div className="flex flex-wrap items-end justify-between gap-4 rounded-lg border border-black/10 bg-neutral-50 px-4 py-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                      Amount due
                    </p>
                    <p className="mt-1 text-2xl font-semibold tabular-nums text-neutral-950">
                      {formatInr(licenseFeeInr)}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void patchWorkspaceState({ action: "brand_clear_payment" })}
                    className={primaryButtonVariants()}
                  >
                    {busy ? "Processing…" : "Make payment"}
                  </button>
                </div>
              </>
            )}
          </div>
        </section>
      ) : null}

      {/* Contract — brand sees this only after payment is recorded */}
      {brandCanViewContract ? (
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Contract</h2>
          <div className={cx(surfaceCardVariants({ padding: "md", interactive: "none" }), "space-y-2")}>
            <LicenseContractEditor
              request={request}
              readOnly={isBrand}
              onRequestUpdated={(next) => setRequest(next)}
            />
          </div>
        </section>
      ) : isBrand && request.status === "accepted" ? (
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Contract</h2>
          <div
            className={cx(
              surfaceCardVariants({ padding: "md", interactive: "none" }),
              "border-dashed border-neutral-300 bg-neutral-50"
            )}
          >
            <p className="text-sm font-medium text-neutral-800">Agreement locked</p>
            <p className="mt-1 text-sm text-neutral-600">Complete payment to unlock.</p>
          </div>
        </section>
      ) : null}

      {/* Brand: mock digital signature after payment */}
      {isBrand && request.status === "accepted" && brandPaymentCleared ? (
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Sign agreement</h2>
          <div className={cx(surfaceCardVariants({ padding: "md", interactive: "none" }), "space-y-4")}>
            {request.brand_signed_contract_at ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
                <p className="font-medium">Digitally signed (preview)</p>
                <p className="mt-1 text-emerald-900/90">
                  {request.brand_signatory_name ? (
                    <>
                      Signed by <span className="font-semibold">{request.brand_signatory_name}</span>
                    </>
                  ) : (
                    "Signature recorded"
                  )}{" "}
                  ·{" "}
                  {formatDistanceToNow(new Date(request.brand_signed_contract_at), {
                    addSuffix: true,
                  })}
                </p>
                {request.contract_effective_at ? (
                  <p className="mt-2 text-xs text-emerald-800">
                    Agreement in force since{" "}
                    {new Date(request.contract_effective_at).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-emerald-800">
                    Waiting for the creator to sign before the agreement is fully in force.
                  </p>
                )}
              </div>
            ) : (
              <>
                <p className="text-sm text-neutral-800">Preview signature — not legally binding.</p>
                <div>
                  <label
                    htmlFor="brand-signatory"
                    className="mb-1.5 block text-xs font-medium text-neutral-700"
                  >
                    Full legal name
                  </label>
                  <input
                    id="brand-signatory"
                    type="text"
                    required
                    minLength={2}
                    maxLength={200}
                    value={brandSignatoryName}
                    onChange={(e) => setBrandSignatoryName(e.target.value)}
                    placeholder={request.brand_name || "Your name"}
                    className="w-full max-w-md rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-neutral-950 outline-none placeholder:text-neutral-500"
                  />
                </div>
                <button
                  type="button"
                  disabled={busy || brandSignatoryName.trim().length < 2}
                  onClick={() =>
                    void patchWorkspaceState({
                      action: "sign",
                      side: "brand",
                      signatory_name: brandSignatoryName.trim(),
                    })
                  }
                  className={primaryButtonVariants()}
                >
                  {busy ? "Signing…" : "Sign digitally (preview)"}
                </button>
              </>
            )}
          </div>
        </section>
      ) : null}

      {/* Payment — Stripe etc. next; no longer gated on in-app signatures */}
      {request.status === "accepted" && !isBrand && (
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Payment</h2>
          <div className={cx(surfaceCardVariants({ padding: "md", interactive: "none" }), "space-y-3")}>
            <p className="text-sm text-neutral-700">In-app payouts coming soon (Stripe Connect).</p>
            <button type="button" disabled className={primaryButtonVariants()}>
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
            <p className="text-sm text-neutral-700">
              To {request.brand_email} · replies route back to you
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
      {request.status === "accepted" && !isBrand && (
        <AssetDeliveryZone
          request={request}
          assets={assets}
          assetsLoading={assetsLoading}
        />
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
