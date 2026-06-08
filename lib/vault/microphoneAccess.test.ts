import { describe, expect, it } from "vitest";
import { classifyMicrophoneError, microphoneErrorMessage } from "./microphoneAccess";

describe("microphoneAccess", () => {
  it("classifies policy violations", () => {
    const err = new DOMException("microphone is not allowed", "SecurityError");
    expect(classifyMicrophoneError(err)).toBe("policy");
    expect(microphoneErrorMessage("policy")).toMatch(/Reload/);
  });

  it("classifies user denial", () => {
    const err = new DOMException("denied", "NotAllowedError");
    expect(classifyMicrophoneError(err)).toBe("denied");
  });
});
