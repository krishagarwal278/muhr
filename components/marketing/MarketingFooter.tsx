import Link from "next/link";

export function MarketingFooter() {
  return (
    <footer className="border-t border-black/10">
      <section className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-5 py-6 text-[11px] text-neutral-900/45 sm:flex-row sm:gap-4 sm:px-6 sm:py-8 sm:text-xs lg:px-10">
        <span>© {new Date().getFullYear()} Muhr. All rights reserved.</span>
        <nav className="flex gap-5 sm:gap-6" aria-label="Legal">
          <Link href="/privacy" className="transition hover:text-neutral-950">
            Privacy
          </Link>
          <Link href="/terms" className="transition hover:text-neutral-950">
            Terms
          </Link>
          <Link href="/cookies" className="transition hover:text-neutral-950">
            Cookies
          </Link>
        </nav>
      </section>
    </footer>
  );
}
