import { hybridPillars, landingPillars } from "@/lib/landing/landingContent";

type LandingPillarsProps = {
  id?: string;
  eyebrow?: string;
  title?: string;
  lead?: string;
  showLead?: boolean;
  compact?: boolean;
  variant?: "creator" | "hybrid";
};

export function LandingPillars({
  id = "how",
  eyebrow = "How it works",
  title = "Three steps. You're in control.",
  lead,
  showLead = false,
  compact = false,
  variant = "creator",
}: LandingPillarsProps) {
  const pillars = variant === "hybrid" ? hybridPillars : landingPillars;
  return (
    <section className={compact ? "band band-tight" : "band"} id={id}>
      <div className="wrap">
        <div className="sec-head">
          <span className="eyebrow">{eyebrow}</span>
          <h2>{title}</h2>
          {lead ? <p className="lead">{lead}</p> : null}
          {showLead && !lead ? (
            <p className="lead">Every step stays under your control.</p>
          ) : null}
        </div>
        <div className={compact ? "pillars pillars-tight" : "pillars"}>
          {pillars.map((pillar) => (
            <div key={pillar.idx} className="pillar">
              <span className="idx">{pillar.idx}</span>
              <h3>{pillar.title}</h3>
              <p>{pillar.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
