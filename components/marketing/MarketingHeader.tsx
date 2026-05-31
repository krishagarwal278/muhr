import Image from "next/image";
import Link from "next/link";
import { cx } from "@/lib/cx";

type MarketingHeaderProps = {
  activeNav?: "home" | "how-it-works";
};

const navLinkClass =
  "text-xs text-neutral-900/80 no-underline transition hover:text-neutral-950";

export function MarketingHeader({ activeNav }: MarketingHeaderProps) {
  return (
    <header className="relative z-header mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 md:py-5 lg:px-10 lg:py-6">
      <Link href="/" className="flex min-w-0 flex-1 items-center gap-2 no-underline md:gap-3">
        <Image
          src="/logo.png"
          alt="Muhr"
          width={30}
          height={30}
          className="h-auto w-auto shrink-0 rounded-2xl md:h-9 md:w-9"
        />
        <span className="min-w-0">
          <span className="block text-[10px] uppercase tracking-[0.22em] text-neutral-900/60 md:text-xs">
            Muhr
          </span>
          <span className="block text-xs font-semibold leading-snug tracking-tight text-neutral-950 break-words text-balance sm:text-sm md:text-base md:leading-tight">
            Vault, license, and earn from your likeness
          </span>
        </span>
      </Link>
      <nav className="flex shrink-0 items-center gap-5 md:gap-7" aria-label="Primary">
        <Link
          href="/how-it-works"
          aria-current={activeNav === "how-it-works" ? "page" : undefined}
          className={cx(
            "hidden no-underline md:block",
            navLinkClass,
            activeNav === "how-it-works" && "text-neutral-950"
          )}
        >
          How it works
        </Link>
        <Link href="/login" className={navLinkClass}>
          Sign in
        </Link>
      </nav>
    </header>
  );
}
