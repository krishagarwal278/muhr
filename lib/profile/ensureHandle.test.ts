import { describe, expect, it } from "vitest";

import {
  fallbackHandleFromUserId,
  handleCandidatesFromUser,
  sanitizeHandleCandidate,
} from "./ensureHandle";

describe("handleCandidatesFromUser", () => {
  it("prefers OAuth username fields over email local-part", () => {
    expect(
      handleCandidatesFromUser({
        email: "agkrish@bu.edu",
        user_metadata: { preferred_username: "agkrish", user_name: "other" },
      })
    ).toEqual(["agkrish", "other"]);
  });

  it("falls back to email local-part", () => {
    expect(
      handleCandidatesFromUser({
        email: "agkrish@bu.edu",
        user_metadata: {},
      })
    ).toEqual(["agkrish"]);
  });
});

describe("sanitizeHandleCandidate", () => {
  it("normalizes punctuation into underscores", () => {
    expect(sanitizeHandleCandidate("Ag.Krish-01")).toBe("ag_krish_01");
  });

  it("rejects handles shorter than 3 characters", () => {
    expect(sanitizeHandleCandidate("ab")).toBeNull();
  });
});

describe("fallbackHandleFromUserId", () => {
  it("builds a stable mu_ handle from the user id", () => {
    expect(fallbackHandleFromUserId("00000000-0000-0000-0000-b43e347d0000")).toBe("mu_347d0000");
  });
});
