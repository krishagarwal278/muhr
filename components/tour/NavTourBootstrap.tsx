"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { hasCompletedNavTour, startNavTour } from "@/lib/tour/navTour";
import { hasCompletedWelcome } from "@/lib/tour/welcomeFlow";

const ONBOARDING_PATH = "/onboarding";

export function NavTourBootstrap({ userId }: { userId: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [basicsComplete, setBasicsComplete] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/profile");
        const data = (await res.json().catch(() => ({}))) as {
          profileBasicsComplete?: boolean;
        };
        if (!cancelled) {
          setBasicsComplete(res.ok ? data.profileBasicsComplete === true : false);
        }
      } catch {
        if (!cancelled) setBasicsComplete(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, pathname]);

  useEffect(() => {
    if (basicsComplete !== false) return;
    if (pathname === ONBOARDING_PATH) return;

    const lockKey = `muhr_onboarding_redirect_${userId}`;
    if (sessionStorage.getItem(lockKey) === "1") return;
    sessionStorage.setItem(lockKey, "1");
    router.replace(ONBOARDING_PATH);
  }, [basicsComplete, pathname, router, userId]);

  useEffect(() => {
    if (pathname !== "/dashboard") return;
    if (basicsComplete !== true) return;
    if (hasCompletedWelcome(userId)) return;

    const redirectLock = `muhr_welcome_redirect_${userId}`;
    if (sessionStorage.getItem(redirectLock) === "1") return;
    sessionStorage.setItem(redirectLock, "1");
    router.replace("/welcome");
  }, [pathname, userId, router, basicsComplete]);

  useEffect(() => {
    if (pathname !== "/dashboard") return;
    if (basicsComplete !== true) return;
    if (!hasCompletedWelcome(userId)) return;
    if (hasCompletedNavTour(userId)) return;

    const timer = window.setTimeout(() => {
      const lockKey = `muhr_autotour_started_${userId}`;
      if (sessionStorage.getItem(lockKey) === "1") return;
      sessionStorage.setItem(lockKey, "1");
      startNavTour({ markCompleteForUserId: userId });
    }, 900);

    return () => window.clearTimeout(timer);
  }, [pathname, userId, basicsComplete]);

  return null;
}
