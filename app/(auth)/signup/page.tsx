import Link from "next/link";

export default function SignupPage() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 sm:p-8 text-center">
      <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
        Access only for beta testers
      </p>
      <h1 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">Registration closed</h1>
      <p className="mt-3 text-sm text-zinc-300">
        New accounts are not available during the beta. If you have access, sign in with your invited account.
      </p>
      <Link
        href="/login"
        className="mt-6 inline-flex w-full justify-center rounded-lg bg-white py-2.5 text-sm font-medium text-black transition hover:opacity-90"
      >
        Sign in
      </Link>
    </div>
  );
}
