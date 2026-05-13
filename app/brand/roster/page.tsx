import Link from "next/link";
import { BRAND_ROSTER_AVAILABLE } from "@/lib/brand/rosterAvailability";
import { appPageTitleVariants } from "@/components/ui/page-header";

export default function BrandRosterPage() {
  if (BRAND_ROSTER_AVAILABLE) {
    return (
      <div>
        <h1 className={appPageTitleVariants()}>Roster</h1>
        <p className="mt-2 text-sm text-neutral-600">Connect org-backed roster data here.</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg">
      <h1 className={appPageTitleVariants()}>Roster</h1>
      <p className="mt-3 text-sm text-neutral-600">
        Multi-org roster management (creators tied to your brand workspace, invitations, and roles) is not available
        yet. It lands with the org and membership model described in your architecture guide.
      </p>
      <p className="mt-4">
        <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-amber-950">
          Coming soon
        </span>
      </p>
      <p className="mt-6 text-sm">
        <Link href="/brand/dashboard" className="font-medium text-neutral-950 underline-offset-2 hover:underline">
          ← Back to dashboard
        </Link>
      </p>
    </div>
  );
}
