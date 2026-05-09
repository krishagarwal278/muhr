import Link from "next/link";

export default function ConsentHistoryPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/consent"
          className="inline-flex items-center gap-1 text-sm text-neutral-900/55 hover:text-neutral-950"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Back to Consent
        </Link>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">Consent history</h1>
        <p className="mt-1 text-sm text-neutral-900/60">
          View all changes to your consent rules
        </p>
      </div>

      {/* Empty state */}
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 py-16">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-black/5">
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
              d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium">No history yet</h3>
        <p className="mt-1 max-w-sm text-center text-sm text-neutral-900/60">
          Changes to your consent rules will appear here with timestamps.
        </p>
      </div>
    </div>
  );
}
