import { describe, it, expect } from "vitest";
import {
  creatorRequestConstraintsFromRules,
  permittedRequestChannels,
  permittedRequestTerritories,
  validateRequestAgainstConstraints,
} from "./requestOptions";

describe("creatorRequestConstraintsFromRules", () => {
  it("defaults when row is missing", () => {
    expect(creatorRequestConstraintsFromRules(null).allowPaidSocial).toBe(true);
  });

  it("maps usage toggles and regions", () => {
    const constraints = creatorRequestConstraintsFromRules({
      allow_paid_social: true,
      allow_broadcast: false,
      allow_other: false,
      territories: ["IN"],
      default_duration_days: 90,
    });

    expect(constraints.allowBroadcast).toBe(false);
    expect(constraints.permittedRegions).toEqual(["India"]);
    expect(constraints.defaultDurationDays).toBe(90);
  });
});

describe("permittedRequestChannels", () => {
  it("includes paid social channels when enabled", () => {
    const channels = permittedRequestChannels({
      allowPaidSocial: true,
      allowBroadcast: false,
      allowOther: false,
      permittedRegions: [],
      defaultDurationDays: 30,
    });

    expect(channels).toContain("Instagram");
    expect(channels).not.toContain("TV / OTT");
    expect(channels).not.toContain("Print");
  });
});

describe("permittedRequestTerritories", () => {
  it("restricts to creator regions when set", () => {
    expect(
      permittedRequestTerritories({
        allowPaidSocial: true,
        allowBroadcast: true,
        allowOther: true,
        permittedRegions: ["India"],
        defaultDurationDays: 30,
      })
    ).toEqual(["India"]);
  });
});

describe("validateRequestAgainstConstraints", () => {
  const constraints = {
    allowPaidSocial: true,
    allowBroadcast: false,
    allowOther: false,
    permittedRegions: ["India"],
    defaultDurationDays: 30,
  };

  it("rejects disallowed channel", () => {
    const result = validateRequestAgainstConstraints(constraints, {
      channels: ["TV / OTT"],
      territories: ["India"],
      durationDays: 30,
    });
    expect(result.ok).toBe(false);
  });

  it("accepts permitted selections", () => {
    const result = validateRequestAgainstConstraints(constraints, {
      channels: ["Instagram"],
      territories: ["India"],
      durationDays: 30,
    });
    expect(result.ok).toBe(true);
  });
});
