import { Icon } from "@/components/ui/icon";
import { whatYouGet } from "@/lib/marketing/landingContent";

type WhatYouGetProps = {
  className?: string;
};

export function WhatYouGet({ className }: WhatYouGetProps) {
  return (
    <section className={className} aria-labelledby="what-you-get-heading">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <h2
          id="what-you-get-heading"
          className="text-xl font-semibold tracking-tight text-balance break-words sm:text-2xl"
        >
          What you get
        </h2>
        <p className="max-w-sm text-xs text-neutral-900/55 sm:text-sm">
          Your likeness, licensed on your terms.
        </p>
      </header>

      <ul className="mt-5 grid list-none gap-3 sm:mt-6 sm:grid-cols-3 sm:gap-4">
        {whatYouGet.map((item) => (
          <li
            key={item.title}
            className="rounded-xl border border-black/10 bg-white/60 p-4 sm:rounded-2xl sm:p-5"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-black/10 bg-white">
              <Icon name={item.icon} size="sm" className="text-neutral-800" aria-hidden />
            </span>
            <h3 className="mt-3 text-sm font-semibold text-neutral-950">{item.title}</h3>
            <p className="mt-1 text-xs leading-5 text-neutral-900/65 text-pretty sm:text-sm sm:leading-6">
              {item.body}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
