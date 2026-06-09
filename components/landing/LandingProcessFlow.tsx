import { Icon } from "@/components/ui/icon";
import { processSteps } from "@/lib/landing/landingContent";

export function LandingProcessFlow() {
  return (
    <figure className="process-flow">
      <figcaption className="sr-only">Creator workflow from verification to payout</figcaption>
      <ol className="process-flow-steps">
        {processSteps.map((step, index) => (
          <li key={step.title} className="process-flow-cell">
            <article className="process-step">
              <span className="process-step-icon">
                <Icon name={step.icon} size="sm" className="text-[var(--ink-2)]" aria-hidden />
              </span>
              <span className="process-step-num">{String(index + 1).padStart(2, "0")}</span>
              <strong className="process-step-title">{step.title}</strong>
              <span className="process-step-hint">{step.hint}</span>
            </article>
            {index < processSteps.length - 1 ? (
              <span className="process-arrow" aria-hidden>
                <Icon name="chevron-down" size="sm" className="process-arrow-mobile" />
                <Icon name="arrow-right" size="sm" className="process-arrow-desktop" />
              </span>
            ) : null}
          </li>
        ))}
      </ol>
      <p className="process-flow-foot">
        <strong>You hold the gate.</strong> Nothing ships without your sign-off.
      </p>
    </figure>
  );
}
