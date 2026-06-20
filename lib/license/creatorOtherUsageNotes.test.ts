import { describe, it, expect } from "vitest";
import {
  normalizeOtherUsageNotes,
  OTHER_USAGE_NOTES_MAX_LENGTH,
} from "@/lib/format/text";

describe("normalizeOtherUsageNotes", () => {
  it("returns null for empty values", () => {
    expect(normalizeOtherUsageNotes(null)).toBeNull();
    expect(normalizeOtherUsageNotes("   ")).toBeNull();
  });

  it("trims and preserves text", () => {
    expect(normalizeOtherUsageNotes("  Podcasts only.  ")).toBe("Podcasts only.");
  });

  it("caps length", () => {
    const long = "a".repeat(OTHER_USAGE_NOTES_MAX_LENGTH + 50);
    expect(normalizeOtherUsageNotes(long)?.length).toBe(OTHER_USAGE_NOTES_MAX_LENGTH);
  });
});
