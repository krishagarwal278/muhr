"use client";

import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { LicenseCancelDialog } from "@/components/license/LicenseCancelDialog";
import { LicenseContractEditor } from "@/components/license/LicenseContractEditor";
import { cancellationReasonLabel } from "@/lib/license/cancellationReasons";
import { canSignContract, isContractInForce } from "@/lib/license/workspaceAccess";
import { canUseInAppLicenseMessaging } from "@/lib/license/workspaceMessages";
import { publicProfileHref } from "@/lib/marketing/publicProfileNav";
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

type WorkspaceMsg = {
  id: string;
  author_role: string;
  body: string;
  created_at: string;
};

type CreatorMeta = { handle: string | null; display_name: string | null };

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
  viewerRole,
  backHref,
  backLabel,
}: {
  initialRequest: LicenseRequestRow;
  viewerRole: "creator" | "brand";
  backHref: string;
  backLabel: string;
}) {
  const router = useRouter();
  const [request, setRequest] = useState<LicenseRequestRow>(initialRequest);
  const [creatorMeta, setCreatorMeta] = useState<CreatorMeta | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [showDecline, setShowDecline] = useState(false);
  const [busy, setBusy] = useState(false);
  const [assets, setAssets] = useState<VaultAssetRow[]>([]);
  const [assetsLoading, setAssetsLoading] = useState(viewerRole === "creator");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [thread, setThread] = useState<WorkspaceMsg[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [chatBody, setChatBody] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const [agreedInput, setAgreedInput] = useState(
    initialRequest.agreed_budget_inr != null ? String(initialRequest.agreed_budget_inr) : ""
  );
  const [signName, setSignName] = useState("");
  const [stateBusy, setStateBusy] = useState(false);

  const wsBase = `/api/licenses/workspace/${request.id}`;
  const contractPath = `${wsBase}/contract`;

  const reloadWorkspace = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false;
    if (!silent) setThreadLoading(true);
    try {
      const ac = new AbortController();
      const tid = setTimeout(() => ac.abort(), 15_000);
      let res: Response;
      try {
        res = await fetch(`${wsBase}?embed=messages`, { signal: ac.signal });
      } finally {
        clearTimeout(tid);
      }
      if (!res.ok) return;
      const data = await res.json().catch(() => ({}));
      if (data.request) setRequest(data.request as LicenseRequestRow);
      if (data.creator) setCreatorMeta(data.creator as CreatorMeta);
      if (Array.isArray(data.messages)) setThread(data.messages as WorkspaceMsg[]);
    } catch {
      // timeout / network — avoid wedging the page
    } finally {
      if (!silent) setThreadLoading(false);
    }
  }, [wsBase]);

  useEffect(() => {
    void reloadWorkspace();
  }, [reloadWorkspace]);

  useEffect(() => {
    if (viewerRole !== "creator") {
      setAssetsLoading(false);
      return;
    }
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
  }, [viewerRole]);

  const isPending = request.status === "pending";
  const isWithdrawn = request.status === "withdrawn";
  const isAccepted = request.status === "accepted";
  const canMessage = canUseInAppLicenseMessaging(request);
  const paymentCleared = Boolean(request.brand_payment_cleared_at);
  const contractLive = isContractInForce(request);
  const signingAllowed = canSignContract(request);

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
      await reloadWorkspace();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function postChat() {
    setMessage(null);
    const trimmed = chatBody.trim();
    if (trimmed.length < 1) {
      setMessage("Write a message first.");
      return;
    }
    setChatSending(true);
    try {
      const res = await fetch(`${wsBase}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(typeof data.error === "string" ? data.error : "Could not send message");
        return;
      }
      setChatBody("");
      await reloadWorkspace({ silent: true });
    } finally {
      setChatSending(false);
    }
  }

  async function patchState(payload: Record<string, unknown>) {
    setStateBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`${wsBase}/state`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(typeof data.error === "string" ? data.error : "Update failed");
        return;
      }
      if (data.request) setRequest(data.request as LicenseRequestRow);
    } finally {
      setStateBusy(false);
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

  const creatorTitle =
    creatorMeta?.display_name?.trim() ||
    (creatorMeta?.handle ? `@${creatorMeta.handle.replace(/^@/, "")}` : null) ||
    "Creator";

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
                {viewerRole === "creator" ? (
                  <>
                    {request.brand_name}
                    {request.brand_company ? (
                      <span className="font-normal text-neutral-600"> · {request.brand_company}</span>
                    ) : null}
                  </>
                ) : (
                  <>{creatorTitle}</>
                )}
              </h1>
              <StatusBadge status={request.status} />
            </div>
            <p className="mt-1 text-sm text-neutral-700">
              {viewerRole === "creator" ? request.brand_email : `You (${request.brand_email})`}
            </p>
            {viewerRole === "brand" && creatorMeta?.handle ? (
              <Link
                href={publicProfileHref(creatorMeta.handle.replace(/^@/, ""), "brand")}
                className="mt-1 inline-block text-sm font-medium text-emerald-800 underline-offset-2 hover:underline"
              >
                Public profile →
              </Link>
            ) : null}
            {viewerRole === "creator" && request.brand_website ? (
              <a
                href={
                  request.brand_website.startsWith("http") ? request.brand_website : `https://${request.brand_website}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block text-sm font-medium text-emerald-800 underline-offset-2 hover:text-emerald-950 hover:underline"
              >
                {request.brand_website}
              </a>
            ) : null}
          </div>
          {viewerRole === "creator" && request.status === "accepted" ? (
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
            This license is <span className="font-semibold text-red-800">withdrawn</span>. The brand was notified to
            cease use. Our team may follow up within 3–5 business days. Reason recorded:{" "}
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

      {isAccepted && (
        <section className="space-y-3">
          <h2 className="text-lg font-medium">License workflow</h2>
          <div className={cx(surfaceCardVariants({ padding: "md", interactive: "none" }), "space-y-3 text-sm")}>
            <ol className="list-decimal space-y-2 pl-5 text-neutral-800">
              <li className={paymentCleared ? "text-emerald-800" : ""}>
                <span className="font-medium">Brand payment step</span> —{" "}
                {paymentCleared ? "Recorded (placeholder until live payments)." : "Pending. Signing stays locked."}
              </li>
              <li className={request.creator_signed_contract_at ? "text-emerald-800" : ""}>
                <span className="font-medium">Creator signature</span> —{" "}
                {request.creator_signed_contract_at
                  ? `Signed (${request.creator_signatory_name ?? "—"})`
                  : signingAllowed
                    ? "Ready once you sign below."
                    : "Locked until payment step."}
              </li>
              <li className={request.brand_signed_contract_at ? "text-emerald-800" : ""}>
                <span className="font-medium">Brand signature</span> —{" "}
                {request.brand_signed_contract_at
                  ? `Signed (${request.brand_signatory_name ?? "—"})`
                  : signingAllowed
                    ? "Ready once you sign below."
                    : "Locked until payment step."}
              </li>
              <li className={contractLive ? "font-semibold text-emerald-900" : ""}>
                <span className="font-medium">Contract in force</span> —{" "}
                {contractLive
                  ? `From ${request.contract_effective_at ? formatDistanceToNow(new Date(request.contract_effective_at), { addSuffix: true }) : "now"}.`
                  : "Starts only after payment is cleared and both signatures are captured."}
              </li>
            </ol>
          </div>
        </section>
      )}

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
                    <span key={c} className="rounded-full bg-black/5 px-2.5 py-0.5 text-xs text-neutral-900/80">
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
                    <span key={t} className="rounded-full border border-black/10 px-2.5 py-0.5 text-xs text-neutral-900/60">
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
              <p className="text-xs font-medium text-neutral-600">Budget (requested)</p>
              <p className="mt-0.5 font-semibold text-neutral-900">
                {request.budget_inr != null ? `₹${request.budget_inr.toLocaleString("en-IN")}` : "—"}
              </p>
            </div>
            {request.agreed_budget_inr != null ? (
              <div>
                <p className="text-xs font-medium text-neutral-600">Agreed budget (locked)</p>
                <p className="mt-0.5 font-semibold text-emerald-900">
                  ₹{request.agreed_budget_inr.toLocaleString("en-IN")}
                </p>
              </div>
            ) : null}
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
          {viewerRole === "creator" && request.status === "declined" && request.decline_reason ? (
            <p className="border-t border-black/10 pt-4 text-sm text-neutral-800">
              <span className="font-medium text-neutral-600">Your note to the brand: </span>
              {request.decline_reason}
            </p>
          ) : null}
        </div>
      </section>

      {canMessage && (
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Messages</h2>
          <div className={cx(surfaceCardVariants({ padding: "md", interactive: "none" }), "space-y-3")}>
            <p className="text-sm text-neutral-700">
              In-app thread when the brand submitted this request while signed in on Muhr. Public-form-only requests
              do not use this chat—use email from the request details instead.
            </p>
            {threadLoading ? (
              <div className="h-16 animate-pulse rounded-lg bg-neutral-100" />
            ) : (
              <ul className="max-h-72 space-y-2 overflow-y-auto rounded-lg border border-black/10 bg-neutral-50/80 p-3">
                {thread.length === 0 ? (
                  <li className="text-sm text-neutral-600">No messages yet.</li>
                ) : (
                  thread.map((m) => (
                    <li key={m.id} className="rounded-md bg-white px-3 py-2 text-sm shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                        {m.author_role === "creator" ? "Creator" : "Brand"} ·{" "}
                        {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-neutral-900">{m.body}</p>
                    </li>
                  ))
                )}
              </ul>
            )}
            <textarea
              value={chatBody}
              onChange={(e) => setChatBody(e.target.value)}
              rows={3}
              placeholder="Write a message…"
              className="w-full resize-y rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-neutral-950 outline-none"
            />
            <button
              type="button"
              disabled={chatSending}
              onClick={() => void postChat()}
              className={primaryButtonVariants()}
            >
              {chatSending ? "Sending…" : "Send message"}
            </button>
          </div>
        </section>
      )}

      {viewerRole === "creator" && isPending && (
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Respond</h2>
          <div className={cx(surfaceCardVariants({ padding: "md", interactive: "none" }), "space-y-3")}>
            <p className="text-sm text-neutral-800">
              Accept to open the shared workspace: payment step, contract draft, in-app messages, and signatures.
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
                <button type="button" disabled={busy} onClick={() => void respond("accept")} className={primaryButtonVariants()}>
                  Accept request
                </button>
                <button type="button" disabled={busy} onClick={() => setShowDecline(true)} className={ghostButtonVariants()}>
                  Decline
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {isAccepted && (
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Record agreed budget (INR)</h2>
          <div className={cx(surfaceCardVariants({ padding: "md", interactive: "none" }), "space-y-3")}>
            <p className="text-sm text-neutral-800">
              Use <span className="font-medium">Messages</span> to align on scope and fees. When you are aligned, the
              creator records the final number here so both sides see the same figure before signing.
            </p>
            {viewerRole === "creator" ? (
              <div className="flex flex-wrap items-end gap-2">
                <div>
                  <label htmlFor="agreed-inr" className="mb-1 block text-xs font-medium text-neutral-600">
                    Agreed amount (INR)
                  </label>
                  <input
                    id="agreed-inr"
                    type="number"
                    min={0}
                    value={agreedInput}
                    onChange={(e) => setAgreedInput(e.target.value)}
                    className="w-40 rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-neutral-950"
                  />
                </div>
                <button
                  type="button"
                  disabled={stateBusy || contractLive}
                  onClick={() =>
                    void patchState({
                      action: "set_agreed_budget",
                      agreed_budget_inr: Number(agreedInput),
                    })
                  }
                  className={primaryButtonVariants()}
                >
                  Save agreed budget
                </button>
              </div>
            ) : (
              <p className="text-sm font-medium text-neutral-900">
                {request.agreed_budget_inr != null
                  ? `Creator recorded ₹${request.agreed_budget_inr.toLocaleString("en-IN")}.`
                  : "Waiting for the creator to record the agreed amount."}
              </p>
            )}
          </div>
        </section>
      )}

      {isAccepted && (
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Payment</h2>
          <div className={cx(surfaceCardVariants({ padding: "md", interactive: "none" }), "space-y-3")}>
            <p className="text-sm text-neutral-800">
              In production this step will capture real settlement (e.g. Stripe). For now the brand confirms the
              payment checkpoint so signatures can unlock.
            </p>
            {viewerRole === "brand" ? (
              <button
                type="button"
                disabled={stateBusy || Boolean(request.brand_payment_cleared_at) || contractLive}
                onClick={() => void patchState({ action: "brand_clear_payment" })}
                className={primaryButtonVariants()}
              >
                {request.brand_payment_cleared_at ? "Payment step completed" : "Confirm payment step (placeholder)"}
              </button>
            ) : (
              <p className="text-sm text-neutral-700">
                {paymentCleared
                  ? "The brand has cleared the payment checkpoint. You can sign when ready."
                  : "Waiting for the brand to clear the payment checkpoint before signatures unlock."}
              </p>
            )}
          </div>
        </section>
      )}

      {isAccepted && (
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Shared contract draft</h2>
          <div className={cx(surfaceCardVariants({ padding: "md", interactive: "none" }), "space-y-2")}>
            <LicenseContractEditor
              request={request}
              onRequestUpdated={(next) => setRequest(next)}
              persistPath={contractPath}
              workspaceMode
            />
          </div>
        </section>
      )}

      {isAccepted && !contractLive && (
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Digital signatures</h2>
          <div className={cx(surfaceCardVariants({ padding: "md", interactive: "none" }), "space-y-4")}>
            <p className="text-sm text-neutral-800">
              Type your legal name and sign. Both parties must sign after the payment step. The contract is not in
              force until both signatures and payment are complete.
            </p>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Signatory name</label>
              <input
                type="text"
                value={signName}
                onChange={(e) => setSignName(e.target.value)}
                placeholder="Full name"
                className="max-w-md rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-neutral-950"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {viewerRole === "creator" ? (
                <button
                  type="button"
                  disabled={stateBusy || Boolean(request.creator_signed_contract_at) || !signingAllowed}
                  onClick={() => void patchState({ action: "sign", side: "creator", signatory_name: signName })}
                  className={primaryButtonVariants()}
                >
                  {request.creator_signed_contract_at ? "Creator signed" : "Sign as creator"}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={stateBusy || Boolean(request.brand_signed_contract_at) || !signingAllowed}
                  onClick={() => void patchState({ action: "sign", side: "brand", signatory_name: signName })}
                  className={primaryButtonVariants()}
                >
                  {request.brand_signed_contract_at ? "Brand signed" : "Sign as brand"}
                </button>
              )}
            </div>
            {!signingAllowed && !contractLive ? (
              <p className="text-xs text-amber-900">Signing is disabled until the brand completes the payment step.</p>
            ) : null}
          </div>
        </section>
      )}

      {viewerRole === "creator" && isAccepted && (
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Deliver assets</h2>
          <div className={cx(surfaceCardVariants({ padding: "md", interactive: "none" }), "space-y-3")}>
            <p className="text-sm text-neutral-800">
              Copy time-limited download links to paste into your message, or open an asset to verify before sharing.
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

      {viewerRole === "creator" && cancelOpen ? (
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
