import "server-only";

import { ZodError } from "zod";

/** Thrown when `requireUser()` finds no session. */
export class UnauthorizedError extends Error {
  readonly code = "unauthorized" as const;
  readonly status = 401 as const;

  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

/** Too many requests (rate limit). */
export class RateLimitError extends Error {
  readonly code = "too_many_requests" as const;
  readonly status = 429 as const;

  constructor() {
    super("Too many requests");
    this.name = "RateLimitError";
  }
}

/** Explicit HTTP error with stable code and safe client message. */
export class ApiHttpError extends Error {
  readonly name = "ApiHttpError";

  constructor(
    readonly status: number,
    readonly code: string,
    message: string
  ) {
    super(message);
  }
}

/** Map caught errors to HTTP-safe JSON (no internal messages). */
export function toApiError(err: unknown): { status: number; code: string; message: string } {
  if (err instanceof UnauthorizedError) {
    return { status: 401, code: err.code, message: "Unauthorized" };
  }
  if (err instanceof RateLimitError) {
    return { status: 429, code: err.code, message: "Too many requests. Try again later." };
  }
  if (err instanceof ApiHttpError) {
    return { status: err.status, code: err.code, message: err.message };
  }
  if (err instanceof ZodError) {
    return { status: 400, code: "invalid_input", message: "Invalid request" };
  }

  return {
    status: 500,
    code: "internal_error",
    message: "Something went wrong",
  };
}
