import { describe, it, expect } from "vitest";
import {
  LICENSE_TERRITORIES,
  normalizeLicenseTerritories,
  normalizeLicenseTerritory,
} from "./territories";

describe("normalizeLicenseTerritory", () => {
  it("accepts canonical labels", () => {
    expect(normalizeLicenseTerritory("India")).toBe("India");
    expect(normalizeLicenseTerritory("Global")).toBe("Global");
  });

  it("maps legacy codes", () => {
    expect(normalizeLicenseTerritory("IN")).toBe("India");
    expect(normalizeLicenseTerritory("us")).toBe("United States");
  });

  it("returns null for unknown values", () => {
    expect(normalizeLicenseTerritory("Mars")).toBeNull();
  });
});

describe("normalizeLicenseTerritories", () => {
  it("dedupes and preserves canonical order", () => {
    expect(normalizeLicenseTerritories(["IN", "India", "Global", "bad"])).toEqual([
      "India",
      "Global",
    ]);
  });

  it("returns empty for missing input", () => {
    expect(normalizeLicenseTerritories(null)).toEqual([]);
    expect(normalizeLicenseTerritories([])).toEqual([]);
  });

  it("covers all canonical territories", () => {
    expect(LICENSE_TERRITORIES.length).toBeGreaterThan(0);
  });
});
