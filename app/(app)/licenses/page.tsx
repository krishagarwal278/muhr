import Link from "next/link";
import { IncomingLicenseRequests } from "@/components/license/IncomingLicenseRequests";

export default function LicensesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Licenses</h1>
          <p className="mt-1 text-sm text-neutral-800">
            Active and past licensing agreements
          </p>
        </div>
        <Link
          href="/licenses/requests"
          className="flex items-center gap-2 rounded-lg border border-black/10 bg-white/70 px-4 py-2 text-sm font-medium text-neutral-900 transition hover:bg-white"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 0 1 2.012 1.244l.256.512a2.25 2.25 0 0 0 2.013 1.244h3.218a2.25 2.25 0 0 0 2.013-1.244l.256-.512a2.25 2.25 0 0 1 2.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 0 0-2.15-1.588H6.911a2.25 2.25 0 0 0-2.15 1.588L2.35 13.177a2.25 2.25 0 0 0-.1.661Z" />
          </svg>
          Requests
        </Link>
      </div>

      <IncomingLicenseRequests />

      {/* Empty state — formal license agreements (future) */}
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-black/15 bg-white/60 py-16">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-black/[0.03]">
          <svg
            className="h-7 w-7 text-neutral-700"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium">No licenses yet</h3>
        <p className="mt-1 max-w-sm text-center text-sm text-neutral-700">
          When brands license your likeness, agreements will appear here.
        </p>
      </div>
    </div>
  );
}
