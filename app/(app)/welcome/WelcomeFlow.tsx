"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { surfaceCardVariants } from "@/components/ui/surface-card";
import { recommendFee } from "@/lib/pricing/recommend";
import { PRICING_TIERS, PRICING_TIER_ORDER, type PricingTierId } from "@/lib/pricing/tiers";
import { markWelcomeCompleted } from "@/lib/tour/welcomeFlow";
import { cx } from "@/lib/cx";
import { outlineButtonVariants, solidButtonVariants } from "@/components/ui/button-recipes";

const STEP_COUNT = 5;

export function WelcomeFlow({ userId }: { userId: string }) {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [tier, setTier] = useState<PricingTierId>("late_micro");

  function finish() {
    markWelcomeCompleted(userId);
    router.push("/dashboard");
  }

  function skip() {
    markWelcomeCompleted(userId);
    router.push("/dashboard");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {Array.from({ length: STEP_COUNT }).map((_, i) => (
            <span
              key={i}
              aria-hidden
              className={cx(
                "h-1.5 rounded-full transition-all",
                i === stepIndex
                  ? "w-8 bg-neutral-950"
                  : i < stepIndex
                    ? "w-6 bg-neutral-700"
                    : "w-6 bg-neutral-200"
              )}
            />
          ))}
          <span className="ml-2 text-xs font-medium text-neutral-600">
            {stepIndex + 1} of {STEP_COUNT}
          </span>
        </div>
        <button
          type="button"
          onClick={skip}
          className="text-xs text-neutral-400 underline-offset-2 hover:text-neutral-600 hover:underline"
        >
          Skip
        </button>
      </div>

      {stepIndex === 0 ? <ScreenWelcome /> : null}
      {stepIndex === 1 ? <ScreenWhatIsLicensing /> : null}
      {stepIndex === 2 ? <ScreenHowItWorks /> : null}
      {stepIndex === 3 ? (
        <ScreenEarnings tier={tier} onChangeTier={setTier} />
      ) : null}
      {stepIndex === 4 ? <ScreenGetStarted /> : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200/80 pt-5">
        <button
          type="button"
          onClick={() => setStepIndex(Math.max(0, stepIndex - 1))}
          disabled={stepIndex === 0}
          className={outlineButtonVariants()}
        >
          ← Back
        </button>
        {stepIndex < STEP_COUNT - 1 ? (
          <button
            type="button"
            onClick={() => setStepIndex(stepIndex + 1)}
            className={solidButtonVariants({ size: "lg" })}
          >
            Next →
          </button>
        ) : (
          <button type="button" onClick={finish} className={solidButtonVariants({ size: "lg" })}>
            Go to dashboard →
          </button>
        )}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------------
 * Screen 1 — Welcome
 * -------------------------------------------------------------------------- */

function ScreenWelcome() {
  return (
    <div className="text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/20">
        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight text-neutral-950 sm:text-4xl">
        Welcome to Muhr
      </h1>
      <p className="mx-auto mt-3 max-w-lg text-base text-neutral-600">
        Control your likeness — get paid when brands want in.
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <PillarCard
          title="Secure by default"
          body="Encrypted vault. Nothing leaves without you."
          icon="lock"
        />
        <PillarCard
          title="Your rules"
          body="Channels, territories, and AI — you set the limits."
          icon="rules"
        />
        <PillarCard
          title="Fair pay"
          body="Your minimum. Fair estimates. You approve each deal."
          icon="rupee"
        />
      </div>
    </div>
  );
}

function PillarCard({
  title,
  body,
  icon,
}: {
  title: string;
  body: string;
  icon: "lock" | "rules" | "rupee";
}) {
  const Icon = (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      {icon === "lock" ? (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-1.5 0h12a1.5 1.5 0 0 1 1.5 1.5v7.5a1.5 1.5 0 0 1-1.5 1.5h-12a1.5 1.5 0 0 1-1.5-1.5v-7.5a1.5 1.5 0 0 1 1.5-1.5Z"
        />
      ) : icon === "rules" ? (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
        />
      ) : (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M7 6h10m-10 4h10m-7 4h7m-7 4 4-4M7 14V6"
        />
      )}
    </svg>
  );

  return (
    <div className={cx(surfaceCardVariants({ padding: "md" }), "text-left")}>
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100 text-neutral-800">
        {Icon}
      </div>
      <h3 className="mt-3 text-sm font-semibold text-neutral-950">{title}</h3>
      <p className="mt-1 text-sm leading-snug text-neutral-600">{body}</p>
    </div>
  );
}

/* ----------------------------------------------------------------------------
 * Screen 2 — What is likeness licensing?
 * -------------------------------------------------------------------------- */

function ScreenWhatIsLicensing() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-neutral-950 sm:text-3xl">
          What is likeness licensing?
        </h2>
        <p className="mt-2 max-w-lg text-sm text-neutral-600">
          AI can build a{" "}
          <span className="font-medium text-neutral-900">digital replica</span> of your face and
          voice. Muhr is where you license it — on your terms.
        </p>
      </div>

      <p className="rounded-xl border border-amber-200/80 bg-amber-50/70 px-4 py-3 text-sm text-amber-950">
        <span className="font-semibold">Why it matters:</span> Without consent, AI can fake your
        endorsement. Muhr records who agreed to what, and when.
      </p>

      <ol className="grid gap-2 sm:grid-cols-3">
        <FactCard step={1} title="Request in" body="Brand sends scope, channels, duration, fee." />
        <FactCard step={2} title="You decide" body="Accept, decline, or counter in-app." />
        <FactCard step={3} title="Get paid" body="Sign, payment clears, assets ship on your rules." />
      </ol>
    </div>
  );
}

function FactCard({ step, title, body }: { step: number; title: string; body: string }) {
  return (
    <li className={cx(surfaceCardVariants({ padding: "md" }), "flex gap-3 text-left")}>
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold tabular-nums text-neutral-800">
        {step}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-neutral-950">{title}</p>
        <p className="mt-0.5 text-sm leading-snug text-neutral-600">{body}</p>
      </div>
    </li>
  );
}

/* ----------------------------------------------------------------------------
 * Screen 3 — How Muhr works
 * -------------------------------------------------------------------------- */

const HOW_IT_WORKS_STEPS = [
  { title: "Upload character photos", hint: "5 solo shots · encrypted vault", duration: "~5 min" },
  { title: "Build character sheet", hint: "Auto-generated · you approve", duration: "Auto" },
  { title: "Set consent rules", hint: "Channels, territories, AI", duration: "~3 min" },
  { title: "Receive requests", hint: "Brands send terms to review", duration: "Ongoing" },
  { title: "Sign & get paid", hint: "In-app sign-off · then delivery", duration: "Per deal" },
] as const;

function ScreenHowItWorks() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-neutral-950 sm:text-3xl">
          How Muhr works
        </h2>
        <p className="mt-2 max-w-lg text-sm text-neutral-600">
          Five steps to your first paid license. Nothing leaves your Vault until you approve.
        </p>
      </div>

      <ol className="space-y-2">
        {HOW_IT_WORKS_STEPS.map((step, i) => (
          <li
            key={step.title}
            className={cx(
              surfaceCardVariants({ padding: "md" }),
              "flex items-center gap-3 py-3.5"
            )}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-neutral-50 text-xs font-semibold tabular-nums text-neutral-900">
              {i + 1}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <h3 className="text-sm font-semibold text-neutral-950">{step.title}</h3>
                <span className="text-xs text-neutral-500">{step.hint}</span>
              </div>
            </div>
            <span className="shrink-0 rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-neutral-500">
              {step.duration}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ----------------------------------------------------------------------------
 * Screen 4 — What you could earn (driven by the recommendation engine)
 * -------------------------------------------------------------------------- */

const EARNINGS_SCENARIOS: Array<{
  label: string;
  body: string;
  durationDays: number;
  channels: string[];
  territories: string[];
}> = [
  {
    label: "Single campaign",
    body: "30d · IG + FB · India",
    durationDays: 30,
    channels: ["Instagram", "Facebook"],
    territories: ["India"],
  },
  {
    label: "Quarterly deal",
    body: "90d · IG + YT · IN + UAE",
    durationDays: 90,
    channels: ["Instagram", "YouTube"],
    territories: ["India", "UAE"],
  },
  {
    label: "Annual partnership",
    body: "365d · multi-channel · Global",
    durationDays: 365,
    channels: ["Instagram", "Facebook", "YouTube", "TV / OTT"],
    territories: ["Global"],
  },
];

function ScreenEarnings({
  tier,
  onChangeTier,
}: {
  tier: PricingTierId;
  onChangeTier: (next: PricingTierId) => void;
}) {
  const tierData = PRICING_TIERS[tier];

  const scenarios = useMemo(() => {
    return EARNINGS_SCENARIOS.map((s) => {
      const rec = recommendFee(
        { forceTierId: tier },
        { durationDays: s.durationDays, channels: s.channels, territories: s.territories }
      );
      return { ...s, rec };
    });
  }, [tier]);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-neutral-950 sm:text-3xl">
          What you could earn
        </h2>
        <p className="mt-2 max-w-lg text-sm text-neutral-600">
          Ballpark ranges for your tier — real deals vary by brand and terms.
        </p>
      </div>

      <div className={cx(surfaceCardVariants({ padding: "md" }), "space-y-2.5")}>
        <p className="text-xs font-medium text-neutral-500">Your tier</p>
        <div className="flex flex-wrap gap-1.5">
          {PRICING_TIER_ORDER.map((id) => {
            const t = PRICING_TIERS[id];
            const active = id === tier;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onChangeTier(id)}
                className={cx(
                  "rounded-lg border px-2.5 py-1 text-xs font-medium transition",
                  active
                    ? "border-neutral-950 bg-neutral-950 text-white"
                    : "border-neutral-200 bg-white text-neutral-800 hover:border-neutral-300 hover:bg-neutral-50"
                )}
              >
                {t.label}
                <span
                  className={cx(
                    "ml-1 text-[10px]",
                    active ? "text-white/70" : "text-neutral-500"
                  )}
                >
                  {t.followerBand}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <ul className="space-y-2">
        {scenarios.map((s) => (
          <li
            key={s.label}
            className={cx(surfaceCardVariants({ padding: "md" }), "flex items-center justify-between gap-4")}
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-neutral-950">{s.label}</p>
              <p className="mt-0.5 text-xs text-neutral-500">{s.body}</p>
            </div>
            <p className="shrink-0 text-right text-sm font-semibold tabular-nums text-neutral-950 sm:text-base">
              ₹{s.rec.lowInr.toLocaleString("en-IN")}–{s.rec.highInr.toLocaleString("en-IN")}
            </p>
          </li>
        ))}
      </ul>

      <p className="text-center text-[11px] text-neutral-500">
        Estimates only · not guaranteed rates · {tierData.followerBand}
      </p>
    </div>
  );
}

/* ----------------------------------------------------------------------------
 * Screen 5 — Get started checklist
 * -------------------------------------------------------------------------- */

function ScreenGetStarted() {
  const items = [
    { title: "Verify your identity", href: "/profile#identity-verification", duration: "~2 min" },
    { title: "Upload 5 character photos", href: "/profile#complete-profile", duration: "~5 min" },
    { title: "Set your consent rules", href: "/consent", duration: "~3 min" },
    { title: "Set your minimum license fee", href: "/profile#complete-profile", duration: "~1 min" },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        </div>
        <h2 className="mt-4 text-2xl font-semibold tracking-tight text-neutral-950 sm:text-3xl">
          You’re ready to set up
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-neutral-600">
          Four steps · ~15 min · saves as you go
        </p>
      </div>

      <ol className={cx(surfaceCardVariants({ padding: "md" }), "divide-y divide-neutral-200/70 px-0 py-0")}>
        {items.map((item, i) => (
          <li key={item.title} className="flex items-center gap-3 px-5 py-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-neutral-300 bg-white text-xs font-semibold tabular-nums text-neutral-700">
              {i + 1}
            </span>
            <Link
              href={item.href}
              className="min-w-0 flex-1 text-sm font-medium text-neutral-950 underline-offset-2 hover:underline"
            >
              {item.title}
            </Link>
            <span className="shrink-0 text-xs text-neutral-400">{item.duration}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
