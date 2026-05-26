"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { primaryButtonVariants } from "@/components/ui/button-recipes";
import { surfaceCardVariants } from "@/components/ui/surface-card";
import { cx } from "@/lib/cx";
import { getPublicShareableSiteBase } from "@/lib/app/publicSiteUrl";
import { profileFromApiJson } from "@/lib/api/profilePayload";

type Profile = {
  handle: string | null;
  displayName: string | null;
  acceptingRequests: boolean;
  muid: string;
};

export function PublicProfileShare() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/profile");
        if (!res.ok) return;
        const data = profileFromApiJson(await res.json());
        if (!cancelled && data) {
          setProfile({
            handle: data.handle ?? null,
            displayName: data.displayName ?? null,
            acceptingRequests: data.acceptingRequests !== false,
            muid: typeof data.muid === "string" ? data.muid : "",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const base = getPublicShareableSiteBase();
  const publicUrl = profile?.handle ? `${base}/k/${profile.handle}` : "";

  const copy = useCallback(async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }, [publicUrl]);

  if (loading) {
    return (
      <div
        className={cx(
          surfaceCardVariants({ padding: "none", interactive: "none" }),
          "h-40 animate-pulse",
        )}
        aria-hidden
      />
    );
  }

  if (!profile?.handle) {
    return (
      <div className={surfaceCardVariants()}>
        <h2 className="text-lg font-semibold tracking-tight text-neutral-950">Public profile link</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-neutral-700">
          Choose a handle in Profile to get a shareable URL for bios and outreach.
        </p>
        <Link href="/profile#profile-overview" className={cx(primaryButtonVariants(), "mt-5")}>
          Set your handle
        </Link>
      </div>
    );
  }

  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(publicUrl)}`;

  return (
    <div
      className={cx(
        "relative overflow-hidden rounded-2xl text-white",
        "border border-zinc-700/80 bg-gradient-to-b from-zinc-800 via-zinc-900 to-zinc-950",
        "shadow-[0_24px_48px_-12px_rgba(0,0,0,0.45)] ring-1 ring-inset ring-white/10",
      )}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"
        aria-hidden
      />
      <div className="relative border-b border-white/[0.08] bg-black/10 px-5 py-4 backdrop-blur-sm">
        <h2 className="text-[15px] font-semibold tracking-tight text-white">Share link</h2>
      </div>

      <div className="relative flex flex-col gap-5 p-5 sm:flex-row sm:items-stretch">
        <div
          className={cx(
            "relative flex-1 overflow-hidden rounded-xl p-5",
            "border border-white/[0.1] bg-gradient-to-br from-white/[0.09] to-white/[0.02]",
            "shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
                Muhr pass
              </p>
              <p className="mt-2 text-xl font-semibold tracking-tight text-white sm:text-2xl">
                {profile.displayName?.trim() || `@${profile.handle}`}
              </p>
              <p className="mt-2 flex items-center gap-2 font-mono text-sm font-medium text-emerald-400">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/insta.png"
                  alt=""
                  aria-hidden="true"
                  width={14}
                  height={14}
                  className="opacity-90"
                />
                <span>@{profile.handle}</span>
              </p>
              {profile.muid ? (
                <div className="mt-4 border-t border-white/[0.08] pt-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">MUID</p>
                  <p className="mt-1 font-mono text-sm font-medium tracking-wide text-zinc-100">{profile.muid}</p>
                </div>
              ) : null}
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrSrc}
              alt=""
              width={76}
              height={76}
              className="shrink-0 rounded-xl border border-white/15 bg-white p-1.5 shadow-lg shadow-black/30"
            />
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" onClick={() => void copy()} className={primaryButtonVariants({ size: "sm" })}>
              {copied ? "Copied" : "Copy link"}
            </button>
            <Link
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cx(
                "inline-flex items-center justify-center rounded-lg px-4 py-2 text-xs font-semibold",
                "border border-white/20 bg-white/[0.08] text-white backdrop-blur-sm",
                "transition hover:border-white/30 hover:bg-white/[0.14]",
              )}
            >
              Open
            </Link>
          </div>
        </div>

        <div className="flex w-full shrink-0 flex-col justify-center gap-3 sm:w-44">
          <div
            className={cx(
              "flex min-h-[7.5rem] justify-center rounded-xl p-5 sm:flex-1 sm:items-center",
              "border border-white/[0.08] bg-zinc-900/60 shadow-inner",
            )}
          >
            <Image
              src="/logo.png"
              alt=""
              width={52}
              height={52}
              className="h-[52px] w-[52px] rounded-xl opacity-95"
            />
          </div>
          <p className="text-center text-[11px] text-zinc-500">Screenshot for stories</p>
        </div>
      </div>
    </div>
  );
}
