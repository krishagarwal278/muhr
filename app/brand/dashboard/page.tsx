import Link from "next/link";
import type { BrandDashboardCreator } from "@/lib/brand/loadBrandDashboard";
import { loadBrandDashboard } from "@/lib/brand/loadBrandDashboard";
import { publicProfileHref } from "@/lib/marketing/publicProfileNav";
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
      return "Active";
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

function CreatorCard({ c }: { c: BrandDashboardCreator }) {
  const handleDisplay = c.handle ? (c.handle.startsWith("@") ? c.handle : `@${c.handle}`) : null;
  const profileHref = c.handle ? publicProfileHref(c.handle, "brand") : null;

  return (
    <div className="rounded-xl border border-neutral-200/80 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-neutral-200 to-neutral-300 text-xs font-semibold text-neutral-700">
          {c.displayName.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-neutral-950">{c.displayName}</p>
          {handleDisplay ? (
            profileHref ? (
              <Link
                href={profileHref}
                className="mt-0.5 block truncate text-sm text-neutral-600 underline-offset-2 hover:text-neutral-950 hover:underline"
              >
                {handleDisplay}
              </Link>
            ) : (
              <p className="mt-0.5 truncate text-sm text-neutral-600">{handleDisplay}</p>
            )
          ) : (
            <p className="mt-0.5 truncate text-sm text-neutral-500">No public handle</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={cx(
                "inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
                statusBadgeClass(c.status)
              )}
            >
              {statusLabel(c.status)}
            </span>
          </div>
          <Link
            href={`/brand/licenses/requests/${c.requestId}`}
            className="mt-3 inline-block text-sm font-semibold text-emerald-800 underline-offset-2 hover:underline"
          >
            Manage license →
          </Link>
        </div>
      </div>
      <p className="mt-4 text-right text-sm font-semibold tabular-nums text-neutral-950">{formatInr(c.budgetInr)}</p>
    </div>
  );
}

export default async function BrandDashboardPage() {
  const { creators, metrics, error } = await loadBrandDashboard();

  const metricCards = [
    { label: "Active", value: String(metrics.active), hint: "Accepted licenses" },
    { label: "Pending", value: String(metrics.pending), hint: "Awaiting creator" },
    { label: "Creators", value: String(metrics.creatorsTouched), hint: "Unique creators you have requested" },
    {
      label: "Expiring 14d",
      value: String(metrics.expiring14d),
      hint: "Accepted rows with expires_at in the next 14 days",
    },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className={appPageTitleVariants()}>Dashboard</h1>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-900">
              Verified brand
            </span>
          </div>
          <p className="mt-1 text-sm text-neutral-600">Manage your creator roster and licensed assets.</p>
        </div>
      </div>

      {error ? (
        <div
          className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
          role="alert"
        >
          <p className="font-medium">Could not load license data</p>
          <p className="mt-1 text-red-800/90">{error}</p>
          <p className="mt-2 text-xs text-red-800/80">
            If license rows fail to load, apply brand RLS migrations to your Supabase project:{" "}
            <code className="rounded bg-red-100/80 px-1 font-mono text-[11px]">009_brand_dashboard_rls.sql</code>{" "}
            (email-matched reads), and if you applied{" "}
            <code className="rounded bg-red-100/80 px-1 font-mono text-[11px]">012_license_requests_brand_user_id.sql</code>{" "}
            then{" "}
            <code className="rounded bg-red-100/80 px-1 font-mono text-[11px]">
              013_restore_brand_email_license_policies.sql
            </code>{" "}
            restores messaging and dashboard access for all requests where your login email matches{" "}
            <span className="font-mono">brand_email</span>, not only rows with{" "}
            <span className="font-mono">brand_user_id</span> set.
          </p>
        </div>
      ) : null}

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {metricCards.map((m) => (
          <div key={m.label} className={surfaceCardVariants()}>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">{m.label}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-neutral-950">{m.value}</p>
            <p className="mt-1 text-xs text-neutral-500">{m.hint}</p>
          </div>
        ))}
      </div>

      <section className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight text-neutral-950">Your creators</h2>
          <Link
            href="/marketplace"
            className="text-sm font-medium text-neutral-700 underline-offset-2 hover:text-neutral-950 hover:underline"
          >
            Browse marketplace →
          </Link>
        </div>
        <p className="mt-1 text-xs text-neutral-500">
          Pulled from license requests where the brand email matches your signed-in account.
        </p>

        <div
          className={cx(
            surfaceCardVariants({ padding: "none", interactive: "none" }),
            "mt-4 min-h-[120px]"
          )}
        >
          {creators.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
              <p className="text-sm font-medium text-neutral-800">No creators yet</p>
              <p className="max-w-md text-sm text-neutral-600">
                Submit a license request from a creator&apos;s public page (same email you use to sign in here).
                Accepted and pending requests show up as cards below.
              </p>
              <Link
                href="/marketplace"
                className="mt-2 text-sm font-medium text-neutral-950 underline-offset-2 hover:underline"
              >
                Open marketplace →
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
              {creators.map((c) => (
                <CreatorCard key={c.creatorId} c={c} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
