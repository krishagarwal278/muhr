/**
 * Per-user "first-time welcome overview" state. Persists completion to
 * localStorage so we only auto-redirect a user to /welcome once; after that
 * they can re-open it from the dashboard whenever they want.
 *
 * Kept deliberately separate from `navTour` (the in-product driver.js tour),
 * which fires on the dashboard. The welcome flow explains *what Muhr is*; the
 * nav tour explains *where to click*. Different concerns, different storage.
 */

const STORAGE_PREFIX = "muhr_welcome_v1";

export function welcomeStorageKey(userId: string): string {
  return `${STORAGE_PREFIX}_${userId}`;
}

export function hasCompletedWelcome(userId: string): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(welcomeStorageKey(userId)) === "1";
}

export function markWelcomeCompleted(userId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(welcomeStorageKey(userId), "1");
  } catch {
    // Ignore quota / privacy-mode failures.
  }
}

export function resetWelcomeCompletion(userId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(welcomeStorageKey(userId));
  } catch {
    // Ignore.
  }
}
