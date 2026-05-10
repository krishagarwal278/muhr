import "server-only";

const SENSITIVE_KEYS = new Set([
  "authorization",
  "cookie",
  "set-cookie",
  "password",
  "token",
  "access_token",
  "refresh_token",
  "id_token",
  "client_secret",
  "api_key",
  "secret",
  "private_key",
  "otp",
  "code",
]);

function redactRecord(input: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (SENSITIVE_KEYS.has(k.toLowerCase())) {
      out[k] = "[redacted]";
    } else if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      out[k] = redactRecord(v as Record<string, unknown>);
    } else {
      out[k] = v;
    }
  }
  return out;
}

function safePayload(payload: unknown): unknown {
  if (payload === null || typeof payload !== "object") {
    return payload;
  }
  if (Array.isArray(payload)) {
    return payload.map(safePayload);
  }
  return redactRecord(payload as Record<string, unknown>);
}

/** Structured server logs with shallow redaction of known-sensitive keys. */
export const logger = {
  warn(msg: string, meta?: Record<string, unknown>) {
    if (meta) console.warn(msg, safePayload(meta));
    else console.warn(msg);
  },

  error(msg: string, meta?: Record<string, unknown>) {
    if (meta) console.error(msg, safePayload(meta));
    else console.error(msg);
  },
};
