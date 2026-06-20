import { describe, it, expect } from "vitest";
import { parseLicenseHubTab, licenseHubTabHref } from "./hubTabs";

describe("parseLicenseHubTab", () => {
  it("defaults to inbox", () => {
    expect(parseLicenseHubTab(null)).toBe("inbox");
    expect(parseLicenseHubTab("invalid")).toBe("inbox");
  });

  it("maps legacy contracts tab to active", () => {
    expect(parseLicenseHubTab("contracts")).toBe("active");
  });

  it("accepts valid tab ids", () => {
    expect(parseLicenseHubTab("rules-and-rates")).toBe("rules-and-rates");
    expect(parseLicenseHubTab("history")).toBe("history");
  });
});

describe("licenseHubTabHref", () => {
  it("omits query for inbox", () => {
    expect(licenseHubTabHref("inbox")).toBe("/licenses");
  });

  it("includes tab query for other tabs", () => {
    expect(licenseHubTabHref("active")).toBe("/licenses?tab=active");
  });
});
