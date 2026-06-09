import { faqItems } from "@/lib/landing/landingContent";
import { FaqAccordionItem } from "./FaqAccordionItem";

type FaqSectionProps = {
  id?: string;
};

export function FaqSection({ id = "faq" }: FaqSectionProps) {
  return (
    <section className="band alt" id={id} aria-labelledby="faq-heading">
      <div className="wrap" style={{ maxWidth: 900 }}>
        <div className="sec-head center">
          <span className="eyebrow">Questions</span>
          <h2 id="faq-heading">Frequently asked</h2>
        </div>
        <div className="faq">
          {faqItems.slice(0, 5).map((item, index) => (
            <FaqAccordionItem key={item.question} {...item} defaultOpen={index === 0} />
          ))}
        </div>
      </div>
    </section>
  );
}
