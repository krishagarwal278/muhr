"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatAuthCallbackError } from "@/lib/auth/authCallbackMessages";
import { buildPasswordResetRedirectTo } from "@/lib/auth/passwordResetRedirect";
import { safeInternalPath } from "@/lib/auth/safeRedirectPath";
import {
  getBrandPreviewSignInEmail,
  isBrandAuthDestination,
  isBrandWorkspaceUser,
} from "@/lib/brand/brandPreviewSignIn";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next");
  const intent = searchParams.get("intent");
  const suggestedEmail =
    isBrandAuthDestination(nextPath, intent) ? getBrandPreviewSignInEmail()?.trim() ?? "" : "";
  const [email, setEmail] = useState(suggestedEmail);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [callbackMessage, setCallbackMessage] = useState<string | null>(null);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState<string | null>(null);
  const [forgotError, setForgotError] = useState("");
  const [passwordResetBanner, setPasswordResetBanner] = useState(false);

  useEffect(() => {
    const err = searchParams.get("error");
    const code = searchParams.get("error_code");
    const desc = searchParams.get("error_description");
    if (!err && !code && !desc) return;

    if (err === "brand_preview_unconfigured") {
      setCallbackMessage(
        "Brand workspace preview is not configured. Set NEXT_PUBLIC_BRAND_PREVIEW_SIGNIN_EMAIL in your environment."
      );
    } else {
      setCallbackMessage(formatAuthCallbackError(err, code));
    }

    const clean = new URL(window.location.href);
    ["error", "error_code", "error_description"].forEach((k) => clean.searchParams.delete(k));
    if (err === "brand_preview_unconfigured") clean.searchParams.delete("intent");
    const qs = clean.searchParams.toString();
    router.replace(`${clean.pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [searchParams, router]);

  useEffect(() => {
    if (searchParams.get("reset") !== "success") return;
    setPasswordResetBanner(true);
    const clean = new URL(window.location.href);
    clean.searchParams.delete("reset");
    const qs = clean.searchParams.toString();
    router.replace(`${clean.pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [searchParams, router]);

  useEffect(() => {
    let cancelled = false;
    async function redirectIfAlreadySignedIn() {
      if (searchParams.get("reset") === "success") return;

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled || !user?.email) return;

      const normalizedNext =
        nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : null;
      const brandIntent =
        intent === "brand" || (normalizedNext?.startsWith("/brand") ?? false);
      const isBrand = isBrandWorkspaceUser(user.email);

      if (brandIntent) {
        if (isBrand) {
          router.replace(safeInternalPath(normalizedNext, "/brand/dashboard"));
          router.refresh();
        } else {
          router.replace("/dashboard?brand_access=denied");
        }
        return;
      }

      if (isBrand) {
        router.replace("/brand/dashboard");
        router.refresh();
        return;
      }

      if (normalizedNext) {
        router.replace(safeInternalPath(normalizedNext, "/dashboard"));
        router.refresh();
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    }
    void redirectIfAlreadySignedIn();
    return () => {
      cancelled = true;
    };
  }, [intent, nextPath, router, searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("Could not sign in with that email and password.");
      setLoading(false);
      return;
    }

    const signedEmail = data.user?.email ?? email;
    const normalizedNext =
      nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : null;
    const brandIntent =
      intent === "brand" || (normalizedNext?.startsWith("/brand") ?? false);
    const isBrand = isBrandWorkspaceUser(signedEmail);

    if (brandIntent && !isBrand) {
      await supabase.auth.signOut();
      setError("This account is not authorized for the brand workspace. Use creator sign-in above.");
      setLoading(false);
      return;
    }

    if (!brandIntent && isBrand) {
      router.push("/brand/dashboard");
      router.refresh();
      setLoading(false);
      return;
    }

    const dest = safeInternalPath(
      normalizedNext,
      brandIntent ? "/brand/dashboard" : "/dashboard"
    );
    router.push(dest);
    router.refresh();
    setLoading(false);
  }

  async function handleForgotSubmit(e: React.FormEvent) {
    e.preventDefault();
    setForgotError("");
    setForgotMessage(null);
    const trimmed = email.trim();
    if (!trimmed) {
      setForgotError("Enter the email you use to sign in.");
      return;
    }
    setForgotLoading(true);
    try {
      const supabase = createClient();
      const redirectTo = buildPasswordResetRedirectTo(window.location.origin);
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(trimmed, { redirectTo });
      if (resetErr) {
        setForgotError("Could not send reset email. Check the address and try again.");
        return;
      }
      setForgotMessage(
        "If an account exists for that email, you will receive a link to choose a new password shortly."
      );
    } finally {
      setForgotLoading(false);
    }
  }

  const previewSignInEmail = getBrandPreviewSignInEmail();

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 sm:p-8">
      <div className="mb-6 text-center">
        <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
          Access only for beta testers
        </p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">Sign in</h1>
        <p className="mt-1.5 text-sm text-zinc-300">Welcome back</p>
      </div>

      {isBrandAuthDestination(nextPath, intent) ? (
        <p className="mb-4 rounded-lg border border-sky-500/25 bg-sky-500/10 px-3 py-2 text-left text-xs text-sky-100">
          Brand workspace is preview-only. Public brand sign-up stays closed until the org model ships; use the
          internal preview Supabase account from your team
          {previewSignInEmail ? ` (${previewSignInEmail})` : ""}.
        </p>
      ) : null}

      {passwordResetBanner ? (
        <p className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
          Your password was updated. Sign in with your new password.
        </p>
      ) : null}

      {callbackMessage ? (
        <p className="mb-4 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
          {callbackMessage}
        </p>
      ) : null}

      {forgotOpen ? (
        <form onSubmit={handleForgotSubmit} className="space-y-4">
          <p className="text-sm text-zinc-300">
            Enter your account email. We will send a reset link if an account exists.
          </p>
          <div>
            <label htmlFor="forgot-email" className="mb-1.5 block text-xs font-medium text-zinc-300">
              Email
            </label>
            <input
              id="forgot-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition focus:border-white/30"
              placeholder="you@example.com"
            />
          </div>
          {forgotError && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{forgotError}</p>
          )}
          {forgotMessage && (
            <p className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
              {forgotMessage}
            </p>
          )}
          <button
            type="submit"
            disabled={forgotLoading}
            className="w-full rounded-lg bg-white py-2.5 text-sm font-medium text-black transition hover:opacity-90 disabled:opacity-60"
          >
            {forgotLoading ? "Sending…" : "Send reset link"}
          </button>
          <button
            type="button"
            onClick={() => {
              setForgotOpen(false);
              setForgotMessage(null);
              setForgotError("");
            }}
            className="w-full text-center text-xs text-zinc-400 underline-offset-2 hover:text-zinc-200 hover:underline"
          >
            Back to sign in
          </button>
        </form>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-zinc-300">
              Email
            </label>
            <input
              id="email"
              type="email"
              name="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition focus:border-white/30"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <label htmlFor="password" className="block text-xs font-medium text-zinc-300">
                Password
              </label>
              <button
                type="button"
                onClick={() => setForgotOpen(true)}
                className="text-xs font-medium text-zinc-400 underline-offset-2 hover:text-zinc-200 hover:underline"
              >
                Forgot password?
              </button>
            </div>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
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
          {!isBrandAuthDestination(nextPath, intent) ? (
            <p className="mt-4 text-center text-xs text-zinc-500">
              Brand workspace preview?{" "}
              <Link
                href="/login?intent=brand&next=/brand/dashboard"
                className="font-medium text-zinc-300 underline-offset-2 hover:text-zinc-100 hover:underline"
              >
                Sign in to brand workspace
              </Link>
              .
            </p>
          ) : null}
        </form>
      )}
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
