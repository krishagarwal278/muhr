"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { hasCompletedNavTour, startNavTour } from "@/lib/tour/navTour";
import { hasCompletedWelcome } from "@/lib/tour/welcomeFlow";

export function NavTourBootstrap({ userId }: { userId: string }) {
  const pathname = usePathname();
  const router = useRouter();

  // Welcome overview takes priority: if the user has never seen it, redirect
  // to /welcome on their first dashboard visit. The nav tour fires only after
  // /welcome has been completed (or skipped), preventing two onboarding flows
  // from running on top of each other.
  useEffect(() => {
    if (pathname !== "/dashboard") return;
    if (hasCompletedWelcome(userId)) return;

    const redirectLock = `muhr_welcome_redirect_${userId}`;
    if (sessionStorage.getItem(redirectLock) === "1") return;
    sessionStorage.setItem(redirectLock, "1");
    router.replace("/welcome");
  }, [pathname, userId, router]);

  useEffect(() => {
    if (pathname !== "/dashboard") return;
    if (!hasCompletedWelcome(userId)) return;
    if (hasCompletedNavTour(userId)) return;

    const timer = window.setTimeout(() => {
      const lockKey = `muhr_autotour_started_${userId}`;
      if (sessionStorage.getItem(lockKey) === "1") return;
      sessionStorage.setItem(lockKey, "1");
      startNavTour({ markCompleteForUserId: userId });
    }, 900);

    return () => window.clearTimeout(timer);
  }, [pathname, userId]);

  return null;
}