import { describe, it, expect } from "vitest";
import { apiErrorMessage, dataFromApiJson } from "./response";

describe("dataFromApiJson", () => {
  it("unwraps ok/data envelope", () => {
    expect(
      dataFromApiJson<{ incomingRequests: string[] }>({
        ok: true,
        data: { incomingRequests: ["a"] },
      })
    ).toEqual({ incomingRequests: ["a"] });
  });

  it("returns legacy flat body when ok is absent", () => {
    expect(dataFromApiJson({ counts: { pending: 2 } })).toEqual({ counts: { pending: 2 } });
  });

  it("returns null for failed ok envelope", () => {
    expect(dataFromApiJson({ ok: false, error: { message: "nope" } })).toBeNull();
  });
});

describe("apiErrorMessage", () => {
  it("reads nested error message", () => {
    expect(apiErrorMessage({ ok: false, error: { code: "x", message: "Bad" } })).toBe("Bad");
  });
});
