"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { LicenseRequestPanel } from "@/components/marketing/LicenseRequestPanel";
import { muidFromUserId } from "@/lib/profile/muid";
import { primaryButtonVariants } from "@/components/ui/button-recipes";

type PublicRow = {
  id: string;
  handle: string;
  displayName: string;
  acceptingRequests: boolean;
  licensingNotes: string | null;
};

export function PublicCreatorClient({
  profile,
  viewerUserId,
  publicProfileUrl,
}: {
  profile: PublicRow;
  viewerUserId: string | null;
  /** Canonical profile URL from the server — avoids hydration mismatch (QR / link must match SSR). */
  publicProfileUrl: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const previewBrand = searchParams.get("preview") === "brand";
  const isOwner = viewerUserId !== null && viewerUserId === profile.id;
  const showAsBrand = !isOwner || previewBrand;

  const [copied, setCopied] = useState(false);

  const copyPublicUrl = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(publicProfileUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }, [publicProfileUrl]);

  const muid = muidFromUserId(profile.id);
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(publicProfileUrl)}`;

  const setPreview = useCallback(
    (on: boolean) => {
      const next = new URLSearchParams(searchParams.toString());
      if (on) next.set("preview", "brand");
      else next.delete("preview");
      const q = next.toString();
      router.replace(q ? `/k/${profile.handle}?${q}` : `/k/${profile.handle}`);
    },
    [router, searchParams, profile.handle]
  );

  return (
    <div className="mx-auto max-w-lg px-4 py-10 sm:px-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <Link href="/" className="text-sm text-neutral-900/60 hover:text-neutral-950">
          ← Muhr
        </Link>
        {isOwner && (
          <label className="flex cursor-pointer items-center gap-2 text-xs text-neutral-900/65">
            <input
              type="checkbox"
              checked={previewBrand}
              onChange={(e) => setPreview(e.target.checked)}
              className="accent-neutral-950"
            />
            Preview as brand
          </label>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-indigo-950/40 via-neutral-950 to-neutral-950 text-zinc-100">
        <div className="relative rounded-xl border border-dashed border-white/20 bg-black/30 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-400">Muhr pass</p>
                {isOwner && previewBrand ? (
                  <span className="rounded-full border border-amber-500/40 bg-amber-50 px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide text-amber-950">
                    Brand preview
                  </span>
                ) : null}
              </div>
              <h1 className="mt-2 text-xl font-semibold tracking-tight text-white sm:text-2xl">{profile.displayName}</h1>
              <p className="mt-1 flex items-center gap-1.5 font-mono text-xs text-emerald-300 sm:text-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/insta.png"
                  alt=""
                  aria-hidden="true"
                  width={16}
                  height={16}
                  className="opacity-80"
                />
                <span>@{profile.handle}</span>
              </p>
              <div className="mt-2">
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-zinc-400">MUID</p>
                <p className="mt-0.5 font-mono text-[11px] tracking-wide text-zinc-200">{muid}</p>
              </div>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element -- external QR API */}
            <img
              src={qrSrc}
              alt=""
              width={72}
              height={72}
              className="shrink-0 rounded-lg border border-white/10 bg-white p-1"
            />
          </div>
          <p className="mt-4 break-all font-mono text-[11px] leading-relaxed text-zinc-300">
            {publicProfileUrl}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void copyPublicUrl()}
              className={primaryButtonVariants({ size: "sm" })}
            >
              {copied ? "Copied" : "Copy link"}
            </button>
            <Link
              href={publicProfileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-white/25 px-4 py-2 text-xs font-medium text-zinc-100 hover:bg-white/10"
            >
              Open
            </Link>
          </div>
          {isOwner && !previewBrand ? (
            <p className="mt-3 text-xs text-zinc-400">This is your public page. Share it with brands.</p>
          ) : null}
        </div>

        {showAsBrand ? (
          <div id="license-request" className="border-t border-white/10 p-4 sm:p-5">
            <LicenseRequestPanel
              creatorHandle={profile.handle}
              creatorDisplayName={profile.displayName}
              acceptingRequests={profile.acceptingRequests}
              licensingNotes={profile.licensingNotes}
              publicProfileUrl={publicProfileUrl}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
