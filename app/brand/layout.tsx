"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { displayNameFromAuthUser } from "@/lib/auth/displayName";
import { brandShortIdFromUserId } from "@/lib/brand/brandShortId";
import { isBrandWorkspaceUser } from "@/lib/brand/brandPreviewSignIn";
import { BRAND_ROSTER_AVAILABLE } from "@/lib/brand/rosterAvailability";
import { createClient } from "@/lib/supabase/client";
import { GlobalLicenseMessagesDock } from "@/components/license/GlobalLicenseMessagesDock";
import { destroyActiveNavTourWithoutCompleting } from "@/lib/tour/navTour";

interface UserProfile {
  id: string;
  brandShortId: string;
  name: string;
  email: string;
}

type NavIconName = "home" | "users" | "key" | "photo" | "card" | "user";

function NavIcon({ name, className }: { name: NavIconName; className?: string }) {
  const icons: Record<NavIconName, React.ReactNode> = {
    home: (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
        />
      </svg>
    ),
    users: (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
        />
      </svg>
    ),
    key: (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z"
        />
      </svg>
    ),
    photo: (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3A1.5 1.5 0 0 0 1.5 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008H12V8.25Z"
        />
      </svg>
    ),
    card: (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3H21a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 21 4.5H3a2.25 2.25 0 0 0-2.25 2.25v12A2.25 2.25 0 0 0 3 19.5Z"
        />
      </svg>
    ),
    user: (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
        />
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

const rosterSoonBadge = (
  <span className="ml-auto max-w-[7.5rem] shrink-0 rounded-full border border-amber-200/80 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold leading-tight text-amber-950">
    Coming soon
  </span>
);

export default function BrandLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const logoutCancelRef = useRef<HTMLButtonElement>(null);

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
        if (!isBrandWorkspaceUser(authUser.email)) {
          router.replace("/dashboard?brand_access=denied");
          return;
        }
        setUser({
          id: authUser.id,
          brandShortId: brandShortIdFromUserId(authUser.id),
          name: displayNameFromAuthUser(authUser),
          email: authUser.email ?? "",
        });
        return;
      }

      if (error?.code === "refresh_token_not_found") {
        await supabase.auth.signOut({ scope: "local" });
        router.replace("/login?intent=brand&next=/brand/dashboard");
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/login?intent=brand&next=/brand/dashboard");
        return;
      }

      setUser(null);
    }

    void fetchUser();
    return () => {
      cancelled = true;
    };
  }, [router]);

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

  const navLinkClass = (active: boolean) =>
    `flex min-w-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
      active ? "bg-black/5 text-neutral-950" : "text-neutral-800 hover:bg-black/5 hover:text-neutral-950"
    }`;

  const rosterDisabledClass =
    "flex min-w-0 cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-400";

  return (
    <div className="flex min-h-screen bg-[#f5f5f7] text-neutral-950">
      <nav
        aria-label="Brand workspace sections"
        className="fixed left-0 right-0 top-14 z-nav-strip flex gap-1 overflow-x-auto border-b border-black/10 bg-[#f5f5f7]/95 px-2 py-2 backdrop-blur-sm lg:hidden"
      >
        <Link
          href="/brand/dashboard"
          className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
            pathname.startsWith("/brand/dashboard")
              ? "bg-black/5 text-neutral-950"
              : "text-neutral-800 hover:bg-black/5 hover:text-neutral-950"
          }`}
        >
          Dashboard
        </Link>
        {BRAND_ROSTER_AVAILABLE ? (
          <Link
            href="/brand/roster"
            className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              pathname.startsWith("/brand/roster")
                ? "bg-black/5 text-neutral-950"
                : "text-neutral-800 hover:bg-black/5 hover:text-neutral-950"
            }`}
          >
            Roster
          </Link>
        ) : (
          <span className="shrink-0 cursor-not-allowed rounded-lg px-3 py-1.5 text-xs font-medium text-neutral-400">
            Roster · coming soon
          </span>
        )}
        <Link
          href="/brand/licenses"
          className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
            pathname.startsWith("/brand/licenses")
              ? "bg-black/5 text-neutral-950"
              : "text-neutral-800 hover:bg-black/5 hover:text-neutral-950"
          }`}
        >
          Licenses
        </Link>
        <Link
          href="/brand/assets"
          className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
            pathname.startsWith("/brand/assets")
              ? "bg-black/5 text-neutral-950"
              : "text-neutral-800 hover:bg-black/5 hover:text-neutral-950"
          }`}
        >
          Assets
        </Link>
        <Link
          href="/brand/billing"
          className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
            pathname.startsWith("/brand/billing")
              ? "bg-black/5 text-neutral-950"
              : "text-neutral-800 hover:bg-black/5 hover:text-neutral-950"
          }`}
        >
          Billing
        </Link>
        <Link
          href="/brand/profile"
          className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
            pathname.startsWith("/brand/profile")
              ? "bg-black/5 text-neutral-950"
              : "text-neutral-800 hover:bg-black/5 hover:text-neutral-950"
          }`}
        >
          Profile
        </Link>
      </nav>

      <aside className="fixed inset-y-0 left-0 z-sidebar hidden w-64 flex-col border-r border-neutral-200/90 bg-white/95 shadow-[4px_0_32px_-12px_rgba(15,23,42,0.08)] backdrop-blur-md lg:flex">
        <div className="flex h-16 items-center gap-2.5 border-b border-neutral-200/80 px-6">
          <Image src="/logo.png" alt="Muhr" width={28} height={28} className="h-auto w-auto rounded-xl" />
          <span className="text-sm font-semibold tracking-tight text-neutral-950">Muhr</span>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Brand navigation">
          <Link
            href="/brand/dashboard"
            className={navLinkClass(pathname.startsWith("/brand/dashboard"))}
          >
            <NavIcon name="home" className="h-5 w-5 shrink-0" />
            Dashboard
          </Link>
          {BRAND_ROSTER_AVAILABLE ? (
            <Link href="/brand/roster" className={navLinkClass(pathname.startsWith("/brand/roster"))}>
              <NavIcon name="users" className="h-5 w-5 shrink-0" />
              Roster
            </Link>
          ) : (
            <span className={rosterDisabledClass} title="Roster opens once multi-org workspaces ship.">
              <NavIcon name="users" className="h-5 w-5 shrink-0 opacity-50" />
              <span className="min-w-0 truncate">Roster</span>
              {rosterSoonBadge}
            </span>
          )}
          <Link href="/brand/licenses" className={navLinkClass(pathname.startsWith("/brand/licenses"))}>
            <NavIcon name="key" className="h-5 w-5 shrink-0" />
            Licenses
          </Link>
          <Link href="/brand/assets" className={navLinkClass(pathname.startsWith("/brand/assets"))}>
            <NavIcon name="photo" className="h-5 w-5 shrink-0" />
            Assets
          </Link>
          <Link href="/brand/billing" className={navLinkClass(pathname.startsWith("/brand/billing"))}>
            <NavIcon name="card" className="h-5 w-5 shrink-0" />
            Billing
          </Link>
          <Link href="/brand/profile" className={navLinkClass(pathname.startsWith("/brand/profile"))}>
            <NavIcon name="user" className="h-5 w-5 shrink-0" />
            Profile
          </Link>
        </nav>
        <div className="border-t border-neutral-200/80 bg-neutral-50/50 p-4">
          <div className="flex items-center gap-1">
            <Link
              href="/brand/profile"
              className="flex min-w-0 flex-1 items-center gap-3 rounded-lg p-2 -m-2 transition hover:bg-black/5"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-sm font-semibold text-white">
                {user?.name?.charAt(0).toUpperCase() || "B"}
              </div>
              <div className="min-w-0 flex-1 truncate">
                <p className="truncate text-sm font-medium text-neutral-950">{user?.name || "Loading…"}</p>
                <p className="truncate text-[11px] font-mono font-medium text-neutral-700">
                  {user?.brandShortId || "…"}
                </p>
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

      {logoutDialogOpen ? (
        <div
          className="fixed inset-0 z-[10050] flex items-center justify-center p-4"
          role="presentation"
        >
          <button
            type="button"
            aria-label="Dismiss"
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            onClick={() => setLogoutDialogOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="brand-logout-title"
            className="relative w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-5 shadow-lg"
          >
            <h2 id="brand-logout-title" className="text-base font-semibold text-neutral-950">
              Log out?
            </h2>
            <p className="mt-2 text-sm text-neutral-600">You will need to sign in again to access your account.</p>
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

      <header className="fixed inset-x-0 top-0 z-header flex h-14 items-center justify-between border-b border-black/10 bg-[#f5f5f7]/95 px-4 backdrop-blur-sm lg:hidden">
        <Link href="/brand/dashboard" className="flex items-center gap-2">
          <Image src="/logo.png" alt="Muhr" width={24} height={24} className="h-auto w-auto rounded-lg" />
          <span className="text-sm font-semibold">Muhr</span>
        </Link>
        <span className="text-xs font-medium text-neutral-500">Brand</span>
      </header>

      <main className="flex-1 pt-[6.75rem] lg:pl-64 lg:pt-0">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
      </main>
      <GlobalLicenseMessagesDock />
    </div>
  );
}
