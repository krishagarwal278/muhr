import Link from "next/link";

/**
 * Legacy route: in-app brand signing was removed. Old links land here.
 * The `[token]` segment is ignored; creators should share exports (Word/PDF) instead.
 */
export default function LicenseSignDeprecatedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-neutral-950 px-6 py-16 text-center text-zinc-100">
      <div className="max-w-md space-y-3">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-400">Muhr</p>
        <h1 className="text-xl font-semibold tracking-tight text-white">Signing link no longer used</h1>
        <p className="text-sm text-zinc-300">
          License agreements are now edited and saved in the creator&apos;s Muhr workspace, then exported
          (Word or PDF) for review and signing outside the app. Ask the creator to send you the latest
          contract file or a link to their preferred e-sign process.
        </p>
      </div>
      <Link
        href="/"
        className="text-sm text-emerald-300 underline-offset-4 hover:text-emerald-200 hover:underline"
      >
        Back to Muhr
      </Link>
    </div>
  );
}
