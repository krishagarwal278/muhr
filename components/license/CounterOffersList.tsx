"use client";

import { formatDistanceToNow } from "date-fns";
import { primaryButtonVariants, ghostButtonVariants } from "@/components/ui/button-recipes";
import { surfaceCardVariants } from "@/components/ui/surface-card";
import { cx } from "@/lib/cx";

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

interface CounterOffersListProps {
  counterOffers: CounterOfferRow[];
  viewerRole: "creator" | "brand";
  onAccept?: (counterOfferId: string) => void;
  onDecline?: (counterOfferId: string) => void;
  busy?: boolean;
}

function StatusBadge({ status }: { status: CounterOfferRow["status"] }) {
  if (status === "accepted") {
    return (
      <span className="rounded-full border border-emerald-600/25 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-900">
        Accepted
      </span>
    );
  }
  if (status === "declined") {
    return (
      <span className="rounded-full border border-red-500/30 bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-900">
        Declined
      </span>
    );
  }
  return (
    <span className="rounded-full border border-purple-500/35 bg-purple-50 px-2.5 py-0.5 text-xs font-medium text-purple-950">
      Pending
    </span>
  );
}

/**
 * Displays a list of counter-offers for a license request.
 * Brands can accept or decline pending offers; creators see their sent offers.
 */
export function CounterOffersList({
  counterOffers,
  viewerRole,
  onAccept,
  onDecline,
  busy = false,
}: CounterOffersListProps) {
  if (counterOffers.length === 0) {
    return null;
  }

  const isBrand = viewerRole === "brand";
  const pendingOffers = counterOffers.filter((o) => o.status === "pending");

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-medium">
        {isBrand ? "Counter-offers from creator" : "Your counter-offers"}
      </h2>
      <div className="space-y-3">
        {counterOffers.map((offer) => (
          <div
            key={offer.id}
            className={cx(
              surfaceCardVariants({ padding: "md", interactive: "none" }),
              "space-y-4",
              offer.status === "pending" && isBrand
                ? "border-purple-200 bg-gradient-to-br from-purple-50/40 to-indigo-50/20"
                : ""
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-neutral-950">
                    Proposed {formatDistanceToNow(new Date(offer.created_at), { addSuffix: true })}
                  </p>
                  <StatusBadge status={offer.status} />
                </div>
                {offer.responded_at ? (
                  <p className="mt-0.5 text-xs text-neutral-600">
                    Responded {formatDistanceToNow(new Date(offer.responded_at), { addSuffix: true })}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
                  Proposed channels
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {offer.channels.map((c) => (
                    <span
                      key={c}
                      className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-900"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
                  Proposed territories
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {offer.territories.map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-purple-200 bg-white px-2.5 py-0.5 text-xs text-purple-900"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-6 border-t border-black/10 pt-3 text-sm">
              <div>
                <p className="text-xs font-medium text-neutral-600">Proposed duration</p>
                <p className="mt-0.5 font-semibold text-neutral-900">{offer.duration_days} days</p>
              </div>
              <div>
                <p className="text-xs font-medium text-neutral-600">Proposed budget (INR)</p>
                <p className="mt-0.5 text-lg font-semibold tabular-nums text-neutral-900">
                  ₹{offer.proposed_budget_inr.toLocaleString("en-IN")}
                </p>
              </div>
            </div>

            {offer.note ? (
              <div className="rounded-lg border border-neutral-200/80 bg-neutral-50/60 px-3 py-2 text-sm text-neutral-800">
                <p className="font-medium text-neutral-600">Note from creator:</p>
                <p className="mt-1 whitespace-pre-wrap">{offer.note}</p>
              </div>
            ) : null}

            {isBrand && offer.status === "pending" && onAccept && onDecline ? (
              <div className="flex flex-wrap gap-2 border-t border-purple-200/60 pt-3">
                <button
                  type="button"
                  onClick={() => onAccept(offer.id)}
                  disabled={busy}
                  className={primaryButtonVariants()}
                >
                  Accept counter-offer
                </button>
                <button
                  type="button"
                  onClick={() => onDecline(offer.id)}
                  disabled={busy}
                  className={ghostButtonVariants()}
                >
                  Decline
                </button>
              </div>
            ) : null}

            {offer.status === "accepted" && (
              <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
                {isBrand
                  ? "You accepted this counter-offer. The license terms have been updated."
                  : "The brand accepted this counter-offer. The license terms have been updated."}
              </p>
            )}

            {offer.status === "declined" && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
                {isBrand
                  ? "You declined this counter-offer."
                  : "The brand declined this counter-offer."}
              </p>
            )}
          </div>
        ))}
      </div>

      {isBrand && pendingOffers.length > 0 && (
        <p className="text-xs text-neutral-600">
          Accepting a counter-offer updates the license request with the proposed channels, territories,
          duration, and budget.
        </p>
      )}
    </section>
  );
}
