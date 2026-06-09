import { FaqSection } from "@/components/landing/FaqSection";
import { LandingControlSection } from "@/components/landing/LandingControlSection";
import { LandingCtaBand } from "@/components/landing/LandingCtaBand";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingLegalSection } from "@/components/landing/LandingLegalSection";
import { LandingSecuritySection } from "@/components/landing/LandingSecuritySection";
import { LandingTrustLine } from "@/components/landing/LandingTrustLine";

export default function LandingPage() {
  return (
    <>
      <LandingHeader activeNav="home" />
      <main id="top">
        <LandingHero />
        <LandingTrustLine />
        <LandingLegalSection />
        <LandingControlSection />
        <LandingSecuritySection />
        <FaqSection />
        <LandingCtaBand />
      </main>
      <LandingFooter />
    </>
  );
}
