import { BrandAvatar } from "@/components/landing/BrandAvatar";
import { licenseBriefs } from "@/lib/landing/landingContent";

export function LandingInboxSection() {
  return (
    <section className="band">
      <div className="wrap">
        <div className="sec-head">
          <span className="eyebrow">Your license inbox</span>
          <h2>Briefs come to you. You decide.</h2>
          <p className="lead">
            Brands send the project, the terms, and the rate. You review on your time and approve only what
            fits.
          </p>
        </div>
        <div className="inbox">
          <div className="inbox-bar">
            <span className="t">Incoming offers</span>
            <span className="count">3 awaiting review</span>
          </div>
          {licenseBriefs.map((brief) => (
            <div key={brief.brand} className="brief">
              <BrandAvatar letter={brief.initial} tone={brief.avatarTone} className="av" />
              <div>
                <div className="nm">{brief.brand}</div>
                <div className="ds">{brief.detail}</div>
              </div>
              <div className="pay">{brief.pay}</div>
              <span className={`st ${brief.status}`}>
                {brief.status === "review" ? "Review" : "Approved"}
              </span>
            </div>
          ))}
          <div className="inbox-foot">
            <span className="lbl">Estimated this month</span>
            <span className="est">$8,250</span>
          </div>
        </div>
        <p className="illus-note">Illustrative preview. Figures appear once you are live on Muhr.</p>
      </div>
    </section>
  );
}
