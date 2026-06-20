import { describe, it, expect } from "vitest";
import {
  digitsOnly,
  formatIntegerInputText,
  formatIntegerWithCommas,
  parseFormattedInteger,
} from "./numberInput";

describe("parseFormattedInteger", () => {
  it("parses plain and comma-grouped numbers", () => {
    expect(parseFormattedInteger("1000")).toBe(1000);
    expect(parseFormattedInteger("1,000")).toBe(1000);
    expect(parseFormattedInteger("12,34,567")).toBe(1234567);
  });

  it("returns null for empty input", () => {
    expect(parseFormattedInteger("")).toBeNull();
    expect(parseFormattedInteger("  ")).toBeNull();
  });
});

describe("formatIntegerInputText", () => {
  it("adds commas while typing", () => {
    expect(formatIntegerInputText("1000")).toBe("1,000");
    expect(formatIntegerInputText("1,000")).toBe("1,000");
  });
});

describe("formatIntegerWithCommas", () => {
  it("formats en-IN grouping", () => {
    expect(formatIntegerWithCommas(4000)).toBe("4,000");
  });
});

describe("digitsOnly", () => {
  it("removes non-digits", () => {
    expect(digitsOnly("₹ 1,800")).toBe("1800");
  });
});
