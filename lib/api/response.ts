/**
 * Unwrap standardized API JSON bodies: `{ ok: true, data: T }` or legacy flat objects.
 */

export function dataFromApiJson<T = Record<string, unknown>>(json: unknown): T | null {
  if (!json || typeof json !== "object") return null;
  const root = json as Record<string, unknown>;
  if (root.ok === true && root.data && typeof root.data === "object") {
    return root.data as T;
  }
  if (!("ok" in root)) {
    return root as T;
  }
  return null;
}

export function apiErrorMessage(json: unknown, fallback = "Request failed"): string {
  if (!json || typeof json !== "object") return fallback;
  const root = json as Record<string, unknown>;
  const err = root.error;
  if (err && typeof err === "object" && "message" in err) {
    const msg = (err as { message?: unknown }).message;
    if (typeof msg === "string" && msg.trim()) return msg;
  }
  if (typeof root.error === "string" && root.error.trim()) return root.error;
  return fallback;
}
