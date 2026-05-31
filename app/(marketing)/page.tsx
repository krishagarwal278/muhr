"use client";

import { useEffect, useRef, useState } from "react";
import { FaqSection } from "@/components/marketing/FaqSection";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { WaitlistForm } from "@/components/marketing/WaitlistForm";
import { whatYouGet } from "@/lib/marketing/landingContent";

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setInView(true);
      },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);
  return { ref, inView };
}

const mockLicenseOffers = [
  {
    brand: "Northwind Studios",
    detail: "AI campaign · 30s likeness",
    offer: "$2,400",
    status: "Review" as const,
  },
  {
    brand: "Velvet Labs",
    detail: "Voice + face · product launch",
    offer: "$5,000",
    status: "Review" as const,
  },
  {
    brand: "Lyra AI",
    detail: "Synthetic media library",
    offer: "$850",
    status: "Approved" as const,
  },
];

function LicenseOffersCard() {
  return (
    <aside className="rounded-3xl border border-black/10 bg-white/70 p-4 backdrop-blur-sm sm:rounded-[2rem] sm:p-6">
      <header className="flex items-start justify-between gap-3">
        <span className="min-w-0 pr-1">
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-neutral-900/45 sm:text-xs">
            Likeness requests
          </p>
          <p className="mt-0.5 text-base font-semibold tracking-tight text-neutral-950 sm:text-lg">
            Incoming offers
          </p>
          <p className="mt-1 text-[11px] leading-snug text-neutral-900/55 sm:text-xs">
            <span className="text-pretty">
              Brands send briefs and rates—you approve before anything goes live.
            </span>
          </p>
        </span>
        <span className="shrink-0 rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-[10px] font-medium text-amber-950 sm:px-3 sm:text-[11px]">
          3 new
        </span>
      </header>

      <ul className="mt-4 list-none space-y-2 sm:mt-5 sm:space-y-2.5">
        {mockLicenseOffers.map((row) => (
          <li
            key={row.brand}
            className="flex min-h-[3.25rem] items-center justify-between gap-2 rounded-xl border border-black/10 bg-white px-2.5 py-2 sm:gap-3 sm:px-3 sm:py-2.5"
          >
            <span className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-medium text-neutral-950 sm:text-xs" title={row.brand}>
                {row.brand}
              </p>
              <p className="truncate text-[10px] text-neutral-900/50 sm:text-[11px]" title={row.detail}>
                {row.detail}
              </p>
            </span>
            <span className="shrink-0 text-right tabular-nums">
              <p className="text-[11px] font-semibold tabular-nums text-neutral-950 sm:text-xs">{row.offer}</p>
              <p
                className={
                  row.status === "Approved"
                    ? "text-[9px] font-medium text-emerald-700 sm:text-[10px]"
                    : "text-[9px] font-medium text-amber-800 sm:text-[10px]"
                }
              >
                {row.status}
              </p>
            </span>
          </li>
        ))}
      </ul>

      <footer className="mt-4 rounded-xl border border-black/10 bg-gradient-to-br from-neutral-950/[0.03] to-transparent px-3 py-2.5 sm:mt-5 sm:px-4 sm:py-3">
        <p className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1 text-[10px] sm:text-[11px]">
          <span className="min-w-0 text-neutral-900/50">Estimated this month</span>
          <span className="shrink-0 font-semibold tabular-nums text-neutral-950">$4,200</span>
        </p>
        <progress
          className="mt-2 block h-1 w-full appearance-none overflow-hidden rounded-full bg-black/10 sm:h-1.5 [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-black/10 [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-neutral-950/80 [&::-moz-progress-bar]:rounded-full [&::-moz-progress-bar]:bg-neutral-950/80"
          value={68}
          max={100}
          aria-label="Estimated earnings progress"
        />
        <p className="mt-1.5 text-[9px] leading-snug text-neutral-900/45 break-words text-pretty sm:text-[10px]">
          Illustrative preview — numbers shown when you are live on Muhr.
        </p>
      </footer>
    </aside>
  );
}

export default function MuhrLanding() {
  const headline = useInView(0.1);
  const cards = useInView(0.1);

  return (
    <>
      <section className="relative overflow-hidden">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,0,0,0.06),transparent_45%),radial-gradient(circle_at_80%_20%,rgba(88,80,236,0.16),transparent_35%),radial-gradient(circle_at_20%_40%,rgba(0,200,255,0.10),transparent_35%)]"
        />

        <MarketingHeader activeNav="home" />

        <span
          aria-hidden
          className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#f5f5f7] to-transparent"
        />

        <section
          ref={headline.ref}
          className={`relative mx-auto grid max-w-7xl items-start gap-8 px-5 py-10 transition-all duration-1000 sm:gap-10 sm:px-8 sm:py-20 md:grid-cols-[1fr_0.85fr] md:gap-12 lg:px-10 lg:py-28 xl:grid-cols-[1.1fr_0.9fr] ${
            headline.inView ? "translate-y-0 opacity-100" : "translate-y-12 opacity-0"
          }`}
        >
          <header className="flex flex-col">
            <p className="mb-4 inline-flex max-w-full items-center rounded-full border border-black/10 bg-white/70 px-3 py-1 text-[11px] leading-snug text-neutral-900/70 backdrop-blur-sm sm:mb-5 sm:px-4 sm:py-2 sm:text-xs">
              <span className="text-balance">Turn your likeness into a revenue stream</span>
            </p>

            <h1 className="text-[1.65rem] font-semibold leading-[1.08] tracking-tight text-balance break-words min-[400px]:text-[1.85rem] sm:text-5xl lg:text-[3.5rem] xl:text-6xl">
              Vault your likeness. Earn when it&apos;s used.
            </h1>

            <p className="mt-4 max-w-prose text-sm leading-6 text-neutral-900/70 sm:mt-5 sm:text-lg sm:leading-7">
              Brands and filmmakers license your face and voice for AI-generated content. You set your rates,
              approve every brief, and keep your earnings—Muhr handles consent and paperwork behind the scenes.
            </p>

            <section className="mt-6 flex w-full flex-col gap-4 sm:mt-8 sm:gap-5">
              <WaitlistForm userType="creator" label="Join the waitlist" variant="primary" />
            </section>
          </header>

          <LicenseOffersCard />
        </section>

        <section
          ref={cards.ref}
          className={`relative mx-auto max-w-7xl px-5 pb-10 sm:px-8 sm:pb-20 lg:px-10 lg:pb-28 transition-all duration-1000 delay-200 ${
            cards.inView ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          <ul className="grid list-none grid-cols-1 gap-2.5 min-[480px]:grid-cols-3 sm:gap-3">
            {whatYouGet.map((card, index) => (
              <li
                key={card.title}
                className="rounded-xl border border-black/10 bg-white/70 p-3 backdrop-blur-sm transition-all duration-700 sm:rounded-2xl sm:p-4"
                style={{ transitionDelay: `${index * 100 + 200}ms` }}
              >
                <h2 className="text-xs font-medium sm:text-sm">{card.title}</h2>
                <p className="mt-1.5 text-[11px] leading-snug text-neutral-900/60 text-pretty sm:mt-2 sm:text-xs sm:leading-normal">
                  {card.body}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </section>

      <FaqSection
        id="faq"
        className="mx-auto max-w-7xl px-5 py-10 sm:px-6 sm:py-16 lg:px-10 lg:py-20"
      />

      <section className="mx-auto max-w-5xl px-5 pb-16 pt-2 text-center sm:px-6 sm:pb-24 sm:pt-4 lg:px-10">
        <h2 className="text-2xl font-semibold tracking-tight text-balance break-words sm:text-3xl md:text-4xl">
          Stop misuse. Start licensing with confidence.
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-pretty text-sm text-neutral-900/65 sm:mt-4 sm:text-base">
          Whether you need fast takedowns or a clean licensing package, we help you secure your identity and
          keep control over where your likeness and voice appear.
        </p>
        <section className="mx-auto mt-6 max-w-sm sm:mt-8">
          <WaitlistForm userType="creator" label="Request help" variant="primary" />
        </section>
      </section>

      <MarketingFooter />
    </>
  );
}
