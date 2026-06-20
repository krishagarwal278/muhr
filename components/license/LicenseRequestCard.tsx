"use client";

import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import type { LicenseRequestRow } from "@/types/license";
import { cancellationReasonLabel } from "@/lib/license/cancellationReasons";
import {
  brandAvatarColor,
  brandInitials,
  formatLicenseBudget,
} from "@/lib/license/brandAvatar";
import {
  formatActiveLicenseExpiry,
  formatBriefExpiry,
  formatDateReceived,
} from "@/lib/license/dates";
import { cx } from "@/lib/cx";
import { dangerButtonVariants, outlineButtonVariants } from "@/components/ui/button-recipes";

export type LicenseRequestCardVariant = "default" | "active" | "history" | "withdrawn";

function BrandAvatar({ name }: { name: string }) {
  return (
    <div
      className={cx(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xs font-semibold text-white",
        brandAvatarColor(name),
      )}
    >
      {brandInitials(name)}
    </div>
  );
}

function briefMeta(request: LicenseRequestRow, includeDuration = true): string {
  const channels = (request.channels ?? []).slice(0, 2).join(" · ");
  const territories = (request.territories ?? []).slice(0, 1).join("");
  const parts = [
    channels || null,
    includeDuration && request.duration_days ? `${request.duration_days} days` : null,
    territories || null,
  ].filter(Boolean);
  return parts.join(" · ");
}

function activeDealStatus(request: LicenseRequestRow): { label: string; className: string } {
  if (!request.creator_signed_contract_at || !request.brand_signed_contract_at) {
    return { label: "Action needed", className: "bg-amber-50 text-amber-900 border-amber-200" };
  }
  if (request.contract_effective_at) {
    return { label: "Live", className: "bg-emerald-50 text-emerald-900 border-emerald-200" };
  }
  return { label: "In production", className: "bg-sky-50 text-sky-900 border-sky-200" };
}

function activeProgressPercent(request: LicenseRequestRow): number {
  if (request.contract_effective_at) return 100;
  if (request.creator_signed_contract_at && request.brand_signed_contract_at) return 66;
  if (request.creator_signed_contract_at || request.brand_signed_contract_at) return 33;
  return 15;
}

function historyStatus(request: LicenseRequestRow): { label: string; className: string } {
  if (request.status === "withdrawn") {
    return { label: "Withdrawn", className: "text-red-700" };
  }
  if (request.status === "declined") {
    return { label: "Declined", className: "text-neutral-500" };
  }
  return { label: "Completed", className: "text-neutral-500" };
}

export function LicenseRequestCard({
  request,
  variant = "default",
  onAccept,
  onDeclineStart,
  declineOpen,
  declineReason,
  onDeclineReasonChange,
  onDeclineConfirm,
  onDeclineCancel,
}: {
  request: LicenseRequestRow;
  variant?: LicenseRequestCardVariant;
  onAccept?: () => void;
  onDeclineStart?: () => void;
  declineOpen?: boolean;
  declineReason?: string;
  onDeclineReasonChange?: (value: string) => void;
  onDeclineConfirm?: () => void;
  onDeclineCancel?: () => void;
}) {
  const budget = request.agreed_budget_inr ?? request.budget_inr;
  const received = formatDateReceived(request);
  const briefExpiry = formatBriefExpiry(request);

  if (variant === "default") {
    return (
      <li className="px-5 py-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <BrandAvatar name={request.brand_name} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-neutral-950">{request.brand_name}</p>
              <p className="mt-0.5 truncate text-xs text-neutral-600">
                {briefMeta(request) || request.intended_use}
              </p>
              <p className="mt-1 line-clamp-1 text-xs text-neutral-500">{request.intended_use}</p>
              <p className="mt-1 text-xs text-neutral-600">{received}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-4 sm:justify-end">
            <p className="text-sm font-semibold tabular-nums text-neutral-950">
              {formatLicenseBudget(budget)}
            </p>
            <Link
              href={`/licenses/requests/${request.id}`}
              className="inline-flex items-center justify-center rounded-full bg-[#2D5BFF] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#2548d9]"
            >
              Review
            </Link>
          </div>
        </div>
        {briefExpiry ? (
          <p className="mt-3 text-right text-xs text-neutral-600">{briefExpiry}</p>
        ) : null}

        {declineOpen ? (
          <div className="mt-4 space-y-2 border-t border-neutral-200 pt-4">
            <input
              value={declineReason ?? ""}
              onChange={(e) => onDeclineReasonChange?.(e.target.value)}
              placeholder="Optional note to brand"
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs text-neutral-950 outline-none placeholder:text-neutral-500"
            />
            <div className="flex gap-2">
              <button type="button" onClick={onDeclineConfirm} className={dangerButtonVariants({ size: "sm" })}>
                Confirm decline
              </button>
              <button type="button" onClick={onDeclineCancel} className={outlineButtonVariants({ size: "sm" })}>
                Cancel
              </button>
            </div>
          </div>
        ) : onAccept && onDeclineStart ? (
          <div className="mt-3 flex flex-wrap gap-2 border-t border-neutral-100 pt-3">
            <button
              type="button"
              onClick={onAccept}
              className="text-xs font-semibold text-[#2D5BFF] hover:underline"
            >
              Quick accept
            </button>
            <button
              type="button"
              onClick={onDeclineStart}
              className="text-xs font-medium text-neutral-500 hover:text-neutral-800 hover:underline"
            >
              Decline
            </button>
          </div>
        ) : null}
      </li>
    );
  }

  if (variant === "active") {
    const status = activeDealStatus(request);
    const progress = activeProgressPercent(request);
    const licenseExpiry = formatActiveLicenseExpiry(request);

    return (
      <li className="px-5 py-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <BrandAvatar name={request.brand_name} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-neutral-950">{request.brand_name}</p>
                <span
                  className={cx(
                    "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                    status.className,
                  )}
                >
                  {status.label}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-neutral-600">
                {briefMeta(request, false) || request.intended_use}
              </p>
              <div className="mt-4">
                <div className="h-1.5 overflow-hidden rounded-full bg-neutral-200">
                  <div
                    className="h-full rounded-full bg-[#2D5BFF] transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-medium text-neutral-500">
                  <span className={progress >= 33 ? "text-neutral-800" : undefined}>Deal signed</span>
                  <span className={progress >= 66 ? "text-neutral-800" : undefined}>Final cut review</span>
                  <span className={progress >= 100 ? "text-neutral-800" : undefined}>Payout</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end justify-between self-stretch sm:min-w-[9rem]">
            <div className="flex flex-1 items-center gap-4">
              <p className="text-sm font-semibold tabular-nums text-neutral-950">
                {formatLicenseBudget(budget)}
              </p>
              <Link
                href={`/licenses/requests/${request.id}`}
                className={outlineButtonVariants({ size: "sm" })}
              >
                View
              </Link>
            </div>
            {licenseExpiry ? (
              <p className="text-xs text-neutral-600">{licenseExpiry}</p>
            ) : null}
          </div>
        </div>
      </li>
    );
  }

  const status = historyStatus(request);

  return (
    <li className="px-5 py-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <BrandAvatar name={request.brand_name} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-neutral-950">{request.brand_name}</p>
            <p className="mt-0.5 truncate text-xs text-neutral-600">
              {request.intended_use}
              {request.responded_at
                ? ` · ${formatDistanceToNow(new Date(request.responded_at), { addSuffix: true })}`
                : request.cancelled_at
                  ? ` · ${formatDistanceToNow(new Date(request.cancelled_at), { addSuffix: true })}`
                  : ""}
            </p>
            {variant === "withdrawn" && request.cancellation_reason ? (
              <p className="mt-1 text-xs text-neutral-500">
                {cancellationReasonLabel(request.cancellation_reason)}
                {request.cancellation_note ? ` — ${request.cancellation_note}` : ""}
              </p>
            ) : null}
            {variant === "history" && request.status === "declined" && request.decline_reason ? (
              <p className="mt-1 text-xs text-neutral-500">Note: {request.decline_reason}</p>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-4 sm:justify-end">
          <div className="text-right">
            <p className="text-sm font-semibold tabular-nums text-neutral-950">
              {formatLicenseBudget(budget)}
            </p>
            <p className={cx("text-xs font-medium", status.className)}>{status.label}</p>
          </div>
          <Link
            href={`/licenses/requests/${request.id}`}
            className={outlineButtonVariants({ size: "sm" })}
          >
            View
          </Link>
        </div>
      </div>
    </li>
  );
}
