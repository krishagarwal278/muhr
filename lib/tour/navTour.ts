import { driver } from "driver.js";
import type { Config, DriveStep, Driver } from "driver.js";

/** driver.js overlay uses inline z-index 10000; keep a handle so we can tear it down before account modals. */
let activeTourDriver: Driver | null = null;
/** When true, the next tour `onDestroyed` must not persist completion (e.g. user opened Log out mid-tour). */
let suppressTourCompletionPersist = false;

const STORAGE_PREFIX = "muhr_nav_tour_v1";

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

/**
 * Removes an in-progress nav tour so fixed overlays (logout, etc.) work and clicks don’t fall through
 * to the page behind driver.js (e.g. the shareable profile card).
 * Does not mark the tour as completed in localStorage.
 */
export function destroyActiveNavTourWithoutCompleting() {
  if (!activeTourDriver?.isActive?.()) return;
  suppressTourCompletionPersist = true;
  activeTourDriver.destroy();
}

export function startNavTour(options?: StartNavTourOptions) {
  const steps = buildSteps();

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
      if (options?.markCompleteForUserId && !suppressTourCompletionPersist) {
        markNavTourCompleted(options.markCompleteForUserId);
      }
      suppressTourCompletionPersist = false;
      activeTourDriver = null;
    },
  };

  const driverObj = driver(config);
  activeTourDriver = driverObj;
  driverObj.drive();
  return driverObj;
}
