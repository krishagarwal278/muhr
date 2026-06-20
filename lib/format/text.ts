export const OTHER_USAGE_NOTES_MAX_LENGTH = 2000;

export function normalizeOtherUsageNotes(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed.length) return null;
  return trimmed.slice(0, OTHER_USAGE_NOTES_MAX_LENGTH);
}
