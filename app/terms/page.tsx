import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Terms of Service — Muhr",
};

export default function Terms() {
  return (
    <div className="min-h-screen bg-[#f5f5f7] text-neutral-950">
      <header className="mx-auto flex max-w-4xl items-center justify-between px-6 py-6 lg:px-10">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/logo.png" alt="Muhr" width={32} height={32} className="rounded-xl" />
          <span className="text-sm font-semibold tracking-tight">Muhr</span>
        </Link>
        <span className="text-xs uppercase tracking-widest text-neutral-900/50">Terms of Service</span>
      </header>

      <main className="mx-auto max-w-4xl px-6 pb-24 pt-8 lg:px-10">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Terms of Service</h1>
        <p className="mt-3 text-sm text-neutral-900/50">Last updated: April 16, 2026</p>

        <div className="mt-10 space-y-10 text-sm leading-7 text-neutral-900/70">
          <section>
            <h2 className="mb-3 text-base font-semibold text-neutral-950">1. Acceptance of terms</h2>
            <p>
              By accessing or using Muhr ("the Service"), you agree to be bound by these Terms of
              Service. If you do not agree to these terms, do not use the Service. These terms apply
              to all visitors, users, and others who access the Service.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-neutral-950">2. Description of service</h2>
            <p>
              Muhr is an identity infrastructure platform that enables creators to license their
              likeness, voice, and persona to businesses under defined contractual terms. The Service
              includes waitlist registration, the creator vault, licensing workflows, and any
              associated tooling.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-neutral-950">3. Eligibility</h2>
            <p>
              You must be at least 18 years of age to use the Service. By using the Service, you
              represent and warrant that you meet this requirement and that all information you
              provide is accurate and complete.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-neutral-950">4. Waitlist</h2>
            <p>
              Joining the waitlist does not guarantee access to the Service. We reserve the right to
              grant or deny access at our sole discretion. Waitlist positions are not transferable.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-neutral-950">5. Intellectual property</h2>
            <p>
              All content on the Muhr platform—including software, design, copy, and
              branding—belongs to Muhr or its licensors. You may not reproduce, distribute, or
              create derivative works without written permission.
            </p>
            <p className="mt-3">
              Creator-uploaded identity assets remain the intellectual property of the respective
              creator. Muhr is granted a limited, non-exclusive licence to process and display
              assets solely for the purpose of operating the Service.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-neutral-950">6. Prohibited conduct</h2>
            <p>You agree not to:</p>
            <ul className="mt-3 space-y-2 pl-4">
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>Use the Service for any unlawful purpose</li>
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>Upload or distribute content that infringes on the rights of others</li>
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>Attempt to reverse-engineer, scrape, or exploit the Service</li>
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>Impersonate another person or entity</li>
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>Interfere with the security or integrity of the Service</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-neutral-950">7. Limitation of liability</h2>
            <p>
              To the fullest extent permitted by law, Muhr shall not be liable for any indirect,
              incidental, special, consequential, or punitive damages arising from your use of, or
              inability to use, the Service. Our total aggregate liability shall not exceed the
              greater of £100 or the amount you paid us in the preceding 12 months.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-neutral-950">8. Termination</h2>
            <p>
              We reserve the right to suspend or terminate your access to the Service at any time,
              with or without notice, for conduct that we believe violates these terms or is harmful
              to the Service, other users, or third parties.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-neutral-950">9. Changes to terms</h2>
            <p>
              We may revise these terms at any time. We will notify you of significant changes via
              email or a prominent notice on the Service. Continued use after changes take effect
              constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-neutral-950">10. Governing law</h2>
            <p>
              These terms are governed by and construed in accordance with the laws of the state of New York, USA. Any disputes shall be subject to the exclusive jurisdiction of the courts of
              New York, USA.
            </p>  
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-neutral-950">11. Contact</h2>
            <p>
              Questions about these terms?{" "}
              <a href="mailto:legal@Muhr.io" className="text-neutral-950 underline underline-offset-2 hover:text-neutral-700">
                legal@Muhr.io
              </a>
            </p>
          </section>
        </div>
      </main>

      <footer className="mx-auto max-w-4xl border-t border-black/10 px-6 py-6 lg:px-10">
        <div className="flex flex-wrap gap-6 text-xs text-neutral-900/50">
          <Link href="/" className="transition hover:text-neutral-950">Home</Link>
          <Link href="/privacy" className="transition hover:text-neutral-950">Privacy</Link>
          <Link href="/cookies" className="transition hover:text-neutral-950">Cookie Policy</Link>
        </div>
      </footer>
    </div>
  );
}
