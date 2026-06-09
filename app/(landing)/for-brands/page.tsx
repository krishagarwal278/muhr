import type { Metadata } from "next";
import { LandingBrandCtaBand } from "@/components/landing/LandingBrandCtaBand";
import { LandingBrandHero } from "@/components/landing/LandingBrandHero";
import { LandingBrandSection } from "@/components/landing/LandingBrandSection";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingHeader } from "@/components/landing/LandingHeader";

export const metadata: Metadata = {
  title: "For brands — Muhr",
  description:
    "Browse verified, rights-cleared talent for AI-generated video campaigns. License with confidence.",
};

export default function ForBrandsPage() {
  return (
    <>
      <LandingHeader activeNav="for-brands" />
      <main id="top">
        <LandingBrandHero />
        <LandingBrandSection />
        <LandingBrandCtaBand />
      </main>
      <LandingFooter />
    </>
  );
}
