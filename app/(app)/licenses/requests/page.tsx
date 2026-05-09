import Link from "next/link";

export default function LicenseRequestsPage() {
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
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">License requests</h1>
        <p className="mt-1 text-sm text-neutral-900/60">
          Review and approve incoming license requests
        </p>
      </div>

      {/* Empty state */}
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/20 py-16">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/5">
          <svg
            className="h-7 w-7 text-neutral-900/45"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 13.5h3.86a2.25 2.25 0 0 1 2.012 1.244l.256.512a2.25 2.25 0 0 0 2.013 1.244h3.218a2.25 2.25 0 0 0 2.013-1.244l.256-.512a2.25 2.25 0 0 1 2.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 0 0-2.15-1.588H6.911a2.25 2.25 0 0 0-2.15 1.588L2.35 13.177a2.25 2.25 0 0 0-.1.661Z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium">No pending requests</h3>
        <p className="mt-1 max-w-sm text-center text-sm text-neutral-900/55">
          When brands request to license your likeness, they&apos;ll appear here for your review.
        </p>
      </div>
    </div>
  );
}
