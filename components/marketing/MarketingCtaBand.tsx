import { WaitlistForm } from "./WaitlistForm";

type MarketingCtaBandProps = {
  id?: string;
  title: string;
  description: string;
  label?: string;
  className?: string;
};

export function MarketingCtaBand({
  id = "join",
  title,
  description,
  label = "Join the waitlist",
  className,
}: MarketingCtaBandProps) {
  return (
    <section
      id={id}
      className={className}
      aria-labelledby={`${id}-heading`}
    >
      <article className="rounded-2xl border border-black/10 bg-white/60 px-5 py-8 text-center sm:rounded-3xl sm:px-10 sm:py-10">
        <h2
          id={`${id}-heading`}
          className="text-xl font-semibold tracking-tight text-balance break-words sm:text-2xl md:text-3xl"
        >
          {title}
        </h2>
        <p className="mx-auto mt-2 max-w-md text-pretty text-sm text-neutral-900/65 sm:mt-3">
          {description}
        </p>
        <section className="mx-auto mt-5 max-w-sm sm:mt-6">
          <WaitlistForm userType="creator" label={label} variant="primary" />
        </section>
      </article>
    </section>
  );
}
