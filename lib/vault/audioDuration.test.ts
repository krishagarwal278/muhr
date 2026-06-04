import { describe, expect, it } from "vitest";
import { formatDurationMs, validateVoiceSampleDurationMs } from "./audioDuration";

describe("audioDuration", () => {
  it("formats mm:ss", () => {
    expect(formatDurationMs(125_000)).toBe("2:05");
  });

  it("validates sample length bounds", () => {
    expect(validateVoiceSampleDurationMs(30_000)).toMatch(/Too short/);
    expect(validateVoiceSampleDurationMs(130_000)).toMatch(/Too long/);
    expect(validateVoiceSampleDurationMs(90_000)).toBeNull();
  });
});
