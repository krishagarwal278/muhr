"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { surfaceCardVariants } from "@/components/ui/surface-card";
import { recommendFee } from "@/lib/pricing/recommend";
import { PRICING_TIERS, PRICING_TIER_ORDER, type PricingTierId } from "@/lib/pricing/tiers";
import { markWelcomeCompleted } from "@/lib/tour/welcomeFlow";
import { cx } from "@/lib/cx";

const STEP_COUNT = 5;

const PRIMARY_CTA_CLASS =
  "rounded-lg bg-neutral-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-900 disabled:cursor-not-allowed disabled:opacity-60";

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
    <div className="space-y-6">
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
          className="text-sm font-medium text-neutral-600 underline-offset-2 hover:text-neutral-900 hover:underline"
        >
          Skip overview
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
          className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-800 transition hover:border-neutral-300 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          ← Back
        </button>
        {stepIndex < STEP_COUNT - 1 ? (
          <button
            type="button"
            onClick={() => setStepIndex(stepIndex + 1)}
            className={PRIMARY_CTA_CLASS}
          >
            Next →
          </button>
        ) : (
          <button type="button" onClick={finish} className={PRIMARY_CTA_CLASS}>
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
      <p className="mx-auto mt-3 max-w-2xl text-base text-neutral-700 sm:text-lg">
        The secure platform where you control how brands and AI use your likeness — and get paid
        every time someone wants to.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        <PillarCard
          title="Secure by default"
          body="Your photos, voice, and identity proof live in an encrypted vault. Only you decide what leaves it."
          icon="lock"
        />
        <PillarCard
          title="Your rules"
          body="Set the channels, territories, content types, and AI permissions you’ll allow — before any brand asks."
          icon="rules"
        />
        <PillarCard
          title="Fair, transparent pay"
          body="Set your own floor, see a fair-fee estimate on every request, and approve each use individually."
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
      <h3 className="mt-3 text-base font-semibold text-neutral-950">{title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-neutral-700">{body}</p>
    </div>
  );
}

/* ----------------------------------------------------------------------------
 * Screen 2 — What is likeness licensing?
 * -------------------------------------------------------------------------- */

function ScreenWhatIsLicensing() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-neutral-950 sm:text-3xl">
          What is likeness licensing?
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-neutral-700 sm:text-base">
          AI can now create digital versions of real people — their face, voice, and style — for use
          in ads, videos, and synthetic content. That digital version is called a{" "}
          <span className="font-medium text-neutral-950">digital replica</span>. Muhr is the layer
          between you and brands who want to use one.
        </p>
      </div>

      <div className={cx(surfaceCardVariants({ padding: "md" }), "border-amber-200/80 bg-amber-50/70")}>
        <div className="flex gap-3">
          <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.008v.008H12v-.008Z M11.46 3.302 1.756 19.013a1.875 1.875 0 0 0 1.638 2.857h19.21a1.875 1.875 0 0 0 1.638-2.857L13.54 3.302a1.875 1.875 0 0 0-3.08 0Z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-amber-950">Why this matters</p>
            <p className="mt-1 text-sm leading-relaxed text-amber-950/90">
              Without your permission, someone with an AI tool can make it look like you endorse a
              product you’ve never seen, or say something you never said. Muhr is the paper trail
              that proves who actually consented, to what, and for how long — and the toolset that
              makes it easy to grant that consent on your own terms.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <FactCard
          title="A request comes in"
          body="A brand sends terms: who they are, what they’re making, where it runs, how long, what they’ll pay."
        />
        <FactCard
          title="You review and decide"
          body="Accept the ones you like. Decline the ones you don’t. Counter on price, scope, or duration in-app."
        />
        <FactCard
          title="You get paid"
          body="Once both sides sign and payment clears, the brand receives the assets — under your rules, for your time window."
        />
      </div>
    </div>
  );
}

function FactCard({ title, body }: { title: string; body: string }) {
  return (
    <div className={cx(surfaceCardVariants({ padding: "md" }), "text-left")}>
      <p className="text-sm font-semibold text-neutral-950">{title}</p>
      <p className="mt-1 text-sm text-neutral-700">{body}</p>
    </div>
  );
}

/* ----------------------------------------------------------------------------
 * Screen 3 — How Muhr works
 * -------------------------------------------------------------------------- */

const HOW_IT_WORKS_STEPS = [
  {
    title: "Upload your character photos",
    body: "Add 5 high-quality solo photos from different angles. Encrypted and stored in your Vault — only you can access them.",
    duration: "~5 min",
  },
  {
    title: "Build your character sheet",
    body: "We use those photos to generate a verified digital character sheet brands can match against. Auto-generated, you review and approve.",
    duration: "Automatic",
  },
  {
    title: "Set your consent rules",
    body: "Pick the channels, territories, content categories, and AI permissions you’ll allow. Requests outside your rules never reach you.",
    duration: "~3 min",
  },
  {
    title: "Receive license requests",
    body: "Brands send you specific terms via your public Muhr page. You review the full scope, fee, and intended use before deciding.",
    duration: "Ongoing",
  },
  {
    title: "Accept, sign, get paid",
    body: "Accept the requests that fit. Both sides sign in-app, payment clears, you deliver the assets — for the exact window you agreed to.",
    duration: "Per deal",
  },
] as const;

function ScreenHowItWorks() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-neutral-950 sm:text-3xl">
          How Muhr works
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-neutral-700 sm:text-base">
          A five-step flow from your first upload to your first paid license. You can pause at any
          point — nothing leaves your Vault until you say so.
        </p>
      </div>

      <ol className="space-y-3">
        {HOW_IT_WORKS_STEPS.map((step, i) => (
          <li key={step.title} className={cx(surfaceCardVariants({ padding: "md" }), "flex gap-4")}>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-neutral-50 text-sm font-semibold tabular-nums text-neutral-900">
              {i + 1}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold text-neutral-950">{step.title}</h3>
                <span className="rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-neutral-600">
                  {step.duration}
                </span>
              </div>
              <p className="mt-1 text-sm leading-relaxed text-neutral-700">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <div
        className={cx(
          surfaceCardVariants({ padding: "md" }),
          "border-indigo-200/70 bg-indigo-50/60"
        )}
      >
        <p className="text-sm font-semibold text-indigo-950">You stay in control the whole way</p>
        <p className="mt-1 text-sm leading-relaxed text-indigo-950/85">
          Every request requires your explicit approval. Pause incoming requests anytime, change
          your rules, or rotate your prices — none of those actions affect deals you already
          accepted.
        </p>
      </div>
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
    body: "30-day Instagram + Facebook campaign in India",
    durationDays: 30,
    channels: ["Instagram", "Facebook"],
    territories: ["India"],
  },
  {
    label: "Quarterly deal",
    body: "90 days · Instagram + YouTube · India + UAE",
    durationDays: 90,
    channels: ["Instagram", "YouTube"],
    territories: ["India", "UAE"],
  },
  {
    label: "Annual partnership",
    body: "365 days · multi-channel including TV/OTT · Global rights",
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
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-neutral-950 sm:text-3xl">
          What you could earn
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-neutral-700 sm:text-base">
          Illustrative ranges for the tier closest to yours. Real deals depend on the brand, the
          creator’s minimum, and how the terms shake out — but this is the order of magnitude.
        </p>
      </div>

      <div className={cx(surfaceCardVariants({ padding: "md" }), "space-y-3")}>
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Pick the tier closest to yours
        </p>
        <div className="flex flex-wrap gap-2">
          {PRICING_TIER_ORDER.map((id) => {
            const t = PRICING_TIERS[id];
            const active = id === tier;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onChangeTier(id)}
                className={cx(
                  "rounded-lg border px-3 py-1.5 text-xs font-medium transition",
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
        <p className="text-xs leading-relaxed text-neutral-600">{tierData.description}</p>
      </div>

      <ul className="space-y-3">
        {scenarios.map((s) => (
          <li key={s.label} className={cx(surfaceCardVariants({ padding: "md" }))}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-neutral-950">{s.label}</p>
                <p className="mt-1 text-xs text-neutral-600">{s.body}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                  Estimated range
                </p>
                <p className="mt-0.5 text-base font-semibold tabular-nums text-neutral-950">
                  ₹{s.rec.lowInr.toLocaleString("en-IN")} – ₹{s.rec.highInr.toLocaleString("en-IN")}
                </p>
                <p className="mt-0.5 text-xs tabular-nums text-neutral-600">
                  mid ₹{s.rec.midInr.toLocaleString("en-IN")}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="rounded-md border border-amber-200/80 bg-amber-50/70 px-3 py-2 text-[11px] leading-relaxed text-amber-950">
        Estimate only — not a guaranteed market rate. Brands often pay above or below this range
        depending on creative fit, exclusivity, and timing.
      </div>
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
        <p className="mx-auto mt-2 max-w-2xl text-sm text-neutral-700 sm:text-base">
          Four quick steps. Your progress saves automatically — pause whenever, pick up where you
          left off. The whole flow takes about 10–15 minutes the first time.
        </p>
      </div>

      <ol className={cx(surfaceCardVariants({ padding: "md" }), "divide-y divide-neutral-200/70 px-0 py-0")}>
        {items.map((item, i) => (
          <li key={item.title} className="flex items-center gap-4 px-5 py-3.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-neutral-300 bg-white text-xs font-semibold tabular-nums text-neutral-700">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <Link
                href={item.href}
                className="text-sm font-medium text-neutral-950 underline-offset-2 hover:underline"
              >
                {item.title}
              </Link>
            </div>
            <span className="shrink-0 text-xs text-neutral-500">{item.duration}</span>
          </li>
        ))}
      </ol>

      <p className="text-center text-xs text-neutral-600">
        Done with the overview? Head to the dashboard — you’ll find quick links to each step there
        too.
      </p>
    </div>
  );
}
