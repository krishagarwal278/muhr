/** Strip everything except ASCII digits (for INR / integer inputs). */
export function digitsOnly(raw: string): string {
  return raw.replace(/\D/g, "");
}

/** Parse a display string with optional grouping commas into an integer. */
export function parseFormattedInteger(raw: string): number | null {
  const digits = digitsOnly(raw);
  if (!digits) return null;
  const value = Number.parseInt(digits, 10);
  return Number.isFinite(value) ? value : null;
}

/** Format an integer with locale grouping (e.g. 1000 → 1,000). */
export function formatIntegerWithCommas(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "";
  return value.toLocaleString("en-IN");
}

/** Normalize free-typed numeric input to a comma-grouped display string. */
export function formatIntegerInputText(raw: string): string {
  if (!raw.trim()) return "";
  const parsed = parseFormattedInteger(raw);
  return parsed == null ? "" : formatIntegerWithCommas(parsed);
}
