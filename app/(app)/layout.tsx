"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { displayNameFromAuthUser } from "@/lib/auth/displayName";
import { createClient } from "@/lib/supabase/client";
import { muidFromUserId } from "@/lib/profile/muid";
import { GlobalLicenseMessagesDock } from "@/components/license/GlobalLicenseMessagesDock";
import { NavTourBootstrap } from "@/components/tour/NavTourBootstrap";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { destroyActiveNavTourWithoutCompleting } from "@/lib/tour/navTour";
import { ProfileAvatar, PROFILE_AVATAR_UPDATED_EVENT } from "@/components/profile/ProfileAvatar";
import { profileFromApiJson } from "@/lib/api/profilePayload";

interface UserProfile {
  id: string;
  shortId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: "home", tour: "dashboard" as const },
  { label: "Vault", href: "/vault", icon: "shield", tour: "vault" as const },
  { label: "Licenses", href: "/licenses", icon: "key", tour: "licenses" as const },
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
    user: (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
        />
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
        let avatarUrl: string | null = null;
        try {
          const profileRes = await fetch("/api/profile");
          const profile = profileFromApiJson(await profileRes.json().catch(() => null));
          if (profileRes.ok) avatarUrl = profile?.avatarUrl ?? null;
        } catch {
          // avatar is optional
        }
        if (!cancelled) {
          setUser({
            id: authUser.id,
            shortId: muidFromUserId(authUser.id),
            name: displayNameFromAuthUser(authUser),
            email: authUser.email ?? "",
            avatarUrl,
          });
        }
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
    function onAvatarUpdated(e: Event) {
      const url = (e as CustomEvent<{ avatarUrl: string | null }>).detail?.avatarUrl ?? null;
      setUser((u) => (u ? { ...u, avatarUrl: url } : u));
    }
    window.addEventListener(PROFILE_AVATAR_UPDATED_EVENT, onAvatarUpdated);
    return () => window.removeEventListener(PROFILE_AVATAR_UPDATED_EVENT, onAvatarUpdated);
  }, []);

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
    <div className="flex min-h-screen w-full min-w-0 bg-[#f5f5f7] text-neutral-950">
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
                <ProfileAvatar
                  name={user?.name || "User"}
                  avatarUrl={user?.avatarUrl}
                  size="sm"
                  className="shrink-0"
                />
                <div className="min-w-0 flex-1 truncate">
                  <p className="truncate text-sm font-medium text-neutral-950">{user?.name || "Loading..."}</p>
                  <p className="truncate text-[11px] font-mono font-medium text-neutral-700">{user?.shortId || "..."}</p>
                </div>
              </Link>
              <button
                type="button"
                onClick={() => {
                  destroyActiveNavTourWithoutCompleting();
                  setLogoutDialogOpen(true);
                }}
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
      <main
        className={`min-w-0 w-full flex-1 ${isOnboardingFlow ? "" : "pt-[6.75rem] lg:pl-64"} lg:pt-0`}
      >
        <div className="mx-auto w-full min-w-0 max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </div>
      </main>
      {!isOnboardingFlow && <GlobalLicenseMessagesDock />}

      <ConfirmDialog
        open={logoutDialogOpen}
        onClose={() => setLogoutDialogOpen(false)}
        title="Log out?"
        description="You will need to sign in again to access your account."
        confirmLabel="Log out"
        onConfirm={() => void confirmLogout()}
        pending={loggingOut}
      />
    </div>
  );
}
