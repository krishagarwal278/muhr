import { driver } from "driver.js";
import type { Config, DriveStep, Driver } from "driver.js";

const STORAGE_PREFIX = "muhr_nav_tour_v1";

/** Active Driver.js instance for the creator nav tour (brand shell may dismiss without persisting completion). */
let activeNavTourDriver: Driver | null = null;
/** When true, `onDestroyed` will not write “tour completed” to localStorage. */
let suppressNavTourCompletion = false;

/** Close an in-progress nav tour without marking it completed (e.g. before logout modal). */
export function destroyActiveNavTourWithoutCompleting() {
  const d = activeNavTourDriver;
  if (!d?.isActive()) {
    activeNavTourDriver = null;
    return;
  }
  suppressNavTourCompletion = true;
  try {
    d.destroy();
  } finally {
    suppressNavTourCompletion = false;
    activeNavTourDriver = null;
  }
}

export function navTourStorageKey(userId: string) {
  return `${STORAGE_PREFIX}_${userId}`;
}

export function hasCompletedNavTour(userId: string): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(navTourStorageKey(userId)) === "1";
}

export function markNavTourCompleted(userId: string) {
  window.localStorage.setItem(navTourStorageKey(userId), "1");
}

function isLg(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches;
}

function pickNavEl(desktopSel: string, mobileSel: string): Element {
  const sel = isLg() ? desktopSel : mobileSel;
  return document.querySelector(sel) ?? document.body;
}

const NAV_META: { key: string; title: string; description: string }[] = [
  {
    key: "dashboard",
    title: "Dashboard",
    description:
      "Your home base: profile sharing, stats, and quick links to the rest of Muhr.",
  },
  {
    key: "vault",
    title: "Vault",
    description:
      "Store face photos and other identity assets securely. Used for licensing and enforcement.",
  },
  {
    key: "consent",
    title: "Consent",
    description:
      "Define how your likeness may be used (channels, territories, duration) so requests stay on-policy.",
  },
  {
    key: "licenses",
    title: "Licenses",
    description:
      "Review incoming brand requests, accept or decline, and follow up by email when you’re ready.",
  },
  {
    key: "enforcement",
    title: "Enforcement",
    description:
      "Open and track cases when you need to report misuse or protect your identity.",
  },
  {
    key: "settings",
    title: "Settings",
    description:
      "Verify your identity (Persona), set your public instagram handle, and tune account preferences.",
  },
];

function buildSteps(): DriveStep[] {
  const intro: DriveStep = {
    element: () => pickNavEl('[data-tour-desktop="sidebar-shell"]', '[data-tour-mobile="nav-strip"]'),
    popover: {
      title: "Welcome to Muhr",
      description:
        "Use this sidebar (desktop) or the strip below the header (mobile) to move around. Here’s what each section does.",
      side: "over",
      align: "center",
    },
  };

  const navSteps: DriveStep[] = NAV_META.map(({ key, title, description }) => ({
    element: () =>
      pickNavEl(`[data-tour-desktop="nav-${key}"]`, `[data-tour-mobile="nav-${key}"]`),
    popover: {
      title,
      description,
      side: isLg() ? "right" : "bottom",
      align: "start",
    },
  }));

  return [intro, ...navSteps];
}

export type StartNavTourOptions = {
  /** When set, tour completion is persisted so auto-tour won’t run again for this user. */
  markCompleteForUserId?: string | null;
};

export function startNavTour(options?: StartNavTourOptions) {
  if (activeNavTourDriver?.isActive()) {
    suppressNavTourCompletion = true;
    try {
      activeNavTourDriver.destroy();
    } finally {
      suppressNavTourCompletion = false;
      activeNavTourDriver = null;
    }
  }

  const steps = buildSteps();
  const markUserId = options?.markCompleteForUserId ?? null;

  const config: Config = {
    showProgress: true,
    progressText: "{{current}} of {{total}}",
    nextBtnText: "Next",
    prevBtnText: "Back",
    doneBtnText: "Done",
    overlayOpacity: 0.85,
    overlayColor: "#0a0a0a",
    smoothScroll: true,
    allowClose: true,
    popoverClass: "muhr-driver-popover",
    stageRadius: 8,
    steps,
    onDestroyed: () => {
      activeNavTourDriver = null;
      if (!suppressNavTourCompletion && markUserId) {
        markNavTourCompleted(markUserId);
      }
    },
  };

  const driverObj = driver(config);
  activeNavTourDriver = driverObj;
  driverObj.drive();
  return driverObj;
}
