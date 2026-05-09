"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type ConsentState = "accepted" | "rejected" | null;

const STORAGE_KEY = "vault_cookie_consent";

export default function CookieBanner() {
  const [consent, setConsent] = useState<ConsentState | "loading">("loading");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ConsentState | null;
    setConsent(stored);
  }, []);

  function accept() {
    localStorage.setItem(STORAGE_KEY, "accepted");
    setConsent("accepted");
  }

  function reject() {
    localStorage.setItem(STORAGE_KEY, "rejected");
    setConsent("rejected");
  }

  // Don't render until we've checked localStorage (avoids flash)
  if (consent !== null) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-overlay p-4 sm:p-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 rounded-2xl border border-white/10 bg-neutral-900/95 p-5 shadow-2xl backdrop-blur-md sm:flex-row sm:items-center sm:gap-6">
        <p className="flex-1 text-sm leading-6 text-zinc-200">
          We use cookies to improve your experience and understand how Muhr is used.{" "}
          <Link
            href="/cookies"
            className="text-zinc-100 underline underline-offset-2 transition hover:text-white"
          >
            Cookie Policy
          </Link>
        </p>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          <button
            onClick={reject}
            className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-white/35 hover:text-white"
          >
            Reject non-essential
          </button>
          <button
            onClick={accept}
            className="rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black transition hover:opacity-90"
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}
