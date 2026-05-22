import Link from "next/link";
import { isBrandWorkspaceUser } from "@/lib/brand/brandPreviewSignIn";
import { createServerClient, getUser } from "@/lib/supabase/server";
import { publicProfileHref } from "@/lib/marketing/publicProfileNav";
import { appPageTitleVariants } from "@/components/ui/page-header";
import { surfaceCardVariants } from "@/components/ui/surface-card";

export const dynamic = "force-dynamic";

type RpcRow = {
  handle: string;
  display_name: string;
  accepting_requests: boolean;
};

export default async function MarketplacePage() {
  const supabase = await createServerClient();
  const user = await getUser();
  const showBrandNav = user ? isBrandWorkspaceUser(user.email) : false;
  const { data, error } = await supabase.rpc("list_public_creators", {
    p_limit: 72,
    p_offset: 0,
  });

  if (error) {
    console.error("[marketplace] list_public_creators failed", {
      code: error.code,
      message: error.message,
    });
  }

  const rows: RpcRow[] = Array.isArray(data) ? (data as RpcRow[]) : [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <nav
        className="mb-6 flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-neutral-200/90 pb-4 text-sm text-neutral-600"
        aria-label="Marketplace navigation"
      >
        {showBrandNav ? (
          <Link
            href="/brand/dashboard"
            className="font-medium text-neutral-800 underline-offset-2 hover:text-neutral-950 hover:underline"
          >
            ← Back to Brand workspace
          </Link>
        ) : null}
      </nav>

      <div className="max-w-2xl">
        <h1 className={appPageTitleVariants()}>Marketplace</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Creators on Muhr with a public profile. Open a card to review their page and send a license request.
        </p>
      </div>

      {error ? (
        <div
          className="mt-8 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          role="status"
        >
          <p className="font-medium">The creator directory is temporarily unavailable</p>
          <p className="mt-1 text-amber-950/90">
            Refresh the page in a moment. If it keeps happening, reach us at{" "}
            <a
              href="mailto:support@muhr.app"
              className="font-medium underline-offset-2 hover:underline"
            >
              support@muhr.app
            </a>
            .
          </p>
        </div>
      ) : rows.length === 0 ? (
        <p className="mt-10 text-sm text-neutral-600">
          No public creator profiles yet. Handles appear here once creators set a handle on their account.
        </p>
      ) : (
        <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((row) => {
            const h = row.handle.trim();
            const href = publicProfileHref(h, showBrandNav ? "brand" : "marketplace");
            const at = h.startsWith("@") ? h : `@${h}`;
            return (
              <li key={h}>
                <Link
                  href={href}
                  className={`block ${surfaceCardVariants({ interactive: "subtle" })}`}
                >
                  <p className="font-medium text-neutral-950">{row.display_name}</p>
                  <p className="mt-1 text-sm text-neutral-600">{at}</p>
                  <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                    {row.accepting_requests ? "Accepting requests" : "Not accepting requests"}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
