import "server-only";

import { RateLimitError } from "@/lib/errors/apiError";
import { getClientIpFromRequest } from "@/lib/http/clientIp";

type WindowSpec = `${number}m` | `${number}s` | `${number}h`;

function windowToMs(w: WindowSpec): number {
  const m = /^(\d+)m$/.exec(w);
  if (m) return Number(m[1]) * 60_000;
  const s = /^(\d+)s$/.exec(w);
  if (s) return Number(s[1]) * 1000;
  const h = /^(\d+)h$/.exec(w);
  if (h) return Number(h[1]) * 3_600_000;
  throw new Error(`Invalid rate limit window: ${w}`);
}

/** In-memory sliding window (per server instance). Sufficient for dev; on multi-instance production use an external store (e.g. Upstash). */
const buckets = new Map<string, number[]>();

function prune(key: string, windowMs: number, now: number) {
  const arr = buckets.get(key) ?? [];
  const cutoff = now - windowMs;
  const next = arr.filter((t) => t > cutoff);
  buckets.set(key, next);
  return next;
}

/**
 * Throws {@link RateLimitError} when the limit is exceeded.
 * @param key — Logical route or operation name (e.g. `waitlist`)
 * @param identifier — Usually IP from {@link getClientIpFromRequest}
 */
export async function rateLimit(opts: {
  key: string;
  identifier: string;
  limit: number;
  window: WindowSpec;
}): Promise<void> {
  const windowMs = windowToMs(opts.window);
  const bucketKey = `${opts.key}:${opts.identifier}`;
  const now = Date.now();
  const recent = prune(bucketKey, windowMs, now);
  if (recent.length >= opts.limit) {
    throw new RateLimitError();
  }
  recent.push(now);
  buckets.set(bucketKey, recent);
}

export function getRateLimitIp(request: Request): string {
  return getClientIpFromRequest(request);
}
