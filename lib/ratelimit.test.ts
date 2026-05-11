import { describe, expect, it } from "vitest";

import { RateLimitError } from "@/lib/errors/apiError";

import { rateLimit } from "./ratelimit";

describe("rateLimit (in-memory)", () => {
  it("allows under the cap", async () => {
    await expect(
      rateLimit({ key: "t_allow", identifier: "ip1", limit: 5, window: "10s" })
    ).resolves.toBeUndefined();
  });

  it("throws RateLimitError when exceeded", async () => {
    const key = `t_block_${Date.now()}`;
    for (let i = 0; i < 3; i += 1) {
      await rateLimit({ key, identifier: "ip2", limit: 3, window: "10s" });
    }
    
    await expect(
      rateLimit({ key, identifier: "ip2", limit: 3, window: "10s" })
    ).rejects.toBeInstanceOf(RateLimitError);
  });
});
