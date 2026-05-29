import Link from "next/link";
import { IncomingLicenseRequests } from "@/components/license/IncomingLicenseRequests";
import { ghostButtonVariants } from "@/components/ui/button-recipes";
import { cx } from "@/lib/cx";

export default function LicensesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Licenses</h1>
        <Link
          href="/licenses/requests"
          className={cx(ghostButtonVariants(), "gap-2")}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 0 1 2.012 1.244l.256.512a2.25 2.25 0 0 0 2.013 1.244h3.218a2.25 2.25 0 0 0 2.013-1.244l.256-.512a2.25 2.25 0 0 1 2.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 0 0-2.15-1.588H6.911a2.25 2.25 0 0 0-2.15 1.588L2.35 13.177a2.25 2.25 0 0 0-.1.661Z" />
          </svg>
          Requests
        </Link>
      </div>

      <IncomingLicenseRequests />

      {/* Formal license agreements (future) — hide when accepted deals already appear in history */}
    </div>
  );
}
