"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { hasCompletedNavTour, startNavTour } from "@/lib/tour/navTour";

export function NavTourBootstrap({ userId }: { userId: string }) {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== "/dashboard") return;
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