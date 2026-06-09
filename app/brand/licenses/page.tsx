import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { loadBrandLicenseList } from "@/lib/brand/loadBrandDashboard";
import { appPageTitleVariants } from "@/components/ui/page-header";
import { surfaceCardVariants } from "@/components/ui/surface-card";
import { cx } from "@/lib/cx";

export const dynamic = "force-dynamic";

function formatInr(n: number | null): string {
  if (n == null) return "—";
  return `₹${n.toLocaleString("en-IN")}`;
}

function statusLabel(status: string): string {
  switch (status) {
    case "accepted":
      return "Accepted";
    case "pending":
      return "Pending";
    case "declined":
      return "Declined";
    case "expired":
      return "Expired";
    case "withdrawn":
      return "Withdrawn";
    default:
      return status;
  }
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case "accepted":
      return "border-emerald-200 bg-emerald-50 text-emerald-900";
    case "pending":
      return "border-amber-200 bg-amber-50 text-amber-950";
    case "declined":
    case "expired":
    case "withdrawn":
      return "border-neutral-200 bg-neutral-100 text-neutral-700";
    default:
      return "border-neutral-200 bg-neutral-50 text-neutral-800";
  }
}

export default async function BrandLicensesPage() {
  const { rows, error } = await loadBrandLicenseList();

  return (
    <div>
      <h1 className={appPageTitleVariants()}>Licenses</h1>
      <p className="mt-2 max-w-2xl text-sm text-neutral-600">
        Open a request to message the creator, align on fees, edit the shared contract, complete the payment checkpoint,
        and sign. The agreement is not in force until payment is recorded and both parties have signed.
      </p>

      {error ? (
        <div
          className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
          role="alert"
        >
          <p className="font-medium">We couldn’t load your licenses right now</p>
          <p className="mt-1 text-red-800/90">
            Refresh the page in a moment. If this keeps happening, reach us at{" "}
            <a
              href="mailto:contact@muhr.app"
              className="font-medium underline-offset-2 hover:underline"
            >
              contact@muhr.app
            </a>
            .
          </p>
        </div>
      ) : null}

      <div className={cx(surfaceCardVariants({ padding: "none", interactive: "none" }), "mt-8 overflow-hidden")}>
        {rows.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-neutral-600">
            No license requests yet. Browse the marketplace and send a request from a creator profile.
          </div>
        ) : (
          <ul className="divide-y divide-neutral-200/80">
            {rows.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/brand/licenses/requests/${r.id}`}
                  className="flex flex-col gap-2 px-5 py-4 transition hover:bg-neutral-50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-neutral-950">{r.displayName}</p>
                    <p className="mt-0.5 text-xs text-neutral-500">
                      Submitted {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                    <span
                      className={cx(
                        "inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
                        statusBadgeClass(r.status)
                      )}
                    >
                      {statusLabel(r.status)}
                    </span>
                    <span className="text-sm tabular-nums text-neutral-700">
                      Budget {formatInr(r.budget_inr)}
                      {r.agreed_budget_inr != null ? (
                        <span className="text-emerald-800"> · Agreed {formatInr(r.agreed_budget_inr)}</span>
                      ) : null}
                    </span>
                    <span className="text-sm font-semibold text-emerald-800">Open →</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
