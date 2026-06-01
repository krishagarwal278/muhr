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
        <p className="mt-3 text-sm text-neutral-900/50">Last updated: May 23, 2026</p>

        <div className="mt-10 space-y-10 text-sm leading-7 text-neutral-900/70">
          <section>
            <h2 className="mb-3 text-base font-semibold text-neutral-950">1. Acceptance of terms</h2>
            <p>
              By creating an account on Muhr ("Platform"), you ("User", "you", or "Talent") agree to
              be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you
              may not use the Platform.
            </p>
            <p className="mt-3">
              These Terms govern your use of the Platform and your relationship with Muhr. These
              Terms do NOT govern specific licensing transactions between you and third-party
              buyers—those transactions are subject to separate License Agreements executed at the
              time of each transaction.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-neutral-950">2. Eligibility</h2>
            <p>To use the Platform, you must:</p>
            <ul className="mt-3 space-y-2 pl-4">
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>Be at least 18 years of age</li>
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>Have the legal capacity to enter into binding contracts</li>
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>Own or control all rights to your name, image, likeness, voice, and other personal attributes ("Likeness") that you upload to the Platform</li>
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>Not be prohibited by law from using the Platform</li>
            </ul>
            <p className="mt-3">
              By creating an account, you represent and warrant that you meet all eligibility requirements.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-neutral-950">3. Identity verification</h2>
            <h3 className="mb-2 mt-4 text-sm font-semibold text-neutral-950">3.1 Verification requirement</h3>
            <p>To create a Talent profile on the Platform, you must complete our identity verification process. This process requires you to:</p>
            <ul className="mt-3 space-y-2 pl-4">
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>Provide a government-issued identification document (passport, driver's license, or national ID)</li>
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>Provide accurate personal information (legal name, date of birth, contact information)</li>
            </ul>
            <h3 className="mb-2 mt-4 text-sm font-semibold text-neutral-950">3.2 Truthfulness and accuracy</h3>
            <p>You represent and warrant that:</p>
            <ul className="mt-3 space-y-2 pl-4">
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>You are the person depicted in the identification documents and photographs you submit</li>
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>All information you provide during verification is true, accurate, current, and complete</li>
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>You are not impersonating another person or using another person's identity</li>
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>You will update your information promptly if it changes</li>
            </ul>
            <h3 className="mb-2 mt-4 text-sm font-semibold text-neutral-950">3.3 Consequences of false information</h3>
            <p>
              Providing false, misleading, or inaccurate information during identity verification is
              grounds for immediate account termination and may constitute fraud under applicable law.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-neutral-950">4. Platform profile and data display</h2>
            <h3 className="mb-2 mt-4 text-sm font-semibold text-neutral-950">4.1 Grant of rights to display your profile</h3>
            <p>By creating a Talent profile on the Platform, you grant Muhr a limited, non-exclusive, worldwide license to:</p>
            <ul className="mt-3 space-y-2 pl-4">
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>Display your name (or stage name, if provided), photographs, videos, voice recordings, and other Likeness materials you upload ("Profile Content") to potential buyers browsing the Platform</li>
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>Use your Profile Content in Platform marketing materials, including website galleries, promotional materials, and pitch decks shown to potential enterprise clients</li>
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>Store and process your Profile Content on our servers and third-party hosting services</li>
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>Display demographic information you provide (age range, ethnicity, physical characteristics) as searchable/filterable attributes in the Platform catalog</li>
            </ul>
            <h3 className="mb-2 mt-4 text-sm font-semibold text-neutral-950">4.2 Scope limitation</h3>
            <p>This license is LIMITED to displaying your Profile Content for the purpose of connecting you with potential buyers. It does NOT include:</p>
            <ul className="mt-3 space-y-2 pl-4">
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>The right to use your Likeness in any commercial content, advertising, AI-generated video, or any other deliverable without a separate executed License Agreement and your explicit approval</li>
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>The right to sublicense your Likeness to third parties without your consent</li>
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>The right to create derivative works from your Likeness for purposes other than Platform operation</li>
            </ul>
            <h3 className="mb-2 mt-4 text-sm font-semibold text-neutral-950">4.3 Profile control</h3>
            <p>You retain ownership of your Likeness at all times. You may:</p>
            <ul className="mt-3 space-y-2 pl-4">
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>Update or modify your Profile Content at any time</li>
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>Set your profile to "unavailable" to pause new licensing opportunities</li>
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>Request removal of specific Profile Content</li>
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>Deactivate your account (subject to Section 13)</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-neutral-950">5. Prohibited uses</h2>
            <p>You may not use the Platform to:</p>
            <ul className="mt-3 space-y-2 pl-4">
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>Upload content that you do not own or have rights to</li>
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>Impersonate another person or misrepresent your identity</li>
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>Upload content depicting minors (persons under 18)</li>
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>Upload content that is defamatory, obscene, harassing, or violates any person's rights</li>
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>Circumvent or interfere with the Platform's security features or identity verification systems</li>
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>Scrape, data-mine, or automatically extract data from the Platform</li>
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>Use the Platform for any unlawful purpose</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-neutral-950">6. License transactions</h2>
            <h3 className="mb-2 mt-4 text-sm font-semibold text-neutral-950">6.1 Separate agreements</h3>
            <p>
              Any transaction in which a buyer licenses your Likeness for use in content creation is
              governed by a separate License Agreement executed between you, the buyer, and the
              Platform at the time of the transaction.
            </p>
            <h3 className="mb-2 mt-4 text-sm font-semibold text-neutral-950">6.2 Approval rights</h3>
            <p>You retain the right to review and approve or reject:</p>
            <ul className="mt-3 space-y-2 pl-4">
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>Each buyer's proposed use of your Likeness before a License Agreement is executed</li>
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>The final AI-generated content created using your Likeness before it is delivered to the buyer</li>
            </ul>
            <p className="mt-3">These approval rights are defined in the License Agreement, not in these Terms.</p>
            <h3 className="mb-2 mt-4 text-sm font-semibold text-neutral-950">6.3 Platform role</h3>
            <p>
              The Platform acts as an intermediary facilitating licensing transactions. We do not
              guarantee that buyers will request to license your Likeness, nor do we guarantee any
              minimum earnings.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-neutral-950">7. Payment and fees</h2>
            <h3 className="mb-2 mt-4 text-sm font-semibold text-neutral-950">7.1 Platform fees</h3>
            <p>
              When you successfully complete a licensing transaction, the Platform retains a service
              fee (the "Platform Fee") from the total license price paid by the buyer. The specific
              Platform Fee percentage is disclosed to you before you approve any transaction.
            </p>
            <h3 className="mb-2 mt-4 text-sm font-semibold text-neutral-950">7.2 Payouts</h3>
            <p>
              You will receive payment for completed licensing transactions according to the payment
              schedule specified in the applicable License Agreement. Payouts are processed via
              Stripe Connect or another payment processor designated by the Platform.
            </p>
            <h3 className="mb-2 mt-4 text-sm font-semibold text-neutral-950">7.3 Tax responsibility</h3>
            <p>
              You are solely responsible for any taxes owed on income you earn through the Platform.
              The Platform may report earnings to tax authorities as required by law.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-neutral-950">8. Intellectual property</h2>
            <h3 className="mb-2 mt-4 text-sm font-semibold text-neutral-950">8.1 Your content</h3>
            <p>
              You retain all ownership rights in your Likeness and Profile Content. The license you
              grant to the Platform under Section 4 is non-exclusive and does not transfer ownership.
            </p>
            <h3 className="mb-2 mt-4 text-sm font-semibold text-neutral-950">8.2 Platform content</h3>
            <p>
              The Platform, including its software, design, text, graphics, and other content
              (excluding User-submitted content), is owned by Muhr and is protected by copyright,
              trademark, and other intellectual property laws. You may not copy, modify, distribute,
              or create derivative works from Platform content without our written permission.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-neutral-950">9. Privacy and data protection</h2>
            <p>
              Your use of the Platform is subject to our{" "}
              <Link href="/privacy" className="text-neutral-950 underline underline-offset-2 hover:text-neutral-700">
                Privacy Policy
              </Link>
              , which describes how we collect, process, store, transfer, retain, and protect your personal data, and 
              your rights under applicable law.
            </p>
            <p className="mt-3">We implement industry-standard security measures to protect your data, including:</p>
            <ul className="mt-3 space-y-2 pl-4">
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>Encrypted storage of Profile Content</li>
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>Secure transmission of payment information</li>
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>Access controls limiting who can view sensitive identity verification data</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-neutral-950">10. Warranties and representations</h2>
            <p>You represent and warrant that:</p>
            <ul className="mt-3 space-y-2 pl-4">
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>You have the full legal right and authority to grant the licenses described in these Terms</li>
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>Your Profile Content does not infringe any third party's intellectual property rights, privacy rights, or publicity rights</li>
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>Your use of the Platform complies with all applicable laws and regulations</li>
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>All information you provide is accurate and truthful</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-neutral-950">11. Limitation of liability</h2>
            <h3 className="mb-2 mt-4 text-sm font-semibold text-neutral-950">11.1 Platform provided "as is"</h3>
            <p>
              The Platform is provided on an "as is" and "as available" basis without warranties of
              any kind, either express or implied, including but not limited to warranties of
              merchantability, fitness for a particular purpose, or non-infringement.
            </p>
            <h3 className="mb-2 mt-4 text-sm font-semibold text-neutral-950">11.2 No guarantee of results</h3>
            <p>We do not guarantee that:</p>
            <ul className="mt-3 space-y-2 pl-4">
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>Buyers will request to license your Likeness</li>
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>You will earn any specific amount of income</li>
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>The Platform will be uninterrupted, secure, or error-free</li>
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>Any content created using your Likeness will meet your expectations</li>
            </ul>
            <h3 className="mb-2 mt-4 text-sm font-semibold text-neutral-950">11.3 Limitation of damages</h3>
            <p>
              To the maximum extent permitted by law, Muhr shall not be liable for any indirect,
              incidental, special, consequential, or punitive damages, or any loss of profits or
              revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill,
              or other intangible losses resulting from:
            </p>
            <ul className="mt-3 space-y-2 pl-4">
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>Your use or inability to use the Platform</li>
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>Any unauthorized access to or use of your Profile Content</li>
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>Any conduct or content of any third party on the Platform</li>
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>Any dispute between you and a buyer</li>
            </ul>
            <h3 className="mb-2 mt-4 text-sm font-semibold text-neutral-950">11.4 Maximum liability</h3>
            <p>
              Our total liability to you for any claims arising from or related to these Terms or the
              Platform shall not exceed the greater of (a) the total amount you have earned through
              the Platform in the 12 months preceding the claim, or (b) $100 USD.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-neutral-950">12. Indemnification</h2>
            <p>
              You agree to indemnify, defend, and hold harmless Muhr, its affiliates, officers,
              directors, employees, and agents from and against any claims, liabilities, damages,
              losses, costs, or expenses (including reasonable attorneys' fees) arising from or
              related to:
            </p>
            <ul className="mt-3 space-y-2 pl-4">
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>Your breach of these Terms</li>
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>Your violation of any law or regulation</li>
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>Your violation of any third party's rights, including intellectual property rights or privacy rights</li>
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>Any false or misleading information you provide during identity verification or in your Profile Content</li>
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>Any dispute between you and a buyer</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-neutral-950">13. Termination</h2>
            <h3 className="mb-2 mt-4 text-sm font-semibold text-neutral-950">13.1 Termination by you</h3>
            <p>
              You may deactivate your account at any time by contacting us at{" "}
              <a href="mailto:support@muhr.app" className="text-neutral-950 underline underline-offset-2 hover:text-neutral-700">
                support@muhr.app
              </a>
              . Upon deactivation:
            </p>
            <ul className="mt-3 space-y-2 pl-4">
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>Your profile will be removed from public display within 48 hours</li>
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>You remain obligated to fulfill any active License Agreements already in progress</li>
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>We may retain certain data as required by law or for legitimate business purposes</li>
            </ul>
            <h3 className="mb-2 mt-4 text-sm font-semibold text-neutral-950">13.2 Termination by Platform</h3>
            <p>We may suspend or terminate your account immediately, without prior notice, if:</p>
            <ul className="mt-3 space-y-2 pl-4">
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>You breach these Terms</li>
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>You provide false information during identity verification</li>
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>Your conduct creates legal liability for the Platform or other users</li>
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>We are required to do so by law</li>
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>We cease operating the Platform</li>
            </ul>
            <h3 className="mb-2 mt-4 text-sm font-semibold text-neutral-950">13.3 Effect of termination</h3>
            <p>Upon termination:</p>
            <ul className="mt-3 space-y-2 pl-4">
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>Your right to use the Platform immediately ceases</li>
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>We may delete your Profile Content from our systems (subject to backup retention policies and legal requirements)</li>
              <li className="flex gap-3"><span className="shrink-0 text-neutral-900/40">—</span>Sections 8, 10, 11, 12, 14, and 15 survive termination</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-neutral-950">14. Dispute resolution</h2>
            <h3 className="mb-2 mt-4 text-sm font-semibold text-neutral-950">14.1 Governing law</h3>
            <p>
              These Terms are governed by the laws of the state of New York, USA, without regard to
              conflict of law principles.
            </p>
            <h3 className="mb-2 mt-4 text-sm font-semibold text-neutral-950">14.2 Informal resolution</h3>
            <p>
              Before filing any legal claim, you agree to contact us at{" "}
              <a href="mailto:support@muhr.app" className="text-neutral-950 underline underline-offset-2 hover:text-neutral-700">
                support@muhr.app
              </a>{" "}
              to attempt to resolve the dispute informally. We will attempt to resolve the dispute
              within 30 days.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-neutral-950">15. General provisions</h2>
            <h3 className="mb-2 mt-4 text-sm font-semibold text-neutral-950">15.1 Entire agreement</h3>
            <p>
              These Terms, together with our Privacy Policy, constitute the entire agreement between
              you and Muhr regarding the Platform and supersede all prior agreements.
            </p>
            <h3 className="mb-2 mt-4 text-sm font-semibold text-neutral-950">15.2 Modifications</h3>
            <p>
              We may modify these Terms at any time by posting the updated Terms on the Platform.
              Your continued use of the Platform after changes are posted constitutes acceptance of
              the modified Terms. We will notify you of material changes via email or Platform
              notification.
            </p>
            <h3 className="mb-2 mt-4 text-sm font-semibold text-neutral-950">15.3 Severability</h3>
            <p>
              If any provision of these Terms is found to be unenforceable, the remaining provisions
              shall remain in full force and effect.
            </p>
            <h3 className="mb-2 mt-4 text-sm font-semibold text-neutral-950">15.4 No waiver</h3>
            <p>
              Our failure to enforce any provision of these Terms does not constitute a waiver of
              that provision.
            </p>
            <h3 className="mb-2 mt-4 text-sm font-semibold text-neutral-950">15.5 Assignment</h3>
            <p>
              You may not assign these Terms without our prior written consent. We may assign these
              Terms to any affiliate or successor.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-neutral-950">16. Contact</h2>
            <p>
              Questions about these terms?{" "}
              <a href="mailto:support@muhr.app" className="text-neutral-950 underline underline-offset-2 hover:text-neutral-700">
                support@muhr.app
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
