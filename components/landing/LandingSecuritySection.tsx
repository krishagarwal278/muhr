import Image from "next/image";
import { securityBadges } from "@/lib/landing/landingContent";

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 2 4 6v6c0 5 3.5 8 8 10 4.5-2 8-5 8-10V6l-8-4z" />
    </svg>
  );
}

const badgeIcons = {
  lock: LockIcon,
  x: XIcon,
  shield: ShieldIcon,
} as const;

export function LandingSecuritySection() {
  return (
    <section className="band">
      <div className="wrap legal-grid" style={{ alignItems: "center" }}>
        <div className="sec-portrait">
          <Image
            src="/landing-security-portrait.png"
            alt="Portrait in studio"
            fill
            sizes="(max-width: 900px) 100vw, 540px"
            className="object-cover object-center"
          />
        </div>
        <div>
          <span className="eyebrow">Data &amp; security</span>
          <h2 style={{ fontSize: "clamp(32px,4.6vw,58px)", marginTop: 22 }}>
            Your face and voice never train a model.
          </h2>
          <p className="lead" style={{ marginTop: 22 }}>
            Photos and audio live in encrypted, access-controlled storage, used only to produce a specific
            approved video. We never sell your data, and we never use your likeness to train AI.
          </p>
          <div className="badges">
            {securityBadges.map((badge) => {
              const Icon = badgeIcons[badge.icon];
              return (
                <span key={badge.label} className="badge">
                  <Icon />
                  {badge.label}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
