import { describe, expect, test, beforeEach, vi } from "vitest";
import { logger } from "@/lib/logger";

vi.spyOn(global.console, "warn").mockImplementation(() => {});
vi.spyOn(global.console, "error").mockImplementation(() => {});

describe("logger redaction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("redacts top-level sensitive keys", () => {
    const meta = { password: "secret", api_key: "abc123", ok: 1 };
    logger.warn("test", meta);
    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledWith(
      "test",
      expect.objectContaining({ password: "[redacted]", api_key: "[redacted]", ok: 1 })
    );
  });

  test("redacts nested objects and arrays", () => {
    const meta = {
      nested: { token: "tok", inner: { refresh_token: "rt" } },
      arr: [{ password: "p" }, { ok: 2 }],
    };

    logger.error("err", meta);
    expect(console.error).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledWith(
      "err",
      expect.objectContaining({
        nested: expect.objectContaining({
          token: "[redacted]",
          inner: expect.objectContaining({ refresh_token: "[redacted]" }),
        }),
        arr: expect.arrayContaining([
          expect.objectContaining({ password: "[redacted]" }),
          expect.objectContaining({ ok: 2 }),
        ]),
      })
    );
  });

  test("passes through non-object payloads unchanged", () => {
    logger.warn("plain", "a string payload");
    expect(console.warn).toHaveBeenCalledWith("plain", "a string payload");
  });
});
