"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatAuthCallbackError } from "@/lib/auth/authCallbackMessages";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [callbackMessage, setCallbackMessage] = useState<string | null>(null);

  useEffect(() => {
    const err = searchParams.get("error");
    const code = searchParams.get("error_code");
    const desc = searchParams.get("error_description");
    if (!err && !code && !desc) return;

    setCallbackMessage(formatAuthCallbackError(err, code));

    const clean = new URL(window.location.href);
    ["error", "error_code", "error_description"].forEach((k) => clean.searchParams.delete(k));
    const qs = clean.searchParams.toString();
    router.replace(`${clean.pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [searchParams, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    const dest = nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/dashboard";
    router.push(dest);
    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 sm:p-8">
      <div className="mb-6 text-center">
        <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
          Access only for beta testers
        </p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">Sign in</h1>
        <p className="mt-1.5 text-sm text-zinc-300">Welcome back</p>
      </div>

      {callbackMessage ? (
        <p className="mb-4 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
          {callbackMessage}
        </p>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-zinc-300">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition focus:border-white/30"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-zinc-300">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition focus:border-white/30"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-white py-2.5 text-sm font-medium text-black transition hover:opacity-90 disabled:opacity-60"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 sm:p-8">
          <div className="mb-6 text-center">
            <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
              Access only for beta testers
            </p>
            <h1 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">Sign in</h1>
            <p className="mt-1.5 text-sm text-zinc-300">Welcome back</p>
          </div>
          <div className="h-40 animate-pulse rounded-lg bg-white/5" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
