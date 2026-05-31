import { faqItems } from "@/lib/marketing/landingContent";
import { FaqAccordionItem } from "./FaqAccordionItem";

type FaqSectionProps = {
  className?: string;
  id?: string;
};

export function FaqSection({ className, id = "faq" }: FaqSectionProps) {
  return (
    <section id={id} className={className} aria-labelledby="faq-heading">
      <h2
        id="faq-heading"
        className="text-2xl font-semibold tracking-tight text-balance break-words sm:text-3xl md:text-4xl"
      >
        Frequently asked questions
      </h2>
      <article className="mt-6 rounded-xl border border-black/10 bg-white/60 p-5 sm:mt-8 sm:rounded-2xl sm:p-8">
        {faqItems.map((item) => (
          <FaqAccordionItem key={item.question} {...item} />
        ))}
      </article>
    </section>
  );
}
