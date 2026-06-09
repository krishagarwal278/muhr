import { describe, expect, it } from "vitest";

import { hasRequiredCharacterPhotosForVerification } from "@/lib/profile/identityVerification";

describe("hasRequiredCharacterPhotosForVerification", () => {
  it("requires at least five character photos", () => {
    expect(hasRequiredCharacterPhotosForVerification(4)).toBe(false);
    expect(hasRequiredCharacterPhotosForVerification(5)).toBe(true);
    expect(hasRequiredCharacterPhotosForVerification(6)).toBe(true);
  });
});
