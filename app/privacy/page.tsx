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
        <p className="mt-3 text-sm text-neutral-900/50">Last updated: May 31, 2026</p>

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
            <h3 className="mb-2 mt-4 text-sm font-semibold text-neutral-950">Identity verification data</h3>
            <p>When you create a Talent profile, our identity verification process collects:</p>
            <ul className="mt-3 space-y-2 pl-4">
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>Government-issued identification documents (passport, driver's license, or national ID)</li>
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>Personal information including legal name, date of birth, and contact information</li>
            </ul>
            <h3 className="mb-2 mt-4 text-sm font-semibold text-neutral-950">Profile content</h3>
            <p>When you create a profile, we collect:</p>
            <ul className="mt-3 space-y-2 pl-4">
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>Name (or stage name), photographs, videos, and voice recordings you upload</li>
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>Demographic information (age range, ethnicity, physical characteristics) for searchable attributes</li>
            </ul>
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
            <h2 className="mb-3 text-base font-semibold text-neutral-950">4. Data storage and security</h2>
            <p>
              Your data is stored securely using Supabase (PostgreSQL), hosted on infrastructure
              compliant with industry security standards. We do not sell your personal data to
              third parties.
            </p>
            <p className="mt-3">We implement industry-standard security measures to protect your data, including:</p>
            <ul className="mt-3 space-y-2 pl-4">
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>Encrypted storage of Profile Content and identity assets</li>
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>Secure transmission of payment information via Stripe Connect</li>
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>Access controls limiting who can view sensitive identity verification data</li>
            </ul>
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
              <a href="mailto:contact@muhr.app" className="text-neutral-950 underline underline-offset-2 hover:text-neutral-700">
                contact@muhr.app
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
              <a href="mailto:contact@muhr.app" className="text-neutral-950 underline underline-offset-2 hover:text-neutral-700">
                contact@muhr.app
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-neutral-950">9. Data protection</h2>
            <p>
              Your use of the Platform is subject to this Privacy Policy, which describes in detail how we
              collect, use, store, and protect your personal data. By using the Platform, you consent to our
              data practices as described in this Privacy Policy and in this Section 9.
            </p>

            <h3 className="mb-2 mt-6 text-sm font-semibold text-neutral-950">9.1 Applicability of Indian data protection law</h3>
            <p>
              If you are located in India, or your personal data is processed in connection with offering
              services to you in India, our processing of your personal data is governed by the Digital
              Personal Data Protection Act, 2023 and the rules made under it (&quot;DPDP Law&quot;), and by the
              Information Technology Act, 2000 and its rules to the extent applicable. Nothing in this Privacy
              Policy limits or waives any right you have, or any obligation Muhr has, under the DPDP Law.
            </p>

            <h3 className="mb-2 mt-6 text-sm font-semibold text-neutral-950">9.2 Personal data we collect</h3>
            <p>
              We collect and process the following personal data: your government-issued identification
              document, legal name (and stage name, if provided), date of birth, contact details,
              photographs, videos, voice recordings, other Likeness materials, demographic information you
              provide, and payment-related information necessary to pay you.
            </p>

            <h3 className="mb-2 mt-6 text-sm font-semibold text-neutral-950">9.3 Consent to processing</h3>
            <p>
              By creating an account and using the Platform, you consent to Muhr collecting, storing, using,
              and processing your personal data for the following purposes: verifying your identity,
              displaying your profile to potential buyers, facilitating licensing transactions, processing
              payments, operating and improving the Platform, and complying with law. We process your
              personal data only for these specified purposes.
            </p>

            <h3 className="mb-2 mt-6 text-sm font-semibold text-neutral-950">9.4 Sensitive data</h3>
            <p>
              You acknowledge that some data you provide — such as your government-issued identification
              and biometric-type Likeness data (photographs, video, and voice) — is sensitive in nature.
              You consent to its collection and processing for identity verification and Platform operation,
              and we apply enhanced security measures to protect it.
            </p>

            <h3 className="mb-2 mt-6 text-sm font-semibold text-neutral-950">9.5 Your rights as a data principal</h3>
            <p>Under applicable Indian data protection law, you have the right to:</p>
            <ul className="mt-3 space-y-2 pl-4">
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>Access a summary of the personal data we hold about you</li>
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>Request correction or updating of inaccurate or incomplete data</li>
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>Request erasure of your personal data where the purpose has been fulfilled or you withdraw consent</li>
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>Nominate another individual to exercise your rights in the event of your death or incapacity</li>
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>Readily withdraw your consent</li>
            </ul>
            <p className="mt-4">
              To exercise these rights, contact our Grievance Officer (Section 9.11). We will respond within
              the timelines required by applicable law.
            </p>

            <h3 className="mb-2 mt-6 text-sm font-semibold text-neutral-950">9.6 Withdrawal of consent</h3>
            <p>
              You may withdraw your consent to the processing of your personal data at any time, as easily as
              you gave it. Withdrawal does not affect the lawfulness of processing carried out before
              withdrawal. If you withdraw consent that is necessary to operate your account, we may be unable
              to continue providing the Platform to you, and we will cease processing and erase the relevant
              personal data, subject to legal retention requirements.
            </p>

            <h3 className="mb-2 mt-6 text-sm font-semibold text-neutral-950">9.7 Data retention and erasure</h3>
            <p>
              We retain your personal data only for as long as necessary to fulfill the purposes for which it
              was collected, to comply with our legal obligations, or to resolve disputes. Identity-verification
              data is retained for seven (7) years after account closure or your last successful identity
              verification, whichever is later, unless a longer period is required by law. When the applicable
              retention period ends, or upon a valid erasure request or account deactivation, we will delete
              or anonymize your personal data, subject to backup retention cycles and legal requirements.
            </p>

            <h3 className="mb-2 mt-6 text-sm font-semibold text-neutral-950">9.8 Security</h3>
            <p>
              We implement reasonable security safeguards to protect your personal data, including encrypted
              storage of Profile Content and identity-verification data, secure transmission of payment
              information, access controls limiting who can view sensitive identity-verification data, and
              logging and monitoring of access.
            </p>

            <h3 className="mb-2 mt-6 text-sm font-semibold text-neutral-950">9.9 Cross-border transfer</h3>
            <p>
              Your personal data may be stored or processed on servers and by service providers (including
              payment processors) located outside India. We transfer personal data outside India only in
              compliance with applicable law and applicable government restrictions on transfers to specified
              countries.
            </p>

            <h3 className="mb-2 mt-6 text-sm font-semibold text-neutral-950">9.10 Personal data breach</h3>
            <p>
              In the event of a personal data breach, we will notify the Data Protection Board of India and
              affected users in the manner and within the timelines required by applicable law, and take
              reasonable steps to mitigate harm.
            </p>

            <h3 className="mb-2 mt-6 text-sm font-semibold text-neutral-950">9.11 Grievance officer</h3>
            <p>
              If you have any complaint or grievance regarding the processing of your personal data, you may
              contact our Grievance Officer:
            </p>
            <ul className="mt-3 space-y-2 pl-4">
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>Name: Krish Agarwal</li>
              <li className="flex gap-3">
                <span className="shrink-0 text-neutral-900/40">—</span>
                Email:{" "}
                <a href="mailto:contact@muhr.app" className="text-neutral-950 underline underline-offset-2 hover:text-neutral-700">
                  contact@muhr.app
                </a>
              </li>
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>Address: Mumbai, MH</li>
            </ul>
            <p className="mt-4">
              We will acknowledge your grievance and respond within the period prescribed under applicable
              law. If you are not satisfied with our response, you may escalate your complaint to the Data
              Protection Board of India.
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
