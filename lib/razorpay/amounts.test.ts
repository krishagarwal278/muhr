import { describe, it, expect } from "vitest";

import { licenseFeeInrToPaise, resolveLicenseFeeInr } from "@/lib/razorpay/amounts";
import type { LicenseRequestRow } from "@/types/license";

describe("razorpay amounts", () => {
  it("converts INR rupees to paise", () => {
    expect(licenseFeeInrToPaise(25000)).toBe(2_500_000);
    expect(licenseFeeInrToPaise(1)).toBe(100);
  });

  it("resolves agreed budget over proposed budget", () => {
    const row = {
      agreed_budget_inr: 25000,
      budget_inr: 10000,
    } as LicenseRequestRow;
    expect(resolveLicenseFeeInr(row)).toBe(25000);
  });
});
