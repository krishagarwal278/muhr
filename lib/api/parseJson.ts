import "server-only";

import { ApiHttpError } from "@/lib/errors/apiError";

/**
 * Safely parses JSON from a request body.
 * Throws a 400 ApiHttpError if parsing fails.
 * 
 * @example
 * ```ts
 * const body = await safeParseJson(request);
 * ```
 */
export async function safeParseJson<T = unknown>(request: Request): Promise<T> {
  try {
    const body = await request.json();
    return body as T;
  } catch {
    throw new ApiHttpError(400, "invalid_json", "Invalid JSON in request body");
  }
}

/**
 * Safely parses JSON with a Zod schema.
 * Throws appropriate errors for invalid JSON or validation failures.
 * 
 * @example
 * ```ts
 * import { z } from "zod";
 * 
 * const InputSchema = z.object({ name: z.string() });
 * const input = await parseJsonWithSchema(request, InputSchema);
 * // input is typed as { name: string }
 * ```
 */
export async function parseJsonWithSchema<T>(
  request: Request,
  schema: { parse: (data: unknown) => T }
): Promise<T> {
  const body = await safeParseJson(request);
  return schema.parse(body);
}
