const HANDLE_RE = /^[a-z0-9_]{3,30}$/;

export function normalizeHandle(raw: string): string {
  return raw.trim().toLowerCase();
}

export function validateHandle(handle: string): string | null {
  const h = normalizeHandle(handle);
  if (h.length < 3 || h.length > 30) return "Handle must be 3–30 characters.";
  if (!HANDLE_RE.test(h)) return "Use lowercase letters, numbers, and underscores only.";
  return null;
}
