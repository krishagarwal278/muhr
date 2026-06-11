import Image from "next/image";
import Link from "next/link";
import {
  brandTalentProfiles,
  brandValueProps,
  type BrandValuePropIcon,
} from "@/lib/landing/landingContent";

function ValuePropIcon({ icon }: { icon: BrandValuePropIcon }) {
  if (icon === "shield") {
    return (
      <>
        <path d="M12 2 4 6v6c0 5 3.5 8 8 10 4.5-2 8-5 8-10V6l-8-4z" />
        <path d="m9 12 2 2 4-4" />
      </>
    );
  }
  if (icon === "people") {
    return (
      <>
        <circle cx="9" cy="8" r="3.2" />
        <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
        <path d="M16 6.5a3.2 3.2 0 0 1 0 6.3M22 20a5.5 5.5 0 0 0-4-5.3" />
      </>
    );
  }
  return <path d="M3 7h18M3 12h18M3 17h12" />;
}

function VerifiedIcon() {
  return (
    <svg className="vf" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
      <path d="M12 2 4 6v6c0 5 3.5 8 8 10 4.5-2 8-5 8-10V6l-8-4z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

export function LandingBrandSection() {
  return (
    <section className="band alt" id="talent-library">
      <div className="wrap">
        <div className="sec-head">
          <span className="eyebrow">For brands · The talent library</span>
          <h2>A library of cleared, consenting talent.</h2>
          <p className="lead">Rights-cleared creators across looks, voices, and audiences.</p>
        </div>

        <div className="talent">
          <div className="talent-bar">
            <span className="t">Browse talent</span>
            <span className="talent-search">
              <SearchIcon />
              Search by look, voice, audience…
            </span>
            <div className="talent-chips">
              <span className="chip on">All</span>
              <span className="chip">Lifestyle</span>
              <span className="chip">Voice</span>
              <span className="chip">Tech</span>
            </div>
          </div>

          <div className="talent-grid">
            {brandTalentProfiles.map((profile) => (
              <div key={profile.name} className="tcard">
                <div className="tav">
                  {"image" in profile && profile.image ? (
                    <Image
                      src={profile.image}
                      alt={profile.imageAlt}
                      fill
                      sizes="(max-width: 480px) 100vw, 240px"
                      className="object-cover object-center"
                    />
                  ) : null}
                </div>
                <div className="tn">
                  {profile.name}
                  <VerifiedIcon />
                </div>
                <div className="tt">{profile.tags}</div>
                <div className="tmeta">
                  <span className="trate">from {profile.rate}</span>
                  <span className="tcleared">Cleared</span>
                </div>
              </div>
            ))}
          </div>

          <div className="talent-foot">
            <span className="lbl">Verified consent on every profile.</span>
            <Link href="#waitlist" className="btn btn-primary btn-sm">
              Request brand access
            </Link>
          </div>
        </div>

        <div className="valueprops">
          {brandValueProps.map((prop) => (
            <div key={prop.title} className="vprop">
              <svg
                className="vic"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden
              >
                <ValuePropIcon icon={prop.icon} />
              </svg>
              <h4>{prop.title}</h4>
              <p>{prop.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
