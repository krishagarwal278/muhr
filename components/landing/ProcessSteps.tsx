import { processSteps } from "@/lib/landing/landingContent";
import { ProcessFlowDiagram } from "./ProcessFlowDiagram";

type ProcessStepsProps = {
  className?: string;
};

export function ProcessSteps({ className }: ProcessStepsProps) {
  return (
    <section className={className} aria-labelledby="process-steps-heading">
      <h2
        id="process-steps-heading"
        className="text-2xl font-semibold tracking-tight text-balance break-words sm:text-3xl md:text-4xl"
      >
        Verify once. Review offers. Get paid.
      </h2>

      <ProcessFlowDiagram />

      <ul className="mt-6 grid list-none gap-2 sm:mt-8 sm:grid-cols-2 sm:gap-3 xl:grid-cols-4">
        {processSteps.map((step) => (
          <li
            key={step.title}
            className="rounded-xl border border-black/10 bg-white/40 px-4 py-3 sm:rounded-2xl sm:px-5 sm:py-4"
          >
            <h3 className="text-sm font-medium text-neutral-950">{step.title}</h3>
            <p className="mt-1 text-xs leading-5 text-neutral-900/65 text-pretty sm:text-sm sm:leading-6">
              {step.body}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
