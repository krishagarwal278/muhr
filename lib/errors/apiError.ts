import "server-only";

/** Thrown when `requireUser()` finds no session. */
export class UnauthorizedError extends Error {
  readonly code = "unauthorized" as const;
  readonly status = 401 as const;

  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

/** Map caught errors to HTTP-safe JSON (no internal messages). */
export function toApiError(err: unknown): { status: number; code: string; message: string } {
  if (err instanceof UnauthorizedError) {
    return { status: 401, code: err.code, message: "Unauthorized" };
  }

  return {
    status: 500,
    code: "internal_error",
    message: "Something went wrong",
  };
}
