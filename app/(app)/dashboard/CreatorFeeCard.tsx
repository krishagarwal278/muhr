"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  FOLLOWER_SLIDER_DEFAULT,
  FOLLOWER_SLIDER_MAX,
  FOLLOWER_SLIDER_MIN,
  FOLLOWER_TIER_BANDS,
  activeTierIdFromFollowers,
  formatFollowerCount,
  followersFromSliderPosition,
  sliderPositionFromFollowers,
} from "@/lib/pricing/followers";
import { recommendFee } from "@/lib/pricing/recommend";
import { PRICING_TIER_ORDER, PRICING_TIERS } from "@/lib/pricing/tiers";
import { profileFromApiJson } from "@/lib/api/profilePayload";

interface CreatorFeeCardProps {
  minLicenseFeeInr: number | null;
  initialFollowerCount: number | null;
}

const BASELINE_PARAMS = {
  durationDays: 30,
  channels: ["Instagram", "Facebook"],
  territories: ["India"],
};

function formatInr(n: number): string {
  if (n <= 0) return "—";
  return `₹${n.toLocaleString("en-IN")}`;
}

export function CreatorFeeCard({
  minLicenseFeeInr,
  initialFollowerCount,
}: CreatorFeeCardProps) {
  const [followerCount, setFollowerCount] = useState(
    initialFollowerCount && initialFollowerCount > 0
      ? initialFollowerCount
      : FOLLOWER_SLIDER_DEFAULT
  );
  const [inputText, setInputText] = useState("");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (initialFollowerCount && initialFollowerCount > 0) {
      setFollowerCount(initialFollowerCount);
    }
  }, [initialFollowerCount]);

  useEffect(() => {
    setInputText(formatFollowerCount(followerCount));
  }, [followerCount]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  const persistFollowerCount = useCallback((count: number) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ followerCount: count }),
        });
        if (!res.ok) {
          console.warn("[CreatorFeeCard] follower count save failed", res.status);
          return;
        }
        const data = profileFromApiJson(await res.json().catch(() => null));
        if (typeof data?.followerCount === "number" && data.followerCount > 0) {
          setFollowerCount(data.followerCount);
        }
      } catch (e) {
        console.warn("[CreatorFeeCard] follower count save error", e);
      }
    }, 600);
  }, []);

  const updateFollowers = useCallback(
    (next: number) => {
      const clamped = Math.min(
        FOLLOWER_SLIDER_MAX,
        Math.max(FOLLOWER_SLIDER_MIN, Math.round(next))
      );
      setFollowerCount(clamped);
      persistFollowerCount(clamped);
    },
    [persistFollowerCount]
  );

  const activeTierId = activeTierIdFromFollowers(followerCount);
  const activeTier = PRICING_TIERS[activeTierId];

  const recommendation = useMemo(
    () =>
      recommendFee(
        { followerCount, minLicenseFeeInr },
        BASELINE_PARAMS
      ),
    [followerCount, minLicenseFeeInr]
  );

  const tierEstimates = useMemo(() => {
    return PRICING_TIER_ORDER.map((tierId) => {
      const rec = recommendFee(
        { followerCount, minLicenseFeeInr, forceTierId: tierId },
        BASELINE_PARAMS
      );
      return { tierId, rec };
    });
  }, [followerCount, minLicenseFeeInr]);

  const maxMid = Math.max(...tierEstimates.map((t) => t.rec.midInr), 1);
  const sliderPosition = sliderPositionFromFollowers(followerCount);

  function handleInputBlur() {
    const raw = inputText.replace(/,/g, "").trim().toLowerCase();
    let parsed = Number.parseInt(raw, 10);
    if (raw.endsWith("m")) {
      parsed = Math.round(Number.parseFloat(raw) * 1_000_000);
    } else if (raw.endsWith("k")) {
      parsed = Math.round(Number.parseFloat(raw) * 1_000);
    }
    if (Number.isFinite(parsed) && parsed > 0) {
      updateFollowers(parsed);
    } else {
      setInputText(formatFollowerCount(followerCount));
    }
  }

  return (
    <section
      className="w-full min-w-0 overflow-hidden rounded-2xl border border-neutral-300/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.06),0_12px_32px_-12px_rgba(15,23,42,0.1)]"
      aria-labelledby="earnings-slide-heading"
    >
      <div className="border-b border-neutral-200 px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#2D5BFF]">
              Earnings estimate
            </p>
            <h2
              id="earnings-slide-heading"
              className="muhr-display mt-1 text-xl text-neutral-950 sm:text-2xl"
            >
              License fee estimate
            </h2>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-900">
            Estimate only
          </span>
        </div>
      </div>

      <div className="space-y-6 px-5 py-5 sm:px-6 sm:py-6">
        <div className="rounded-xl border border-neutral-300/90 bg-neutral-100/70 p-4">
          <label
            htmlFor="follower-count-input"
            className="text-xs font-semibold uppercase tracking-wide text-neutral-600"
          >
            Your followers
          </label>
          <div className="mt-2 flex flex-wrap items-end gap-4">
            <div className="flex items-baseline gap-2">
              <input
                id="follower-count-input"
                type="text"
                inputMode="numeric"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onBlur={handleInputBlur}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleInputBlur();
                  }
                }}
                className="w-28 border-b-2 border-[#2D5BFF]/40 bg-transparent text-3xl font-semibold tabular-nums tracking-tight text-neutral-950 outline-none focus:border-[#2D5BFF] sm:w-32 sm:text-4xl"
                aria-describedby="follower-slider"
              />
              <span className="pb-1 text-sm font-medium text-neutral-600">followers</span>
            </div>
          </div>

          <input
            id="follower-slider"
            type="range"
            min={0}
            max={1000}
            value={Math.round(sliderPosition * 1000)}
            onChange={(e) => {
              const pos = Number(e.target.value) / 1000;
              updateFollowers(followersFromSliderPosition(pos));
            }}
            className="mt-4 h-2 w-full cursor-pointer appearance-none rounded-full bg-neutral-300 accent-[#2D5BFF]"
            aria-valuemin={FOLLOWER_SLIDER_MIN}
            aria-valuemax={FOLLOWER_SLIDER_MAX}
            aria-valuenow={followerCount}
            aria-label="Adjust follower count"
          />
          <div className="mt-1.5 flex justify-between text-[10px] font-medium tabular-nums text-neutral-500">
            <span>{formatFollowerCount(FOLLOWER_SLIDER_MIN)}</span>
            <span>{formatFollowerCount(FOLLOWER_SLIDER_MAX)}+</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_280px]">
          <div className="rounded-xl border border-neutral-300/90 bg-neutral-100/50 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-600">
              Approx. license fee · 30 days
            </p>
            <p className="mt-0.5 text-xs text-neutral-600">Instagram + Facebook · India</p>
            <p className="muhr-display mt-3 break-words text-2xl tabular-nums text-neutral-950 sm:text-3xl lg:text-4xl">
              {formatInr(recommendation.lowInr)}
              <span className="mx-2 text-xl font-normal text-neutral-400">–</span>
              {formatInr(recommendation.highInr)}
            </p>
            <p className="mt-1 text-sm tabular-nums text-neutral-600">
              Mid {formatInr(recommendation.midInr)}
            </p>
          </div>

          <div className="flex flex-col justify-between rounded-xl bg-[#2D5BFF] p-5 text-white shadow-[0_8px_24px_-8px_rgba(45,91,255,0.55)]">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-white/85">
                Estimated this month
              </p>
              <p className="muhr-display mt-2 text-3xl tabular-nums sm:text-4xl">
                {formatInr(recommendation.midInr)}
              </p>
            </div>
            <div className="mt-4">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-white/85">
                Tier bands
              </p>
              <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-white/20">
                {FOLLOWER_TIER_BANDS.map((band) => {
                  const active = band.tierId === activeTierId;
                  return (
                    <div
                      key={band.tierId}
                      title={PRICING_TIERS[band.tierId].label}
                      className={
                        active
                          ? "flex-1 bg-white ring-2 ring-white/50 ring-offset-1 ring-offset-[#2D5BFF]"
                          : "flex-1 bg-white/35"
                      }
                    />
                  );
                })}
              </div>
              <p className="mt-2 text-xs font-medium text-white">
                You&apos;re here: {activeTier.label}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-neutral-300/90 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
            Compare tiers
          </p>
          <ul className="mt-4 space-y-2.5" role="list">
            {tierEstimates.map(({ tierId, rec }) => {
              const tier = PRICING_TIERS[tierId];
              const isActive = tierId === activeTierId;
              const widthPct = Math.max(8, Math.round((rec.midInr / maxMid) * 100));
              return (
                <li
                  key={tierId}
                  className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,7rem)_1fr_auto] sm:items-center sm:gap-3"
                >
                  <span
                    className={
                      isActive
                        ? "text-xs font-semibold text-neutral-950"
                        : "text-xs text-neutral-600"
                    }
                  >
                    <span className="block">{tier.label}</span>
                    <span className="block text-[10px] font-normal text-neutral-500">
                      {tier.followerBand}
                    </span>
                  </span>
                  <div className="h-6 overflow-hidden rounded-md bg-neutral-200">
                    <div
                      className={
                        isActive
                          ? "flex h-full items-center rounded-md bg-[#2D5BFF] px-2 text-[10px] font-semibold text-white transition-all duration-300"
                          : "flex h-full items-center rounded-md bg-[#2D5BFF]/25 px-2 text-[10px] font-semibold text-[#2D5BFF] transition-all duration-300"
                      }
                      style={{ width: `${widthPct}%` }}
                    >
                      {widthPct > 22 ? formatInr(rec.midInr) : null}
                    </div>
                  </div>
                  <span
                    className={
                      isActive
                        ? "shrink-0 text-xs font-semibold tabular-nums text-neutral-950"
                        : "shrink-0 text-xs tabular-nums text-neutral-600"
                    }
                  >
                    {widthPct <= 22 ? formatInr(rec.midInr) : null}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <p className="text-xs text-neutral-600">
          Estimates only ·{" "}
          <Link
            href="/profile"
            className="font-medium text-[#2D5BFF] underline-offset-2 hover:underline"
          >
            Set minimum fee
          </Link>
        </p>
      </div>
    </section>
  );
}
