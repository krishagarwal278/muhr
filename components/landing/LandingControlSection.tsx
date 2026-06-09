import { controlChecks } from "@/lib/landing/landingContent";

export function LandingControlSection() {
  return (
    <section className="band alt">
      <div className="wrap control-grid">
        <div>
          <span className="eyebrow">Total control</span>
          <h2 style={{ fontSize: "clamp(32px,4.6vw,58px)", marginTop: 22 }}>Two checkpoints. Every time.</h2>
        </div>
        <div className="check-stack">
          {controlChecks.map((check) => (
            <div key={check.sections[0].title} className="check">
              <div>
                {check.sections.map((section, index) => (
                  <div key={section.title} style={index > 0 ? { marginTop: 26 } : undefined}>
                    <h4>{section.title}</h4>
                    <p>{section.body}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
