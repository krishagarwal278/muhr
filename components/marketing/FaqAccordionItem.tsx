"use client";

import { useId, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { cx } from "@/lib/cx";
import type { FaqItem } from "@/lib/marketing/landingContent";

export function FaqAccordionItem({ question, answer }: FaqItem) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const triggerId = `${panelId}-trigger`;

  return (
    <article className="border-t border-black/10 first:border-t-0">
      <h3 className="m-0">
        <button
          type="button"
          id={triggerId}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((value) => !value)}
          className="flex w-full items-center justify-between gap-4 py-4 text-left transition-colors hover:text-neutral-950 sm:py-5"
        >
          <span className="text-sm font-semibold text-neutral-950 sm:text-base">{question}</span>
          <Icon
            name="chevron-down"
            size="sm"
            aria-hidden
            className={cx(
              "shrink-0 text-neutral-400 transition-transform duration-300 ease-out",
              open && "rotate-180"
            )}
          />
        </button>
      </h3>
      <section
        id={panelId}
        role="region"
        aria-labelledby={triggerId}
        aria-hidden={!open}
        inert={open ? undefined : true}
        className={cx(
          "grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <p className="overflow-hidden pb-4 text-xs leading-6 text-neutral-900/70 text-pretty sm:pb-5 sm:text-sm sm:leading-7">
          {answer}
        </p>
      </section>
    </article>
  );
}
