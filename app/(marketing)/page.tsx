"use client";
import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { UserType, WaitlistResponse } from "../../types";

// ─── Data ────────────────────────────────────────────────────────────────────

const creatorBenefits = [
  "Secure your identity, voice, and likeness with clear documentation and a defensible paper trail",
  "Get impersonations removed from social platforms with coordinated reporting and follow-through",
  "Pursue AI model takedowns and dataset removals for unauthorized use of your identity",
  "License your likeness on your terms—who can use it, where it can appear, for how long, and for what purpose",
];

const steps = [
  {
    title: "Assess",
    body: "We map your exposure across social, search, and AI surfaces and identify the highest-risk misuse vectors.",
  },
  {
    title: "Document",
    body: "We prepare the documents and evidence package needed to support takedowns and licensing (papers and/or filings as appropriate).",
  },
  {
    title: "Enforce",
    body: "We run coordinated takedowns across social platforms and pursue AI model/dataset removals when your identity is used without permission.",
  },
  {
    title: "License",
    body: "When you want to collaborate, we structure licensing so your likeness and voice are used only within defined, enforceable boundaries.",
  },
];

const heroCards = [
  { title: "Identity secured", body: "Evidence + documentation that stands up" },
  { title: "Takedowns executed", body: "Social platforms + AI model removals" },
  { title: "Licensing ready", body: "Clear rights, scope, and approvals" },
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setState("loading");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, user_type: userType }),
      });
      const data: WaitlistResponse = await res.json();
      if (data.success) {
        setState("success");
        setMessage(data.message);
        setEmail("");
      } else {
        setState("error");
        setMessage(data.message);
      }
    } catch {
      setState("error");
      setMessage("Something went wrong. Please try again.");
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
  );
}

function WireframeCard() {
  return (
    <div className="rounded-3xl border border-black/10 bg-white/70 p-4 backdrop-blur-sm sm:rounded-[2rem] sm:p-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] text-neutral-900/45 sm:text-xs">Identity Protection File</p>
          <p className="mt-0.5 text-base font-semibold text-neutral-950 sm:text-lg">Enforcement In Progress</p>
        </div>
        <div className="flex h-7 w-7 items-center justify-center rounded-full border border-black/10 bg-white sm:h-8 sm:w-8">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-400/60 sm:h-2 sm:w-2" />
        </div>
      </div>

      {/* Creator identity card */}
      <div className="mt-4 rounded-xl border border-black/10 bg-white p-3 sm:mt-5 sm:p-4">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="h-9 w-9 shrink-0 rounded-full border border-dashed border-black/20 bg-black/[0.02] sm:h-10 sm:w-10" />
          <div className="flex-1 space-y-1.5">
            <div className="h-2 w-24 rounded-full bg-black/10 sm:h-2.5 sm:w-28" />
            <div className="h-1.5 w-16 rounded-full bg-black/5 sm:h-2 sm:w-20" />
          </div>
          <div className="rounded-full border border-black/10 bg-black/[0.02] px-2 py-0.5 text-[9px] text-neutral-900/55 sm:px-2.5 sm:py-1 sm:text-[10px]">Protected</div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 border-t border-black/10 pt-3 sm:mt-4 sm:pt-4">
          {["Identity", "Voice", "Likeness"].map((label) => (
            <div key={label} className="rounded-lg border border-dashed border-black/15 bg-black/[0.01] p-1.5 text-center sm:p-2">
              <div className="mx-auto mb-1 h-5 w-5 rounded-md border border-dashed border-black/15 bg-black/[0.02] sm:mb-1.5 sm:h-6 sm:w-6" />
              <p className="text-[9px] text-neutral-900/45 sm:text-[10px]">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Contract rows */}
      <div className="mt-3 space-y-2 sm:mt-4 sm:space-y-2.5">
        {[
          { label: "Surfaces", value: "Social · Search · AI" },
          { label: "Actions", value: "Reports · Notices · Requests" },
          { label: "Status", value: "Open cases: 3" },
        ].map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between rounded-lg border border-black/10 bg-white px-2.5 py-1.5 sm:px-3 sm:py-2">
            <span className="text-[11px] text-neutral-900/45 sm:text-xs">{label}</span>
            <span className="text-[11px] font-medium text-neutral-900/70 sm:text-xs">{value}</span>
          </div>
        ))}
      </div>

      {/* Usage bar */}
      <div className="mt-4 sm:mt-5">
        <div className="mb-1.5 flex items-center justify-between text-[10px] sm:mb-2 sm:text-[11px]">
          <span className="text-neutral-900/50">Resolution progress</span>
          <span className="font-medium text-neutral-900/70">72%</span>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-black/10 sm:h-1.5">
          <div className="h-full w-[72%] rounded-full bg-neutral-950/70" />
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MuhrLanding() {
  const headline = useInView(0.1);
  const cards = useInView(0.1);

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-neutral-950">
      {/* ── Text-only hero ───────────────────────────────────────────── */}
      <div className="relative overflow-hidden">
        {/* Ambient gradients */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,0,0,0.06),transparent_45%),radial-gradient(circle_at_80%_20%,rgba(88,80,236,0.16),transparent_35%),radial-gradient(circle_at_20%_40%,rgba(0,200,255,0.10),transparent_35%)]" />

        {/* Floating header */}
        <header className="relative z-header mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:py-5 lg:px-10 lg:py-6">
          <div className="flex items-center gap-2 md:gap-3">
            <Image
              src="/logo.png"
              alt="Muhr"
              width={30}
              height={30}
              className="h-auto w-auto rounded-2xl md:h-9 md:w-9"
            />
            <div>
              <div className="text-[10px] md:text-xs uppercase tracking-[0.22em] text-neutral-900/60">Muhr</div>
              <div className="text-sm md:text-base font-semibold tracking-tight text-neutral-950 leading-tight">
                Secure and license your identity
              </div>
            </div>
          </div>
          <nav className="flex items-center gap-1">
            <a
              href="#how"
              className="hidden rounded-full px-4 py-2 text-sm font-medium text-neutral-900/70 transition hover:bg-black/5 hover:text-neutral-950 md:block"
            >
              How it works
            </a>
            <Link
              href="/login"
              className="rounded-full px-4 py-2 text-sm font-medium text-neutral-900/70 transition hover:bg-black/5 hover:text-neutral-950"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-neutral-950 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
            >
              Sign up
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
          <div className="mb-4 inline-flex w-fit items-center rounded-full border border-black/10 bg-white/70 px-3 py-1 text-[11px] text-neutral-900/70 backdrop-blur-sm sm:mb-5 sm:px-4 sm:py-2 sm:text-xs">
            We help you secure your identity, voice, and likeness
          </div>

          <h1 className="text-[1.75rem] font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-[3.5rem] xl:text-6xl">
            Protect your likeness. Control who can use it.
          </h1>

          <p className="mt-4 text-sm leading-6 text-neutral-900/70 sm:mt-5 sm:text-lg sm:leading-7">
            We coordinate social platform takedowns, pursue AI model/dataset removals, and prepare the papers and documents you need to enforce your rights or license your identity safely.
          </p>

          <div className="mt-6 flex w-full flex-col gap-4 sm:mt-8 sm:gap-5">
            <div>
              <p className="mb-1 text-[10px] font-medium uppercase tracking-widest text-neutral-900/40 sm:mb-1.5 sm:text-xs"></p>
              <WaitlistForm userType="creator" label="Get protection help" variant="primary" />
            </div>
            <div>
              {/* <p className="mb-1 text-[10px] font-medium uppercase tracking-widest text-white/40 sm:mb-1.5 sm:text-xs">For businesses</p>
              <WaitlistForm userType="business" label="License likeness safely" variant="secondary" /> */}
            </div>
          </div>
        </div>

        {/* Wireframe: hidden on small phones, shows from md upward; on sm it sits below as a teaser */}
        <div className="w-full">
          <WireframeCard />
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
          {heroCards.map((card, i) => (
            <div
              key={card.title}
              className="rounded-xl border border-black/10 bg-white/70 p-3 backdrop-blur-sm transition-all duration-700 sm:rounded-2xl sm:p-4"
              style={{ transitionDelay: `${i * 100 + 200}ms` }}
            >
              <div className="text-xs font-medium sm:text-sm">{card.title}</div>
              <div className="mt-1.5 text-[11px] text-neutral-900/60 sm:mt-2 sm:text-xs">{card.body}</div>
            </div>
          ))}
        </div>
      </div>
      </div>{/* end hero wrapper */}

      {/* ── How it works ─────────────────────────────────────────────── */}
      <section id="how" className="mx-auto max-w-7xl px-5 py-10 sm:px-6 sm:py-16 lg:px-10 lg:py-20">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl">Secure first. Enforce fast. License safely.</h2>
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

      {/* ── For individuals ───────────────────────────────────────────── */}
      <section id="creators" className="mx-auto max-w-7xl px-5 py-10 sm:px-6 sm:py-16 lg:px-10 lg:py-20">
        <div className="rounded-xl border border-black/10 bg-white/60 p-5 sm:rounded-2xl sm:p-8">
          <h3 className="text-xl font-semibold tracking-tight sm:text-2xl">For individuals</h3>
          <p className="mt-1.5 text-sm text-neutral-900/60 sm:mt-2 sm:text-base">Secure your identity, voice, and likeness.</p>
          <p className="mt-2 text-xs leading-6 text-neutral-900/55 sm:text-sm sm:leading-7">
            Also available for brands and agencies that need to license likeness safely.
          </p>
          <div className="mt-4 space-y-2.5 sm:mt-6 sm:space-y-3">
            {creatorBenefits.map((benefit) => (
              <div key={benefit} className="flex gap-2.5 text-xs leading-6 text-neutral-900/70 sm:gap-3 sm:text-sm sm:leading-7">
                <span className="mt-0.5 shrink-0 text-neutral-900/35 sm:mt-1">—</span>
                {benefit}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-5 pb-16 pt-2 text-center sm:px-6 sm:pb-24 sm:pt-4 lg:px-10">
        <h3 className="text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl">Stop misuse. Start licensing with confidence.</h3>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-neutral-900/65 sm:mt-4 sm:text-base">
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
