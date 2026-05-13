import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookie Policy — Muhr",
};

export default function CookiePolicy() {
  return (
    <div className="min-h-screen bg-[#f5f5f7] text-neutral-950">
      <header className="mx-auto flex max-w-4xl items-center justify-between px-6 py-6 lg:px-10">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/logo.png" alt="Muhr" width={32} height={32} className="rounded-xl" />
          <span className="text-sm font-semibold tracking-tight">Muhr</span>
        </Link>
        <span className="text-xs uppercase tracking-widest text-neutral-900/50">Cookie Policy</span>
      </header>

      <main className="mx-auto max-w-4xl px-6 pb-24 pt-8 lg:px-10">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Cookie Policy</h1>
        <p className="mt-3 text-sm text-neutral-900/50">Last updated: April 16, 2026</p>

        <div className="mt-10 space-y-10 text-sm leading-7 text-neutral-900/70">
          <section>
            <h2 className="mb-3 text-base font-semibold text-neutral-950">What are cookies?</h2>
            <p>
              Cookies are small text files stored on your device when you visit a website. They
              allow the site to remember information about your visit—such as your preferences and
              session state—making future visits more efficient and personalised.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-neutral-950">How we use cookies</h2>
            <p>
              Muhr uses a minimal set of cookies to operate the service and understand how it is
              used. We do not use advertising or tracking cookies.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-neutral-950">Types of cookies we use</h2>
            <div className="mt-4 overflow-hidden rounded-2xl border border-black/10 bg-white">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-black/10 bg-neutral-50">
                  <tr>
                    <th className="px-5 py-3 font-medium text-neutral-950">Name</th>
                    <th className="px-5 py-3 font-medium text-neutral-950">Type</th>
                    <th className="px-5 py-3 font-medium text-neutral-950">Purpose</th>
                    <th className="px-5 py-3 font-medium text-neutral-950">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/10">
                  <tr>
                    <td className="px-5 py-4 font-mono text-xs text-neutral-900/65">vault_cookie_consent</td>
                    <td className="px-5 py-4">Essential</td>
                    <td className="px-5 py-4">Stores your cookie consent preference so the banner does not reappear</td>
                    <td className="px-5 py-4">1 year</td>
                  </tr>
                  <tr>
                    <td className="px-5 py-4 font-mono text-xs text-neutral-900/65">sb-* (Supabase)</td>
                    <td className="px-5 py-4">Essential</td>
                    <td className="px-5 py-4">Maintains your authenticated session when you are signed in</td>
                    <td className="px-5 py-4">Session</td>
                  </tr>
                  <tr>
                    <td className="px-5 py-4 font-mono text-xs text-neutral-900/65">__vercel_*</td>
                    <td className="px-5 py-4">Essential</td>
                    <td className="px-5 py-4">Set by Vercel to route requests correctly across their infrastructure</td>
                    <td className="px-5 py-4">Session</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-neutral-950">Your choices</h2>
            <p>
              When you first visit Muhr, you will see a cookie banner with the option to accept
              all cookies or reject non-essential cookies. Your preference is stored in your
              browser's local storage and respected on all subsequent visits.
            </p>
            <p className="mt-3">
              You can also control cookies directly through your browser settings. Most browsers
              allow you to view, delete, and block cookies. Note that blocking essential cookies may
              prevent parts of the Service from functioning correctly.
            </p>
            <p className="mt-3">
              To reset your cookie preference and see the banner again, clear your browser's local
              storage for this site or use your browser's "Clear site data" option.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-neutral-950">Third-party services</h2>
            <p>
              We use Supabase as our database provider and Vercel as our hosting provider. Both may
              set technical cookies as part of delivering the Service. We do not use Google
              Analytics, Facebook Pixel, or any advertising networks.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-neutral-950">Changes to this policy</h2>
            <p>
              We may update this Cookie Policy as we add new features or change our service
              providers. Any significant changes will be communicated via our waitlist email.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-neutral-950">Contact</h2>
            <p>
              Cookie-related questions:{" "}
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
          <Link href="/terms" className="transition hover:text-neutral-950">Terms</Link>
        </div>
      </footer>
    </div>
  );
}
