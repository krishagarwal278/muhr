"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { displayNameFromAuthUser } from "@/lib/auth/displayName";
import { createClient } from "@/lib/supabase/client";
import { muidFromUserId } from "@/lib/profile/muid";
import { GlobalLicenseMessagesDock } from "@/components/license/GlobalLicenseMessagesDock";
import { NavTourBootstrap } from "@/components/tour/NavTourBootstrap";

interface UserProfile {
  id: string;
  shortId: string;
  name: string;
  email: string;
}

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: "home", tour: "dashboard" as const },
  { label: "Vault", href: "/vault", icon: "shield", tour: "vault" as const },
  { label: "Consent", href: "/consent", icon: "file-text", tour: "consent" as const },
  { label: "Licenses", href: "/licenses", icon: "key", tour: "licenses" as const },
  { label: "Enforcement", href: "/enforcement", icon: "alert-circle", tour: "enforcement" as const },
  { label: "Profile", href: "/profile", icon: "user", tour: "profile" as const },
];

function NavIcon({ name, className }: { name: string; className?: string }) {
  const icons: Record<string, React.ReactNode> = {
    home: (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
    shield: (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
      </svg>
    ),
    "file-text": (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
      </svg>
    ),
    key: (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" />
      </svg>
    ),
    "alert-circle": (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
      </svg>
    ),
    user: (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      </svg>
    ),
  };
  return <>{icons[name]}</>;
}

function LogoutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75"
      />
    </svg>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const logoutCancelRef = useRef<HTMLButtonElement>(null);

  const isOnboardingFlow = pathname === "/welcome" || pathname === "/onboarding";

  useEffect(() => {
    let cancelled = false;

    async function fetchUser() {
      let supabase: ReturnType<typeof createClient>;
      try {
        supabase = createClient();
      } catch {
        if (!cancelled) setUser(null);
        return;
      }

      const {
        data: { user: authUser },
        error,
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (authUser) {
        setUser({
          id: authUser.id,
          shortId: muidFromUserId(authUser.id),
          name: displayNameFromAuthUser(authUser),
          email: authUser.email ?? "",
        });
        return;
      }

      if (error) {
        if (error.code === "refresh_token_not_found") {
          await supabase.auth.signOut({ scope: "local" });
        }
        setUser(null);
        return;
      }

      setUser(null);
    }

    void fetchUser();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!logoutDialogOpen) return;
    logoutCancelRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLogoutDialogOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [logoutDialogOpen]);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // e.g. missing env or dev-only client
    }
    router.push("/login");
    router.refresh();
  }

  async function confirmLogout() {
    setLogoutDialogOpen(false);
    await handleLogout();
  }

  return (
    <div className="flex min-h-screen bg-[#f5f5f7] text-neutral-950">
      {user && !isOnboardingFlow ? <NavTourBootstrap userId={user.id} /> : null}

      {/* Mobile section strip (guided tour + quick nav) - hidden during onboarding */}
      {!isOnboardingFlow && (
        <nav
          data-tour-mobile="nav-strip"
          aria-label="Main sections"
          className="fixed left-0 right-0 top-14 z-nav-strip flex gap-1 overflow-x-auto border-b border-black/10 bg-[#f5f5f7]/95 px-2 py-2 backdrop-blur-sm lg:hidden"
        >
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={`m-${item.href}`}
                href={item.href}
                data-tour-mobile={`nav-${item.tour}`}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  isActive
                    ? "bg-black/5 text-neutral-950"
                    : "text-neutral-800 hover:bg-black/5 hover:text-neutral-950"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      )}

      {/* Sidebar - hidden during onboarding */}
      {!isOnboardingFlow && (
        <aside
          data-tour-desktop="sidebar-shell"
          className="fixed inset-y-0 left-0 z-sidebar hidden w-64 flex-col border-r border-neutral-200/90 bg-white/95 shadow-[4px_0_32px_-12px_rgba(15,23,42,0.08)] backdrop-blur-md lg:flex"
        >
          <div className="flex h-16 items-center gap-2.5 border-b border-neutral-200/80 px-6">
            <Image src="/logo.png" alt="Muhr" width={28} height={28} className="h-auto w-auto rounded-xl" />
            <span className="text-sm font-semibold tracking-tight text-neutral-950">Muhr</span>
          </div>
          <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Main navigation">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  data-tour-desktop={`nav-${item.tour}`}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? "bg-black/5 text-neutral-950"
                      : "text-neutral-800 hover:bg-black/5 hover:text-neutral-950"
                  }`}
                >
                  <NavIcon name={item.icon} className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-neutral-200/80 bg-neutral-50/50 p-4">
            <div className="flex items-center gap-1">
              <Link
                href="/profile"
                className="flex min-w-0 flex-1 items-center gap-3 rounded-lg p-2 -m-2 transition hover:bg-black/5"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-semibold text-white">
                  {user?.name?.charAt(0).toUpperCase() || "U"}
                </div>
                <div className="min-w-0 flex-1 truncate">
                  <p className="truncate text-sm font-medium text-neutral-950">{user?.name || "Loading..."}</p>
                  <p className="truncate text-[11px] font-mono font-medium text-neutral-700">{user?.shortId || "..."}</p>
                </div>
              </Link>
              <button
                type="button"
                onClick={() => setLogoutDialogOpen(true)}
                disabled={loggingOut}
                aria-label="Log out"
                title="Log out"
                className="shrink-0 rounded-lg p-2 text-neutral-600 transition hover:bg-black/5 hover:text-neutral-950 disabled:opacity-50"
              >
                <LogoutIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </aside>
      )}

      {logoutDialogOpen ? (
        <div className="fixed inset-0 z-overlay flex items-center justify-center p-4" role="presentation">
          <button
            type="button"
            aria-label="Dismiss"
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            onClick={() => setLogoutDialogOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-dialog-title"
            className="relative w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-5 shadow-lg"
          >
            <h2 id="logout-dialog-title" className="text-base font-semibold text-neutral-950">
              Log out?
            </h2>
            <p className="mt-2 text-sm text-neutral-600">
              You will need to sign in again to access your account.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                ref={logoutCancelRef}
                type="button"
                onClick={() => setLogoutDialogOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-neutral-700 transition hover:bg-black/5"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loggingOut}
                onClick={() => void confirmLogout()}
                className="rounded-lg bg-neutral-950 px-3 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
              >
                {loggingOut ? "Signing out…" : "Log out"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Mobile header - hidden during onboarding */}
      {!isOnboardingFlow && (
        <header className="fixed inset-x-0 top-0 z-header flex h-14 items-center justify-between border-b border-black/10 bg-[#f5f5f7]/95 px-4 backdrop-blur-sm lg:hidden">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Image src="/logo.png" alt="Muhr" width={24} height={24} className="h-auto w-auto rounded-lg" />
            <span className="text-sm font-semibold">Muhr</span>
          </Link>
          <button className="rounded-lg p-2 text-neutral-900/70 hover:bg-black/5">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
        </header>
      )}

      {/* Main content — extra top padding on small screens for mobile nav strip (not during onboarding) */}
      <main className={`flex-1 ${isOnboardingFlow ? "" : "pt-[6.75rem] lg:pl-64"} lg:pt-0`}>
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </div>
      </main>
      {!isOnboardingFlow && <GlobalLicenseMessagesDock />}
    </div>
  );
}
