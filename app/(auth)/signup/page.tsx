import Link from "next/link";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ intent?: string }>;
}) {
  const { intent } = await searchParams;
  const brandIntent = intent === "brand";

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-center sm:p-8">
      <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
        Access only for beta testers
      </p>
      <h1 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">
        {brandIntent ? "Brand sign-up closed" : "Registration closed"}
      </h1>
      <p className="mt-3 text-sm text-zinc-300">
        {brandIntent ? (
          <>
            Muhr does not offer public brand accounts yet. The brand dashboard is an internal preview on top of
            standard sign-in. When org-backed brands launch, self-serve sign-up will return here.
          </>
        ) : (
          <>New accounts are not available during the beta. If you have access, sign in with your invited account.</>
        )}
      </p>
      <Link
        href={brandIntent ? "/login?next=/brand/dashboard" : "/login"}
        className="mt-6 inline-flex w-full justify-center rounded-lg bg-white py-2.5 text-sm font-medium text-black transition hover:opacity-90"
      >
        {brandIntent ? "Sign in to brand preview" : "Sign in"}
      </Link>
    </div>
  );
}
