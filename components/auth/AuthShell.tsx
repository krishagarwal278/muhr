import Link from "next/link";
import Image from "next/image";

/** Shared chrome for /login, /signup, /verify, and /update-password. */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-neutral-950 text-zinc-100">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.png" alt="Muhr" width={28} height={28} className="rounded-xl" />
          <span className="text-sm font-semibold tracking-tight">Muhr</span>
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
