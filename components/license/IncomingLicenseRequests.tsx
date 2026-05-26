"use client";

import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { LicenseRequestRow } from "@/types/license";
import { cancellationReasonLabel } from "@/lib/license/cancellationReasons";
import { apiErrorMessage } from "@/lib/api/response";
import { licensesListFromApiJson, type LicenseListCounts } from "@/lib/api/licensesPayload";
import { cx } from "@/lib/cx";
import {
  dangerButtonVariants,
  outlineButtonVariants,
  solidButtonVariants,
} from "@/components/ui/button-recipes";

export function IncomingLicenseRequests() {
  const [pending, setPending] = useState<LicenseRequestRow[]>([]);
  const [history, setHistory] = useState<LicenseRequestRow[]>([]);
  const [withdrawn, setWithdrawn] = useState<LicenseRequestRow[]>([]);
  const [counts, setCounts] = useState<LicenseListCounts>({
    pending: 0,
    accepted: 0,
    declined: 0,
    withdrawn: 0,
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [declineFor, setDeclineFor] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const load = useCallback(async () => {
    const res = await fetch("/api/licenses");
    const json = await res.json().catch(() => null);
    if (!res.ok) return;
    const data = licensesListFromApiJson(json);
    if (!data) return;
    setPending(Array.isArray(data.incomingRequests) ? data.incomingRequests : []);
    setHistory(Array.isArray(data.respondedRequests) ? data.respondedRequests : []);
    setWithdrawn(Array.isArray(data.withdrawnRequests) ? data.withdrawnRequests : []);
    if (data.counts) {
      setCounts({
        pending: data.counts.pending ?? 0,
        accepted: data.counts.accepted ?? 0,
        declined: data.counts.declined ?? 0,
        withdrawn: data.counts.withdrawn ?? 0,
      });
    } else {
      setCounts({
        pending: Array.isArray(data.incomingRequests) ? data.incomingRequests.length : 0,
        accepted: 0,
        declined: 0,
        withdrawn: 0,
      });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await load();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  async function respond(id: string, action: "accept" | "decline") {
    setMessage(null);
    const res = await fetch(`/api/licenses/incoming/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        decline_reason: action === "decline" ? declineReason.trim() || null : undefined,
      }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      setMessage(apiErrorMessage(json, "Update failed"));
      return;
    }
    setDeclineFor(null);
    setDeclineReason("");
    setMessage(
      action === "accept"
        ? "Accepted — open workspace to reply."
        : "Declined."
    );
    await load();
  }

  if (loading) {
    return <div className="h-24 animate-pulse rounded-xl border border-black/10 bg-neutral-100" />;
  }

  const hasAny = pending.length > 0 || history.length > 0 || withdrawn.length > 0;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-black/10 bg-white p-5">
          <p className="text-sm font-medium text-neutral-700">Active (accepted)</p>
          <p className="mt-1 text-3xl font-semibold text-neutral-950">{counts.accepted}</p>
        </div>
        <div className="rounded-xl border border-black/10 bg-white p-5">
          <p className="text-sm font-medium text-neutral-700">Withdrawn</p>
          <p className="mt-1 text-3xl font-semibold text-red-700">{counts.withdrawn}</p>
        </div>
        <div className="rounded-xl border border-black/10 bg-white p-5">
          <p className="text-sm font-medium text-neutral-700">Pending</p>
          <p className="mt-1 text-3xl font-semibold text-neutral-950">{counts.pending}</p>
        </div>
        <div className="rounded-xl border border-black/10 bg-white p-5">
          <p className="text-sm font-medium text-neutral-700">Declined</p>
          <p className="mt-1 text-3xl font-semibold text-neutral-950">{counts.declined}</p>
        </div>
      </div>

      {message && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
          {message}
        </p>
      )}

      {pending.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-medium">Incoming requests</h2>
          <ul className="space-y-3">
            {pending.map((r) => (
              <li
                key={r.id}
                className="rounded-xl border border-black/10 bg-white p-4 text-sm"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-medium">
                    {r.brand_name}
                    {r.brand_company ? (
                      <span className="font-normal text-neutral-700"> · {r.brand_company}</span>
                    ) : null}
                  </p>
                  <p className="text-xs text-neutral-600">
                    {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                  </p>
                </div>
                <p className="mt-2 line-clamp-1 text-neutral-800">{r.intended_use}</p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-medium tabular-nums text-neutral-700">
                    {r.duration_days}d
                    {r.budget_inr != null ? ` · ₹${r.budget_inr.toLocaleString("en-IN")}` : ""}
                  </span>
                  {(r.channels ?? []).map((c) => (
                    <span
                      key={c}
                      className="rounded-full bg-black/[0.06] px-2 py-0.5 text-[10px] font-medium text-neutral-800"
                    >
                      {c}
                    </span>
                  ))}
                  {(r.territories ?? []).map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-black/15 px-2 py-0.5 text-[10px] font-medium text-neutral-800"
                    >
                      {t}
                    </span>
                  ))}
                </div>
                {declineFor === r.id ? (
                  <div className="mt-3 space-y-2 border-t border-black/10 pt-3">
                    <input
                      value={declineReason}
                      onChange={(e) => setDeclineReason(e.target.value)}
                      placeholder="Optional note to brand"
                      className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-xs text-neutral-950 outline-none placeholder:text-neutral-500"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void respond(r.id, "decline")}
                        className={dangerButtonVariants()}
                      >
                        Confirm decline
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDeclineFor(null);
                          setDeclineReason("");
                        }}
                        className={outlineButtonVariants({ size: "sm" })}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void respond(r.id, "accept")}
                      className={solidButtonVariants({ size: "sm" })}
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeclineFor(r.id)}
                      className={outlineButtonVariants({ size: "sm" })}
                    >
                      Decline
                    </button>
                    <Link
                      href={`/licenses/requests/${r.id}`}
                      className={outlineButtonVariants({ size: "sm" })}
                    >
                      Open
                    </Link>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {history.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-medium">History</h2>
          <ul className="space-y-3">
            {history.map((r) => (
              <li
                key={r.id}
                className="rounded-xl border border-black/10 bg-white p-4 text-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {r.brand_name}
                      {r.brand_company ? (
                        <span className="font-normal text-neutral-700"> · {r.brand_company}</span>
                      ) : null}
                    </p>
                  </div>
                  <span
                    className={
                      r.status === "accepted"
                        ? "rounded-full border border-emerald-600/30 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-900"
                        : "rounded-full border border-black/15 bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-800"
                    }
                  >
                    {r.status === "accepted" ? "Accepted" : "Declined"}
                  </span>
                </div>
                <p className="mt-2 line-clamp-1 text-neutral-800">{r.intended_use}</p>
                {r.responded_at && (
                  <p className="mt-2 text-xs text-neutral-600">
                    Responded {formatDistanceToNow(new Date(r.responded_at), { addSuffix: true })}
                  </p>
                )}
                {r.status === "declined" && r.decline_reason ? (
                  <p className="mt-2 text-xs text-neutral-700">Note: {r.decline_reason}</p>
                ) : null}

                <Link
                  href={`/licenses/requests/${r.id}`}
                  className={cx(solidButtonVariants({ size: "sm" }), "mt-3 w-full sm:w-auto")}
                >
                  Open
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {withdrawn.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-medium">Withdrawn licenses</h2>
          <ul className="space-y-3">
            {withdrawn.map((r) => (
              <li
                key={r.id}
                className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-neutral-950">
                      {r.brand_name}
                      <span className="ml-2 font-normal text-neutral-700">{r.brand_email}</span>
                    </p>
                    {r.brand_company ? (
                      <p className="text-xs text-neutral-700">{r.brand_company}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="rounded-full border border-red-300 bg-white px-2 py-0.5 text-xs font-medium text-red-900">
                      Withdrawn
                    </span>
                    <span className="rounded-full border border-amber-400 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-950">
                      Under review
                    </span>
                  </div>
                </div>
                <p className="mt-2 line-clamp-2 text-xs text-neutral-800">
                  Reason: {cancellationReasonLabel(r.cancellation_reason)}
                  {r.cancellation_note ? ` — ${r.cancellation_note}` : ""}
                </p>
                {r.cancelled_at ? (
                  <p className="mt-1 text-xs text-neutral-600">
                    Cancelled {formatDistanceToNow(new Date(r.cancelled_at), { addSuffix: true })}
                  </p>
                ) : null}
                <p className="mt-2 text-[11px] text-neutral-700">
                  Questions?{" "}
                  <a href="mailto:support@muhr.app" className="font-medium text-emerald-800 hover:underline">
                    support@muhr.app
                  </a>
                </p>
                <Link
                  href={`/licenses/requests/${r.id}`}
                  className={cx(outlineButtonVariants({ size: "sm" }), "mt-3 w-full sm:w-auto")}
                >
                  View details
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!hasAny && (
        <p className="text-sm text-neutral-700">
          No license requests yet. Share your public profile with brands.
        </p>
      )}
    </div>
  );
}
