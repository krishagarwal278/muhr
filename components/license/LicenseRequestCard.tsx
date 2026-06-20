"use client";

import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import type { LicenseRequestRow } from "@/types/license";
import { cancellationReasonLabel } from "@/lib/license/cancellationReasons";
import { cx } from "@/lib/cx";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  dangerButtonVariants,
  outlineButtonVariants,
  solidButtonVariants,
} from "@/components/ui/button-recipes";

export type LicenseRequestCardVariant = "default" | "active" | "history" | "withdrawn";

type VariantConfig = {
  shell: string;
  briefClass: string;
  showChannels: boolean;
  showCreatedAt: boolean;
  linkStyle: "outline" | "solid";
  linkLabel: string;
};

const VARIANT_CONFIG: Record<LicenseRequestCardVariant, VariantConfig> = {
  default: {
    shell: "border-black/10 bg-white",
    briefClass: "line-clamp-2 text-sm",
    showChannels: true,
    showCreatedAt: true,
    linkStyle: "outline",
    linkLabel: "Open",
  },
  active: {
    shell: "border-black/10 bg-white",
    briefClass: "line-clamp-1 text-xs",
    showChannels: false,
    showCreatedAt: false,
    linkStyle: "solid",
    linkLabel: "View",
  },
  history: {
    shell: "border-black/10 bg-white",
    briefClass: "line-clamp-2 text-sm",
    showChannels: true,
    showCreatedAt: false,
    linkStyle: "solid",
    linkLabel: "View",
  },
  withdrawn: {
    shell: "border-red-200 bg-red-50",
    briefClass: "line-clamp-2 text-sm",
    showChannels: true,
    showCreatedAt: false,
    linkStyle: "solid",
    linkLabel: "View",
  },
};

function ChannelTags({ channels }: { channels: string[] }) {
  return (channels ?? []).slice(0, 4).map((channel) => (
    <span
      key={channel}
      className="rounded-full bg-black/[0.06] px-2 py-0.5 text-[10px] font-medium text-neutral-800"
    >
      {channel}
    </span>
  ));
}

function StatusPill({ variant, request }: { variant: LicenseRequestCardVariant; request: LicenseRequestRow }) {
  if (variant === "active") return <StatusBadge tone="active">Active</StatusBadge>;
  if (variant === "withdrawn") return <StatusBadge tone="danger">Withdrawn</StatusBadge>;
  if (variant === "history") {
    return (
      <StatusBadge tone={request.status === "accepted" ? "active" : "neutral"}>
        {request.status === "accepted" ? "Accepted" : "Declined"}
      </StatusBadge>
    );
  }
  return null;
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
  const config = VARIANT_CONFIG[variant];
  const budget = request.agreed_budget_inr ?? request.budget_inr;

  return (
    <li className={cx("rounded-xl border p-4 text-sm", config.shell)}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium">
            {request.brand_name}
            {request.brand_company ? (
              <span className="font-normal text-neutral-700"> · {request.brand_company}</span>
            ) : null}
          </p>
          {variant === "withdrawn" ? (
            <p className="text-xs text-neutral-700">{request.brand_email}</p>
          ) : null}
        </div>
        {config.showCreatedAt ? (
          <p className="text-xs text-neutral-600">
            {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
          </p>
        ) : (
          <StatusPill variant={variant} request={request} />
        )}
      </div>

      <p className={cx("mt-2 text-neutral-800", config.briefClass)}>{request.intended_use}</p>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className="text-xs font-medium tabular-nums text-neutral-700">
          {request.duration_days}d
          {budget != null ? ` · ₹${budget.toLocaleString("en-IN")}` : ""}
        </span>
        {config.showChannels ? <ChannelTags channels={request.channels ?? []} /> : null}
      </div>

      {request.responded_at && variant === "history" ? (
        <p className="mt-2 text-xs text-neutral-600">
          Responded {formatDistanceToNow(new Date(request.responded_at), { addSuffix: true })}
        </p>
      ) : null}

      {variant === "history" && request.status === "declined" && request.decline_reason ? (
        <p className="mt-2 text-xs text-neutral-700">Note: {request.decline_reason}</p>
      ) : null}

      {variant === "withdrawn" ? (
        <>
          <p className="mt-2 line-clamp-2 text-xs text-neutral-800">
            Reason: {cancellationReasonLabel(request.cancellation_reason)}
            {request.cancellation_note ? ` — ${request.cancellation_note}` : ""}
          </p>
          {request.cancelled_at ? (
            <p className="mt-1 text-xs text-neutral-600">
              Cancelled {formatDistanceToNow(new Date(request.cancelled_at), { addSuffix: true })}
            </p>
          ) : null}
        </>
      ) : null}

      {declineOpen ? (
        <div className="mt-3 space-y-2 border-t border-black/10 pt-3">
          <input
            value={declineReason ?? ""}
            onChange={(e) => onDeclineReasonChange?.(e.target.value)}
            placeholder="Optional note to brand"
            className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-xs text-neutral-950 outline-none placeholder:text-neutral-500"
          />
          <div className="flex gap-2">
            <button type="button" onClick={onDeclineConfirm} className={dangerButtonVariants()}>
              Confirm decline
            </button>
            <button type="button" onClick={onDeclineCancel} className={outlineButtonVariants({ size: "sm" })}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {variant === "default" && onAccept && onDeclineStart ? (
            <>
              <button type="button" onClick={onAccept} className={solidButtonVariants({ size: "sm" })}>
                Accept
              </button>
              <button type="button" onClick={onDeclineStart} className={outlineButtonVariants({ size: "sm" })}>
                Decline
              </button>
            </>
          ) : null}
          <Link
            href={`/licenses/requests/${request.id}`}
            className={cx(
              config.linkStyle === "outline"
                ? outlineButtonVariants({ size: "sm" })
                : solidButtonVariants({ size: "sm" }),
              "w-full sm:w-auto"
            )}
          >
            {config.linkLabel}
          </Link>
        </div>
      )}
    </li>
  );
}
