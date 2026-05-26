import Image from "next/image";
import Link from "next/link";
import { appPageHeaderVariants, appPageTitleVariants } from "@/components/ui/page-header";
import { ghostButtonVariants } from "@/components/ui/button-recipes";

export function VaultArchiveHeader({ itemCount }: { itemCount?: number }) {
  return (
    <header className={appPageHeaderVariants()}>
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-amber-200/90 bg-amber-50 shadow-sm"
          aria-hidden
        >
          <Image src="/logo.png" alt="" width={32} height={32} className="rounded-md" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className={appPageTitleVariants()}>Archive</h1>
            {typeof itemCount === "number" && itemCount > 0 ? (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-amber-950">
                {itemCount}
              </span>
            ) : null}
          </div>
        </div>
      </div>
      <Link href="/vault" className={ghostButtonVariants({ size: "sm" })}>
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
        </svg>
        Vault
      </Link>
    </header>
  );
}
