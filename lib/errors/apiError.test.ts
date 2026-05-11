import { describe, expect, it } from "vitest";
import { ZodError, z } from "zod";

import {
  ApiHttpError,
  RateLimitError,
  UnauthorizedError,
  toApiError,
} from "./apiError";

describe("toApiError", () => {
  it("maps UnauthorizedError", () => {
    expect(toApiError(new UnauthorizedError())).toEqual({
      status: 401,
      code: "unauthorized",
      message: "Unauthorized",
    });
  });

  it("maps RateLimitError", () => {
    const r = toApiError(new RateLimitError());
    expect(r.status).toBe(429);
    expect(r.code).toBe("too_many_requests");
    expect(r.message).toContain("Too many");
  });

  it("maps ApiHttpError", () => {
    expect(toApiError(new ApiHttpError(400, "bad_request", "Bad request"))).toEqual({
      status: 400,
      code: "bad_request",
      message: "Bad request",
    });
  });

  it("maps ZodError", () => {
    const schema = z.object({ a: z.string() });
    let err: ZodError;
    try {
      schema.parse({});
    } catch (e) {
      err = e as ZodError;
    }
    expect(toApiError(err!)).toMatchObject({
      status: 400,
      code: "invalid_input",
    });
  });

  it("maps unknown to internal_error", () => {
    expect(toApiError(new Error("secret"))).toEqual({
      status: 500,
      code: "internal_error",
      message: "Something went wrong",
    });
  });
});
