import Link from "next/link";

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-center sm:p-8">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
        <svg
          className="h-6 w-6 text-emerald-400"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
          />
        </svg>
      </div>

      <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Check your email</h1>
      <p className="mt-2 text-sm text-zinc-300">
        We sent a verification link to{" "}
        <span className="font-medium text-zinc-50">{email || "your email"}</span>.
      </p>
      <p className="mt-1 text-sm text-zinc-300">
        Click the link to verify your account.
      </p>

      <div className="mt-6 rounded-lg bg-white/5 p-4 text-left">
        <p className="text-xs font-medium text-zinc-300">Didn&apos;t receive the email?</p>
        <ul className="mt-2 space-y-1 text-xs text-zinc-400">
          <li>• Check your spam or junk folder</li>
          <li>• Make sure you entered the correct email</li>
          <li>• Wait a few minutes and try again</li>
        </ul>
      </div>

      <Link
        href="/login"
        className="mt-6 inline-block text-sm text-zinc-100 underline underline-offset-2 hover:text-white hover:no-underline"
      >
        Back to sign in
      </Link>
    </div>
  );
}
