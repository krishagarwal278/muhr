import { LandingWaitlistForm } from "./LandingWaitlistForm";

type LandingCtaBandProps = {
  id?: string;
};

export function LandingCtaBand({ id = "waitlist" }: LandingCtaBandProps) {
  return (
    <section className="cta-band band ink" id={id}>
      <div className="wrap">
        <h2>
          Take control of your <em>likeness</em>.
        </h2>
        <p className="lead">Join the waitlist for early access.</p>
        <div className="waitlist-wrap">
          <LandingWaitlistForm />
        </div>
      </div>
    </section>
  );
}
