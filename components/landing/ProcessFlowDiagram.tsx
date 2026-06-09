import { Icon } from "@/components/ui/icon";
import { processSteps } from "@/lib/landing/landingContent";

export function ProcessFlowDiagram() {
  return (
    <figure className="mt-8 rounded-2xl border border-black/10 bg-white/60 p-5 sm:mt-10 sm:p-8">
      <figcaption className="sr-only">Creator workflow from verification to payout</figcaption>

      <ol className="flex list-none flex-col gap-5 md:flex-row md:items-start md:gap-0">
        {processSteps.map((step, index) => (
          <li key={step.title} className="contents">
            <article className="flex min-w-0 flex-1 flex-col items-start gap-3 md:items-center md:text-center">
              <span className="flex items-center gap-3 md:flex-col">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-black/10 bg-white shadow-sm sm:h-12 sm:w-12">
                  <Icon name={step.icon} size="sm" className="text-neutral-800" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-[10px] font-medium uppercase tracking-widest text-neutral-900/35">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <strong className="mt-0.5 block text-sm font-semibold text-neutral-950">{step.title}</strong>
                  <span className="mt-0.5 block text-xs text-neutral-900/55">{step.hint}</span>
                </span>
              </span>
            </article>

            {index < processSteps.length - 1 ? (
              <span className="flex items-center justify-center py-1 md:w-8 md:shrink-0 md:self-center md:py-0 lg:w-10">
                <Icon
                  name="chevron-down"
                  size="sm"
                  aria-hidden
                  className="text-neutral-300 md:hidden"
                />
                <Icon
                  name="arrow-right"
                  size="sm"
                  aria-hidden
                  className="hidden text-neutral-300 md:block"
                />
              </span>
            ) : null}
          </li>
        ))}
      </ol>

      <p className="mt-6 border-t border-black/10 pt-5 text-center text-xs text-neutral-900/50 sm:text-sm">
        <span className="font-medium text-neutral-700">You hold the gate.</span> Nothing ships without your sign-off.
      </p>
    </figure>
  );
}
