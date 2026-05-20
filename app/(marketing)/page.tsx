"use client";
import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { WaitlistDetailsModal } from "@/components/waitlist/WaitlistDetailsModal";
import { UserType, WaitlistResponse } from "../../types";

// ─── Data ────────────────────────────────────────────────────────────────────

const whatYouGet = [
  {
    title: "Verified identity vault",
    body: "Government ID verification, biometric face match, and documented consent that proves you own your likeness.",
  },
  {
    title: "License marketplace access",
    body: "Brands submit requests to use your likeness. You set your rates, review briefs, and approve only what you're comfortable with.",
  },
  {
    title: "Direct payouts",
    body: "Paid directly to your account when content goes live.",
  },
];

const steps = [
  {
    title: "Verify",
    body: "Prove it is you with a government approved ID and a biometric face match so buyers and platforms can trust your vault.",
  },
  {
    title: "Vault",
    body: "Store face and voice references securely. You decide what can be shared when a licensed request comes in.",
  },
  {
    title: "Review requests",
    body: "Brands and studios send briefs, channels, and rates. You accept, counter, or decline—nothing ships without you.",
  },
  {
    title: "Earn",
    body: "When approved use goes live, payouts hit your account. Muhr keeps the paperwork aligned with what you approved.",
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

type FormState = "idle" | "loading" | "success" | "error";

interface WaitlistFormProps {
  userType: UserType;
  label: string;
  variant: "primary" | "secondary";
}

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);
  return { ref, inView };
}

// ─── Components ──────────────────────────────────────────────────────────────

function WaitlistForm({ userType, label, variant }: WaitlistFormProps) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<FormState>("idle");
  const [message, setMessage] = useState("");
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setState("loading");
    setDetailsError(null);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, user_type: userType }),
      });
      const data: WaitlistResponse = await res.json();
      if (res.ok && data.success) {
        if (data.needsDetails) {
          setPendingEmail(email.trim().toLowerCase());
          setDetailsOpen(true);
          setState("idle");
        } else {
          setState("success");
          setMessage(data.message);
          setEmail("");
        }
      } else {
        setState("error");
        setMessage(
          data.message ||
            (res.status === 429 ? "Too many submissions. Try again later." : "Something went wrong.")
        );
      }
    } catch {
      setState("error");
      setMessage("Something went wrong. Please try again.");
    }
  }

  async function submitDetails(instagram: string, profession: string) {
    if (!pendingEmail) return;
    setDetailsLoading(true);
    setDetailsError(null);
    try {
      const res = await fetch("/api/waitlist/details", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: pendingEmail,
          instagram_profile: instagram,
          profession,
        }),
      });
      const data: WaitlistResponse = await res.json();
      if (res.ok && data.success) {
        setDetailsOpen(false);
        setState("success");
        setMessage(data.message);
        setEmail("");
        setPendingEmail(null);
      } else {
        setDetailsError(data.message || "Something went wrong.");
      }
    } catch {
      setDetailsError("Something went wrong. Please try again.");
    } finally {
      setDetailsLoading(false);
    }
  }

  if (state === "success") {
    return (
      <div className="mt-2 rounded-full border border-black/10 bg-white/70 px-4 py-2.5 text-xs text-neutral-900/70 backdrop-blur-sm sm:px-5 sm:py-3 sm:text-sm">
        {message}
      </div>
    );
  }

  return (
    <>
    <WaitlistDetailsModal
      open={detailsOpen}
      email={pendingEmail ?? email}
      loading={detailsLoading}
      error={detailsError}
      onClose={() => {
        setDetailsOpen(false);
        setState("success");
        setMessage("You're on the list. We'll be in touch.");
        setEmail("");
        setPendingEmail(null);
      }}
      onSubmit={(instagram, profession) => void submitDetails(instagram, profession)}
    />
    <form onSubmit={handleSubmit} className="mt-2 flex flex-col gap-2 min-[480px]:flex-row">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          if (state === "error") setState("idle");
        }}
        placeholder="your@email.com"
        className={`w-full flex-1 rounded-full border px-4 py-2.5 text-xs text-neutral-950 placeholder:text-neutral-500/70 outline-none transition focus:border-black/20 sm:px-5 sm:py-3.5 sm:text-sm ${
          state === "error"
            ? "border-red-500/50 bg-red-500/5"
            : "border-black/10 bg-white/80 backdrop-blur-sm"
        }`}
      />
      <button
        type="submit"
        disabled={state === "loading"}
        className={`w-full shrink-0 rounded-full px-5 py-2.5 text-xs font-medium transition disabled:opacity-60 sm:px-6 sm:py-3.5 sm:text-sm min-[480px]:w-auto ${
          variant === "primary"
            ? "bg-neutral-950 text-white hover:opacity-90"
            : "border border-black/10 bg-white/70 text-neutral-900 hover:bg-white"
        }`}
      >
        {state === "loading" ? (
          <span className="flex items-center justify-center gap-2">
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent sm:h-3.5 sm:w-3.5" />
            Processing…
          </span>
        ) : (
          label
        )}
      </button>
      {state === "error" && (
        <p className="w-full pl-2 text-[11px] text-red-400 sm:text-xs">{message}</p>
      )}
    </form>
    </>
  );
}

const mockLicenseOffers = [
  {
    brand: "Northwind Studios",
    detail: "AI campaign · 30s likeness",
    offer: "$2,400",
    status: "Review" as const,
  },
  {
    brand: "Velvet Labs",
    detail: "Voice + face · product launch",
    offer: "$5,000",
    status: "Review" as const,
  },
  {
    brand: "Lyra AI",
    detail: "Synthetic media library",
    offer: "$850",
    status: "Approved" as const,
  },
];

function LicenseOffersCard() {
  return (
    <div className="rounded-3xl border border-black/10 bg-white/70 p-4 backdrop-blur-sm sm:rounded-[2rem] sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 pr-1">
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-neutral-900/45 sm:text-xs">
            Likeness requests
          </p>
          <p className="mt-0.5 text-base font-semibold tracking-tight text-neutral-950 sm:text-lg">Incoming offers</p>
          <p className="mt-1 text-[11px] leading-snug text-neutral-900/55 sm:text-xs">
            <span className="text-pretty">Brands send briefs and rates—you approve before anything goes live.</span>
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-[10px] font-medium text-amber-950 sm:px-3 sm:text-[11px]">
          3 new
        </span>
      </div>

      <div className="mt-4 space-y-2 sm:mt-5 sm:space-y-2.5">
        {mockLicenseOffers.map((row) => (
          <div
            key={row.brand}
            className="flex min-h-[3.25rem] items-center justify-between gap-2 rounded-xl border border-black/10 bg-white px-2.5 py-2 sm:gap-3 sm:px-3 sm:py-2.5"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-medium text-neutral-950 sm:text-xs" title={row.brand}>
                {row.brand}
              </p>
              <p className="truncate text-[10px] text-neutral-900/50 sm:text-[11px]" title={row.detail}>
                {row.detail}
              </p>
            </div>
            <div className="shrink-0 text-right tabular-nums">
              <p className="text-[11px] font-semibold tabular-nums text-neutral-950 sm:text-xs">{row.offer}</p>
              <p
                className={
                  row.status === "Approved"
                    ? "text-[9px] font-medium text-emerald-700 sm:text-[10px]"
                    : "text-[9px] font-medium text-amber-800 sm:text-[10px]"
                }
              >
                {row.status}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-black/10 bg-gradient-to-br from-neutral-950/[0.03] to-transparent px-3 py-2.5 sm:mt-5 sm:px-4 sm:py-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1 text-[10px] sm:text-[11px]">
          <span className="min-w-0 text-neutral-900/50">Estimated this month</span>
          <span className="shrink-0 font-semibold tabular-nums text-neutral-950">$4,200</span>
        </div>
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-black/10 sm:h-1.5">
          <div className="h-full w-[68%] rounded-full bg-neutral-950/80" />
        </div>
        <p className="mt-1.5 text-[9px] leading-snug text-neutral-900/45 break-words text-pretty sm:text-[10px]">
          Illustrative preview — numbers shown when you are live on Muhr.
        </p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MuhrLanding() {
  const headline = useInView(0.1);
  const cards = useInView(0.1);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f5f5f7] text-neutral-950">
      {/* ── Text-only hero ───────────────────────────────────────────── */}
      <div className="relative overflow-hidden">
        {/* Ambient gradients */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,0,0,0.06),transparent_45%),radial-gradient(circle_at_80%_20%,rgba(88,80,236,0.16),transparent_35%),radial-gradient(circle_at_20%_40%,rgba(0,200,255,0.10),transparent_35%)]" />

        {/* Floating header */}
        <header className="relative z-header mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 md:py-5 lg:px-10 lg:py-6">
          <div className="flex min-w-0 flex-1 items-center gap-2 md:gap-3">
            <Image
              src="/logo.png"
              alt="Muhr"
              width={30}
              height={30}
              className="h-auto w-auto shrink-0 rounded-2xl md:h-9 md:w-9"
            />
            <div className="min-w-0">
              <div className="text-[10px] md:text-xs uppercase tracking-[0.22em] text-neutral-900/60">Muhr</div>
              <div className="text-xs font-semibold leading-snug tracking-tight text-neutral-950 break-words text-balance sm:text-sm md:text-base md:leading-tight">
                Vault, license, and earn from your likeness
              </div>
            </div>
          </div>
          <nav className="flex shrink-0 items-center gap-1">
            <a
              href="#how"
              className="hidden rounded-full px-4 py-2 text-sm font-medium text-neutral-900/70 transition hover:bg-black/5 hover:text-neutral-950 md:block"
            >
              How it works
            </a>
            <Link
              href="/login"
              className="rounded-full bg-neutral-950 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
            >
              Sign in
            </Link>
          </nav>
        </header>

        {/* Bottom gradient fade into page bg */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#f5f5f7] to-transparent" />

      {/* ── Headline + wireframe ─────────────────────────────────────── */}
      <div
        ref={headline.ref}
        className={`relative mx-auto grid max-w-7xl items-start gap-8 px-5 py-10 transition-all duration-1000 sm:gap-10 sm:px-8 sm:py-20 md:grid-cols-[1fr_0.85fr] md:gap-12 lg:px-10 lg:py-28 xl:grid-cols-[1.1fr_0.9fr] ${
          headline.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
        }`}
      >
        <div className="flex flex-col">
          <div className="mb-4 inline-flex max-w-full items-center rounded-full border border-black/10 bg-white/70 px-3 py-1 text-[11px] leading-snug text-neutral-900/70 backdrop-blur-sm sm:mb-5 sm:px-4 sm:py-2 sm:text-xs">
            <span className="text-balance">Turn your likeness into a revenue stream</span>
          </div>

          <h1 className="text-[1.65rem] font-semibold leading-[1.08] tracking-tight text-balance break-words min-[400px]:text-[1.85rem] sm:text-5xl lg:text-[3.5rem] xl:text-6xl">
            Vault your likeness. Earn when it&apos;s used.
          </h1>

          <p className="mt-4 max-w-prose text-sm leading-6 text-neutral-900/70 sm:mt-5 sm:text-lg sm:leading-7">
            Brands and filmmakers license your face and voice for AI-generated content. You set your rates, approve every brief, and keep your earnings—Muhr handles consent and paperwork behind the scenes.
          </p>

          <div className="mt-6 flex w-full flex-col gap-4 sm:mt-8 sm:gap-5">
            <div>
              <p className="mb-1 text-[10px] font-medium uppercase tracking-widest text-neutral-900/40 sm:mb-1.5 sm:text-xs"></p>
              <WaitlistForm userType="creator" label="Join the waitlist" variant="primary" />
            </div>
            <div>
              {/* <p className="mb-1 text-[10px] font-medium uppercase tracking-widest text-white/40 sm:mb-1.5 sm:text-xs">For businesses</p>
              <WaitlistForm userType="business" label="License likeness safely" variant="secondary" /> */}
            </div>
          </div>
        </div>

        {/* Wireframe: hidden on small phones, shows from md upward; on sm it sits below as a teaser */}
        <div className="w-full">
          <LicenseOffersCard />
        </div>
      </div>

      {/* ── Feature cards ────────────────────────────────────────────── */}
      <div
        ref={cards.ref}
        className={`relative mx-auto max-w-7xl px-5 pb-10 sm:px-8 sm:pb-20 lg:px-10 lg:pb-28 transition-all duration-1000 delay-200 ${
          cards.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
      >
        <div className="grid grid-cols-1 gap-2.5 min-[480px]:grid-cols-3 sm:gap-3">
          {whatYouGet.map((card, i) => (
            <div
              key={card.title}
              className="rounded-xl border border-black/10 bg-white/70 p-3 backdrop-blur-sm transition-all duration-700 sm:rounded-2xl sm:p-4"
              style={{ transitionDelay: `${i * 100 + 200}ms` }}
            >
              <div className="text-xs font-medium sm:text-sm">{card.title}</div>
              <div className="mt-1.5 text-[11px] leading-snug text-neutral-900/60 text-pretty sm:mt-2 sm:text-xs sm:leading-normal">
                {card.body}
              </div>
            </div>
          ))}
        </div>
      </div>
      </div>{/* end hero wrapper */}

      {/* ── How it works ─────────────────────────────────────────────── */}
      <section id="how" className="mx-auto max-w-7xl px-5 py-10 sm:px-6 sm:py-16 lg:px-10 lg:py-20">
        <h2 className="text-2xl font-semibold tracking-tight text-balance break-words sm:text-3xl md:text-4xl">
          Verify once. Review offers. Get paid.
        </h2>
        <div className="mt-6 grid grid-cols-1 gap-3 sm:mt-10 sm:gap-6 md:grid-cols-2 xl:grid-cols-4">
          {steps.map((step, i) => (
            <div key={step.title} className="rounded-xl border border-black/10 bg-white/60 p-4 sm:rounded-2xl sm:p-6">
              <div className="mb-2 text-[10px] font-medium uppercase tracking-widest text-neutral-900/35 sm:mb-3 sm:text-xs">{String(i + 1).padStart(2, "0")}</div>
              <div className="text-sm font-medium">{step.title}</div>
              <p className="mt-1.5 text-xs leading-6 text-neutral-900/70 sm:mt-2 sm:text-sm sm:leading-7">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── What you get ──────────────────────────────────────────────── */}
      <section id="creators" className="mx-auto max-w-7xl px-5 py-10 sm:px-6 sm:py-16 lg:px-10 lg:py-20">
        <div className="rounded-xl border border-black/10 bg-white/60 p-5 sm:rounded-2xl sm:p-8">
          <h3 className="text-xl font-semibold tracking-tight text-balance break-words sm:text-2xl md:text-3xl">
            Vault your likeness. Earn when it&apos;s used.
          </h3>
          <p className="mt-3 max-w-prose text-sm leading-7 text-neutral-900/70 sm:mt-4 sm:text-base sm:leading-8">
            Turn your identity into a revenue stream. Brands and filmmakers license your face and voice for AI-generated
            content. You approve every use and keep your earnings.
          </p>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-900/45 sm:mt-8 sm:text-sm">
            What you get
          </p>
          <div className="mt-3 space-y-4 sm:mt-4 sm:space-y-5">
            {whatYouGet.map((item) => (
              <div key={item.title} className="border-t border-black/10 pt-4 first:border-t-0 first:pt-0 sm:pt-5 first:sm:pt-0">
                <p className="text-sm font-semibold text-neutral-950 sm:text-base">{item.title}</p>
                <p className="mt-1.5 max-w-prose text-xs leading-6 text-neutral-900/70 text-pretty sm:text-sm sm:leading-7">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-5 pb-16 pt-2 text-center sm:px-6 sm:pb-24 sm:pt-4 lg:px-10">
        <h3 className="text-2xl font-semibold tracking-tight text-balance break-words sm:text-3xl md:text-4xl">
          Stop misuse. Start licensing with confidence.
        </h3>
        <p className="mx-auto mt-3 max-w-2xl text-pretty text-sm text-neutral-900/65 sm:mt-4 sm:text-base">
          Whether you need fast takedowns or a clean licensing package, we help you secure your identity and keep control over where your likeness and voice appear.
        </p>
        <div className="mx-auto mt-6 max-w-sm sm:mt-8">
          <WaitlistForm userType="creator" label="Request help" variant="primary" />
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="border-t border-black/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-5 py-6 text-[11px] text-neutral-900/45 sm:flex-row sm:gap-4 sm:px-6 sm:py-8 sm:text-xs lg:px-10">
          <span>© {new Date().getFullYear()} Muhr. All rights reserved.</span>
          <nav className="flex gap-5 sm:gap-6">
            <Link href="/privacy" className="transition hover:text-neutral-950">Privacy</Link>
            <Link href="/terms" className="transition hover:text-neutral-950">Terms</Link>
            <Link href="/cookies" className="transition hover:text-neutral-950">Cookies</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
