"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { KycStatusBadge } from "@/components/KycStatusBadge";
import { ghostButtonVariants } from "@/components/ui/button-recipes";
import { appPageHeaderVariants, appPageTitleVariants } from "@/components/ui/page-header";
import { surfaceCardVariants } from "@/components/ui/surface-card";
import { PublicProfileShare } from "./_components/PublicProfileShare";
import { startNavTour } from "@/lib/tour/navTour";
import type { KycStatus } from "@/types";

interface DashboardStats {
  vaultAssets: number;
  activeLicenses: number;
  openCases: number;
  hasAssets: boolean;
  pendingLicenseRequests: number;
}

const quickActions = [
  {
    title: "Upload identity assets",
    description: "Add photos and voice samples to your vault",
    href: "/vault/upload",
    icon: "upload",
  },
  {
    title: "Set consent rules",
    description: "Define how your likeness can be used",
    href: "/consent",
    icon: "shield",
  },
  {
    title: "Report misuse",
    description: "Start an enforcement case",
    href: "/enforcement",
    icon: "alert",
  },
];

function ActionIcon({ name, className }: { name: string; className?: string }) {
  const icons: Record<string, React.ReactNode> = {
    upload: (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
      </svg>
    ),
    shield: (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
      </svg>
    ),
    alert: (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
      </svg>
    ),
  };
  return <>{icons[name]}</>;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    vaultAssets: 0,
    activeLicenses: 0,
    openCases: 0,
    hasAssets: false,
    pendingLicenseRequests: 0,
  });
  const [kycStatus, setKycStatus] = useState<KycStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [vaultRes, licensesRes, enforcementRes, identityRes] = await Promise.all([
          fetch("/api/vault"),
          fetch("/api/licenses"),
          fetch("/api/enforcement"),
          fetch("/api/identity"),
        ]);

        const vaultData = await vaultRes.json();
        const licensesData = await licensesRes.json();
        const enforcementData = await enforcementRes.json();
        const identityData = identityRes.ok ? await identityRes.json() : {};

        const counts = licensesData.counts as { pending?: number; accepted?: number } | undefined;
        const pendingFromCounts = typeof counts?.pending === "number" ? counts.pending : undefined;
        const pendingLen = Array.isArray(licensesData.incomingRequests)
          ? licensesData.incomingRequests.length
          : 0;

        setStats({
          vaultAssets: vaultData.assets?.length || 0,
          activeLicenses:
            typeof counts?.accepted === "number"
              ? counts.accepted
              : licensesData.active?.length || 0,
          openCases: enforcementData.open?.length || 0,
          hasAssets: (vaultData.assets?.length || 0) > 0,
          pendingLicenseRequests: pendingFromCounts ?? pendingLen,
        });
        setKycStatus((identityData.kycStatus as KycStatus) ?? "unverified");
      } catch (error) {
        console.error("Failed to fetch dashboard stats:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  const statCards = [
    { label: "Vault assets", value: stats.vaultAssets, href: "/vault" },
    { label: "Accepted requests", value: stats.activeLicenses, href: "/licenses" },
    { label: "Pending license requests", value: stats.pendingLicenseRequests, href: "/licenses" },
    { label: "Open cases", value: stats.openCases, href: "/enforcement" },
  ];

  return (
    <div className="space-y-8">
      <header className={appPageHeaderVariants()}>
        <div className="min-w-0 flex-1 space-y-3">
          <h1 className={appPageTitleVariants()}>Dashboard</h1>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-2">
            <p className="text-sm font-medium text-neutral-700 sm:max-w-md">
              Overview of your identity protection status
            </p>
            {!loading && kycStatus !== null && (
              <KycStatusBadge status={kycStatus} className="w-fit shrink-0" />
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center lg:pt-1">
          <button
            type="button"
            onClick={() => startNavTour()}
            className={ghostButtonVariants()}
          >
            <svg
              className="h-4 w-4 text-neutral-600 transition group-hover:text-neutral-900"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.847a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.847.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z"
              />
            </svg>
            Take a tour
          </button>
        </div>
      </header>

      {!loading && <PublicProfileShare />}

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className={surfaceCardVariants({ interactive: "subtle" })}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-600">{stat.label}</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-neutral-950">
              {loading ? (
                <span className="inline-block h-9 w-12 animate-pulse rounded bg-black/10" />
              ) : (
                stat.value
              )}
            </p>
          </Link>
        ))}
      </div>

      {/* KYC + vault status */}
      {!loading && kycStatus !== null && kycStatus !== "verified" && (
        <div className="rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50 to-orange-50/50 p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-amber-200/60 bg-white/80 shadow-sm">
              <svg
                className="h-5 w-5 text-amber-700"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-amber-950">Complete identity verification</h3>
              <p className="mt-1 text-sm text-amber-900/80">
                Finish liveness and identity checks before uploading vault assets or using licensing workflows.
              </p>
              <Link
                href="/settings#identity-verification"
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-amber-900 underline-offset-2 hover:text-amber-800"
              >
                Verification details
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      )}

      {!loading && kycStatus === "verified" && !stats.hasAssets && (
        <div className={surfaceCardVariants()}>
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/5">
              <svg className="h-5 w-5 text-neutral-900/70" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-neutral-950">Vault is empty</h3>
              <p className="mt-1 text-sm text-neutral-700">
                Upload photos and other assets so licensing and enforcement have materials to reference.
              </p>
              <Link
                href="/vault/upload"
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-neutral-950 hover:text-neutral-900/80"
              >
                Upload assets
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      )}

      {!loading && kycStatus === "verified" && stats.hasAssets && (
        <div className="rounded-xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-teal-50/40 p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-emerald-200/60 bg-white/80 shadow-sm">
              <svg
                className="h-5 w-5 text-emerald-700"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-emerald-950">Vault ready</h3>
              <p className="mt-1 text-sm text-emerald-900/80">
                Identity is verified and you have {stats.vaultAssets} asset{stats.vaultAssets !== 1 ? "s" : ""} in your vault. You can set consent rules and report misuse.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div>
        <h2 className="mb-4 text-lg font-semibold tracking-tight text-neutral-950">Quick actions</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {quickActions.map((action) => (
            <Link
              key={action.title}
              href={action.href}
              className={surfaceCardVariants({ interactive: "emphasized" })}
            >
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-neutral-200/80 bg-neutral-100 text-neutral-700 transition group-hover:border-neutral-300 group-hover:bg-neutral-200/80 group-hover:text-neutral-950">
                <ActionIcon name={action.icon} className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-neutral-950">{action.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-neutral-700">{action.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
