import { LandingWaitlistForm } from "./LandingWaitlistForm";

export function LandingBrandCtaBand() {
  return (
    <section className="cta-band band ink" id="waitlist">
      <div className="wrap">
        <h2>
          License cleared talent for <em>AI video</em>.
        </h2>
        <p className="lead">Early access to the talent library.</p>
        <div className="waitlist-wrap">
          <LandingWaitlistForm userType="business" />
        </div>
      </div>
    </section>
  );
}
