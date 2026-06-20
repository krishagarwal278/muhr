"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ProfileLinksDisplay } from "@/components/profile/ProfileLinksDisplay";
import { MuhrPassQrCode } from "@/components/profile/MuhrPassQrCode";
import { cx } from "@/lib/cx";
import { getPublicShareableSiteBase } from "@/lib/app/publicSiteUrl";
import { profileFromApiJson } from "@/lib/api/profilePayload";
import type { ProfileLinkInput } from "@/lib/profile/links";

type Profile = {
  handle: string | null;
  displayName: string | null;
  muid: string;
  profileLinks: ProfileLinkInput[];
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
            muid: typeof data.muid === "string" ? data.muid : "",
            profileLinks: Array.isArray(data.profileLinks)
              ? data.profileLinks
                  .map((item) => ({
                    platform: typeof item?.platform === "string" ? item.platform : "",
                    value: typeof item?.value === "string" ? item.value : "",
                  }))
                  .filter((item): item is ProfileLinkInput => !!item.platform && !!item.value)
              : [],
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
        className="h-40 animate-pulse rounded-2xl border border-neutral-300/90 bg-white"
        aria-hidden
      />
    );
  }

  if (!profile?.handle) {
    return (
      <div className="rounded-2xl border border-neutral-300/90 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.06),0_8px_24px_-8px_rgba(15,23,42,0.08)] sm:p-6">
        <h2 className="muhr-display text-lg text-neutral-950">Public profile link</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-neutral-600">
          Your Muhr pass link is created automatically when your profile loads. Refresh this page if it
          does not appear yet, or edit your handle in Profile overview.
        </p>
        <Link
          href="/profile#profile-overview"
          className="mt-5 inline-flex items-center justify-center rounded-full bg-[#2D5BFF] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#2548d9]"
        >
          Open profile
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-300/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.06),0_12px_32px_-12px_rgba(15,23,42,0.1)]">
      <div className="border-b border-neutral-200 px-5 py-4 sm:px-6">
        <h2 className="muhr-display text-lg text-neutral-950">Share link</h2>
        <p className="mt-1 text-sm text-neutral-600">Your public Muhr pass for brands and collaborators</p>
      </div>

      <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-stretch sm:p-6">
        <div className="relative flex-1 rounded-xl border border-neutral-300/90 bg-neutral-100/80 p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-600">
                Muhr pass
              </p>
              <p className="muhr-display mt-2 text-xl text-neutral-950 sm:text-2xl">
                {profile.displayName?.trim() || `@${profile.handle}`}
              </p>
              <p className="mt-2 font-mono text-xs font-medium text-neutral-800 sm:text-sm">
                {publicUrl}
              </p>
              <div className="mt-3">
                <ProfileLinksDisplay links={profile.profileLinks} variant="compact" />
              </div>
              {profile.muid ? (
                <div className="mt-4 border-t border-neutral-300/90 pt-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-600">MUID</p>
                  <p className="mt-1 font-mono text-sm font-semibold tracking-wide text-neutral-900">{profile.muid}</p>
                </div>
              ) : null}
            </div>
            <MuhrPassQrCode
              value={publicUrl}
              size={76}
              className="shrink-0 rounded-xl border border-neutral-300/90 bg-white shadow-sm"
            />
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void copy()}
              className="inline-flex items-center justify-center rounded-full bg-[#2D5BFF] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#2548d9]"
            >
              {copied ? "Copied" : "Copy link"}
            </button>
            <Link
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cx(
                "inline-flex items-center justify-center rounded-full px-4 py-2 text-xs font-semibold",
                "border border-neutral-300 bg-white text-neutral-950 transition hover:border-neutral-400 hover:bg-neutral-50",
              )}
            >
              Open
            </Link>
          </div>
        </div>

        <div className="flex w-full shrink-0 flex-col justify-center gap-3 sm:w-44">
          <div className="flex min-h-[7.5rem] justify-center rounded-xl border border-neutral-300/90 bg-neutral-100/80 p-5 sm:flex-1 sm:items-center">
            <Image
              src="/logo.png"
              alt=""
              width={52}
              height={52}
              className="h-[52px] w-[52px] rounded-xl opacity-95"
            />
          </div>
          <p className="text-center text-[11px] font-medium text-neutral-500">Screenshot for stories</p>
        </div>
      </div>
    </div>
  );
}
