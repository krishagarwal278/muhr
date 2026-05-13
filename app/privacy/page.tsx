import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Privacy Policy — Muhr",
};

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#f5f5f7] text-neutral-950">
      <header className="mx-auto flex max-w-4xl items-center justify-between px-6 py-6 lg:px-10">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/logo.png" alt="Muhr" width={32} height={32} className="rounded-xl" />
          <span className="text-sm font-semibold tracking-tight">Muhr</span>
        </Link>
        <span className="text-xs uppercase tracking-widest text-neutral-900/50">Privacy Policy</span>
      </header>

      <main className="mx-auto max-w-4xl px-6 pb-24 pt-8 lg:px-10">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Privacy Policy</h1>
        <p className="mt-3 text-sm text-neutral-900/50">Last updated: May 13, 2026</p>

        <div className="mt-10 space-y-10 text-sm leading-7 text-neutral-900/70">
          <section>
            <h2 className="mb-3 text-base font-semibold text-neutral-950">1. Who we are</h2>
            <p>
              Muhr ("we", "us", "our") is an identity infrastructure platform for AI media. We
              operate the website at muhr.app and any associated services. When you interact with
              our waitlist, contact forms, or platform, you are sharing information with us.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-neutral-950">2. What we collect</h2>
            <p>We collect the following information when you join our waitlist or use our service:</p>
            <ul className="mt-3 space-y-2 pl-4">
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>Email address and account type (creator or business) when you join the waitlist</li>
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>Usage data, such as pages visited and features used, collected automatically via cookies</li>
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>Technical data including IP address, browser type, and device information</li>
            </ul>
            <p className="mt-4">
              When you upload identity assets such as face photographs or voice recordings to your
              Vault, we collect and process biometric personal data. This data is processed only
              with your explicit consent and is subject to enhanced protections under the Digital
              Personal Data Protection Act 2023.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-neutral-950">3. How we use your data</h2>
            <ul className="space-y-2 pl-4">
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>To contact you about early access and product updates</li>
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>To improve and personalise our platform</li>
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>To analyse usage patterns and optimise the user experience</li>
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>To comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-neutral-950">4. Data storage</h2>
            <p>
              Your data is stored securely using Supabase (PostgreSQL), hosted on infrastructure
              compliant with industry security standards. We do not sell your personal data to
              third parties.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-neutral-950">5. Your rights</h2>
            <p>You have the right to:</p>
            <ul className="mt-3 space-y-2 pl-4">
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>Access the personal data we hold about you</li>
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>Request correction or deletion of your data</li>
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>Withdraw consent to marketing communications at any time</li>
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>Lodge a complaint with a supervisory authority</li>
            </ul>
            <p className="mt-4">
              To exercise any of these rights, contact us at{" "}
              <a href="mailto:support@muhr.app" className="text-neutral-950 underline underline-offset-2 hover:text-neutral-700">
                support@muhr.app
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-neutral-950">6. Cookies</h2>
            <p>
              We use cookies to understand how our site is used and to remember your preferences.
              See our{" "}
              <Link href="/cookies" className="text-neutral-950 underline underline-offset-2 hover:text-neutral-700">
                Cookie Policy
              </Link>{" "}
              for full details.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-neutral-950">7. Changes to this policy</h2>
            <p>
              We may update this policy as our service evolves. We will notify waitlist members of
              any material changes by email. Continued use of our service after changes are posted
              constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-neutral-950">8. Contact</h2>
            <p>
              For any privacy-related questions, contact{" "}
              <a href="mailto:support@muhr.app" className="text-neutral-950 underline underline-offset-2 hover:text-neutral-700">
                support@muhr.app
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-neutral-950">9. Grievance Officer</h2>
            <p>
              For complaints or concerns relating to the processing of your personal data under
              applicable law (including the Digital Personal Data Protection Act 2023), you may
              contact our Grievance Officer: <strong className="font-semibold text-neutral-950">Krish Agarwal</strong>, at{" "}
              <a href="mailto:support@muhr.app" className="text-neutral-950 underline underline-offset-2 hover:text-neutral-700">
                support@muhr.app
              </a>
              . We will acknowledge your communication and aim to respond within thirty (30) days.
            </p>
          </section>
        </div>
      </main>

      <footer className="mx-auto max-w-4xl border-t border-black/10 px-6 py-6 lg:px-10">
        <div className="flex flex-wrap gap-6 text-xs text-neutral-900/50">
          <Link href="/" className="transition hover:text-neutral-950">Home</Link>
          <Link href="/terms" className="transition hover:text-neutral-950">Terms</Link>
          <Link href="/cookies" className="transition hover:text-neutral-950">Cookie Policy</Link>
        </div>
      </footer>
    </div>
  );
}
