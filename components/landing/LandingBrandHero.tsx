import Image from "next/image";
import Link from "next/link";
import { BrandAvatar } from "@/components/landing/BrandAvatar";
import { brandHeroFloatLicense } from "@/lib/landing/landingContent";

export function LandingBrandHero() {
  return (
    <section className="hero">
      <div className="wrap hero-grid">
        <div className="hero-copy">
          <span className="eyebrow">Licensing for AI video</span>
          <h1>
            Real faces and voices, <em>cleared</em> for AI video.
          </h1>
          <p className="lead">
            Verified talent for AI campaigns — every likeness signed and rights-cleared.
          </p>
          <div className="hero-cta">
            <Link href="#waitlist" className="btn btn-primary">
              Request brand access
            </Link>
            <Link href="#talent-library" className="btn btn-ghost">
              Browse the library
            </Link>
          </div>
        </div>
        <div className="hero-visual">
          <div className="portrait">
            <Image
              src="/landing-hero-portrait.png"
              alt="Editorial portrait"
              fill
              priority
              sizes="(max-width: 900px) 100vw, 480px"
              className="object-cover object-top"
            />
          </div>
          <div className="float-card">
            <div className="fc-head">
              <span className="fc-title">License cleared</span>
              <span className="fc-badge">Signed</span>
            </div>
            {brandHeroFloatLicense.map((row) => (
              <div key={row.name} className="fc-row">
                <BrandAvatar letter={row.initial} tone={row.avatarTone} size="sm" className="fc-avatar" />
                <div className="fc-meta">
                  <div className="fc-name">{row.name}</div>
                  <div className="fc-sub">{row.detail}</div>
                </div>
                {row.action != null ? (
                  <span className="fc-action">{row.action}</span>
                ) : (
                  <div className="fc-amt">{row.amount}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
