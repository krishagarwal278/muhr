import type { Metadata } from "next";
import { MarketingCtaBand } from "@/components/marketing/MarketingCtaBand";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { ProcessSteps } from "@/components/marketing/ProcessSteps";
import { WhatYouGet } from "@/components/marketing/WhatYouGet";

export const metadata: Metadata = {
  title: "How it works — Muhr",
  description: "Verify, vault, review license requests, and get paid—on your terms.",
};

export default function HowItWorksPage() {
  return (
    <>
      <MarketingHeader activeNav="how-it-works" />

      <main className="mx-auto max-w-7xl px-5 pb-10 sm:px-6 sm:pb-16 lg:px-10 lg:pb-20">
        <header className="border-b border-black/10 pb-8 pt-4 sm:pb-10 sm:pt-6">
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-neutral-900/45 sm:text-xs">
            How it works
          </p>
          <h1 className="mt-3 max-w-2xl text-2xl font-semibold tracking-tight text-balance break-words sm:text-3xl md:text-4xl">
            Your likeness. Your rules. Your payout.
          </h1>
          <p className="mt-3 max-w-lg text-sm leading-6 text-neutral-900/65 sm:text-base">
            Four steps from verified vault to paid license.
          </p>
        </header>

        <ProcessSteps className="py-10 sm:py-14 lg:py-16" />

        <WhatYouGet className="border-t border-black/10 pt-10 sm:pt-14 lg:pt-16" />

        <MarketingCtaBand
          title="Ready when you are"
          description="Early access opens soon. Join once—we'll handle the rest."
          label="Join the waitlist"
          className="mt-10 border-t border-black/10 pt-10 sm:mt-14 sm:pt-14"
        />
      </main>

      <MarketingFooter />
    </>
  );
}
