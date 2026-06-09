import Image from "next/image";
import Link from "next/link";
import { BrandAvatar } from "@/components/landing/BrandAvatar";
import { heroFloatBriefs } from "@/lib/landing/landingContent";

export function LandingHero() {
  return (
    <section className="hero">
      <div className="wrap hero-grid">
        <div className="hero-copy">
          <span className="eyebrow">Licensing for your likeness</span>
          <h1>
            Your likeness, licensed on <em>your</em> terms.
          </h1>
          <p className="lead">
            Brands license your face and voice for AI-generated video. You set the rate, approve every use,
            and get paid. Muhr handles the consent and the contracts.
          </p>
          <div className="hero-cta">
            <Link href="#waitlist" className="btn btn-primary">
              Join the waitlist
            </Link>
            <Link href="/how-it-works" className="btn btn-ghost">
              See how it works
            </Link>
          </div>
        </div>
        <div className="hero-visual">
          <div className="portrait">
            <Image
              src="/landing-hero-portrait.png"
              alt="Creator portrait"
              fill
              priority
              sizes="(max-width: 900px) 100vw, 480px"
              className="object-cover object-top"
            />
          </div>
          <div className="float-card">
            <div className="fc-head">
              <span className="fc-title">Incoming briefs</span>
              <span className="fc-badge">3 new</span>
            </div>
            {heroFloatBriefs.map((brief) => (
              <div key={brief.brand} className="fc-row">
                <BrandAvatar letter={brief.initial} tone={brief.avatarTone} size="sm" className="fc-avatar" />
                <div className="fc-meta">
                  <div className="fc-name">{brief.brand}</div>
                  <div className="fc-sub">{brief.detail}</div>
                </div>
                {brief.showReview ? (
                  <span className="fc-action">Review</span>
                ) : (
                  <div className="fc-amt">{brief.pay}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
