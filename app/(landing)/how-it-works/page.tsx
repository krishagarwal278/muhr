import type { Metadata } from "next";
import { LandingCtaBand } from "@/components/landing/LandingCtaBand";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingInboxSection } from "@/components/landing/LandingInboxSection";
import { LandingProcessFlow } from "@/components/landing/LandingProcessFlow";

export const metadata: Metadata = {
  title: "How it works — Muhr",
  description: "Verify, vault, review license requests, and get paid—on your terms.",
};

export default function HowItWorksPage() {
  return (
    <>
      <LandingHeader activeNav="how-it-works" />

      <main>
        <section className="band alt band-tight">
          <div className="wrap">
            <div className="page-intro-inline">
              <span className="eyebrow">How it works</span>
              <h1>Your likeness. Your rules. Your payout.</h1>
              <p className="lead">Four steps from verified vault to paid license.</p>
            </div>

            <LandingProcessFlow />
          </div>
        </section>

        <LandingInboxSection />
        <LandingCtaBand />
      </main>

      <LandingFooter />
    </>
  );
}
