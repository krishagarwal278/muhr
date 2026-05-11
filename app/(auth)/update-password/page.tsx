"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
      setError("Your reset link is invalid or expired. Request a new one from the sign-in page.");
      setLoading(false);
      return;
    }

    const { error: updateErr } = await supabase.auth.updateUser({ password });
    if (updateErr) {
      setError(updateErr.message);
      setLoading(false);
      return;
    }

    await supabase.auth.signOut();
    router.push("/login?reset=success");
    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 sm:p-8">
      <div className="mb-6 text-center">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Set a new password</h1>
        <p className="mt-1.5 text-sm text-zinc-300">Choose a strong password for your account.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="new-password" className="mb-1.5 block text-xs font-medium text-zinc-300">
            New password
          </label>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition focus:border-white/30"
            placeholder="At least 8 characters"
          />
        </div>

        <div>
          <label htmlFor="confirm-password" className="mb-1.5 block text-xs font-medium text-zinc-300">
            Confirm password
          </label>
          <input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition focus:border-white/30"
            placeholder="Repeat password"
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
          {loading ? "Updating…" : "Update password"}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-zinc-500">
        <Link href="/login" className="text-zinc-300 underline-offset-2 hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
