import Link from "next/link";
import { notFound } from "next/navigation";

export default async function LicenseDetailPage({
  params,
}: {
  params: Promise<{ licenseId: string }>;
}) {
  const { licenseId } = await params;

  if (!licenseId) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/licenses"
          className="inline-flex items-center gap-1 text-sm text-neutral-900/55 hover:text-neutral-950"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Back to Licenses
        </Link>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">License Details</h1>
        <p className="mt-1 text-sm text-neutral-900/60">License ID: {licenseId}</p>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
        <p className="text-sm text-neutral-900/60">License details will appear here once implemented.</p>
      </div>
    </div>
  );
}
