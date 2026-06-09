"use client";

import { useState } from "react";
import { cx } from "@/lib/cx";
import type { FaqItem } from "@/lib/landing/landingContent";

export function FaqAccordionItem({ question, answer, defaultOpen = false }: FaqItem & { defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <article className={cx("faq-item", open && "open")}>
      <h3 className="m-0">
        <button
          type="button"
          className="faq-trigger"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {question}
          <span className="plus" aria-hidden />
        </button>
      </h3>
      {open ? <p className="faq-ans">{answer}</p> : null}
    </article>
  );
}
