import { legalItems } from "@/lib/landing/landingContent";

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 2 4 6v6c0 5 3.5 8 8 10 4.5-2 8-5 8-10V6l-8-4z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
      <path d="m5 12 5 5 9-11" />
    </svg>
  );
}

export function LandingLegalSection() {
  return (
    <section className="band ink" id="legal">
      <div className="wrap legal-grid">
        <div>
          <span className="eyebrow">Protection by design</span>
          <h2 style={{ fontSize: "clamp(32px,4.6vw,58px)", marginTop: 22 }}>
            Every use is backed by a signed license.
          </h2>
          <p className="lead" style={{ marginTop: 22, maxWidth: "36ch" }}>
            Scope, duration, and permitted use — all documented.
          </p>
          <div className="legal-list">
            {legalItems.map((item) => (
              <div key={item.num} className="legal-item">
                <span className="num">{item.num}</span>
                <div>
                  <h4>{item.title}</h4>
                  <p>{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="legal-visual">
          <div className="doc-card">
            <div className="doc-seal">
              <div className="ring">
                <ShieldIcon />
              </div>
              <div>
                <h4>Likeness License Agreement</h4>
                <p>Right of publicity · Executed copy</p>
              </div>
            </div>
            <div className="doc-rows">
              <div className="dr">
                <span className="k">Licensee</span>
                <span className="v">Northwind Studios</span>
              </div>
              <div className="dr">
                <span className="k">Scope</span>
                <span className="v">AI video, paid social</span>
              </div>
              <div className="dr">
                <span className="k">Duration</span>
                <span className="v">90 days · US only</span>
              </div>
              <div className="dr">
                <span className="k">Fee</span>
                <span className="v">$2,400</span>
              </div>
            </div>
            <div className="doc-foot">
              <span className="signature">Muhr</span>
              <span className="signed">
                <CheckIcon /> Signed &amp; sealed
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
