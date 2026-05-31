import { describe, expect, it, vi, beforeEach } from "vitest";
import { normalizeReviewPayload, runLegalReview } from "./legalReview";

describe("normalizeReviewPayload", () => {
  it("maps legacy LLM issue fields into the review schema", () => {
    const normalized = normalizeReviewPayload({
      overallRisk: "high",
      summary: "Several risks",
      issues: [
        {
          severity: "medium",
          clause: "Payment",
          problem: "No payment timing",
          suggestedFix: "Pay within 30 days",
        },
      ],
    }) as {
      overallRisk: string;
      issues: { id: string; severity: string; message: string; suggestion?: string }[];
      disclaimer: string;
    };

    expect(normalized.overallRisk).toBe("high");
    expect(normalized.issues[0].id).toBe("issue-1");
    expect(normalized.issues[0].severity).toBe("warning");
    expect(normalized.issues[0].message).toBe("No payment timing");
    expect(normalized.issues[0].suggestion).toBe("Pay within 30 days");
    expect(normalized.disclaimer).toContain("not legal advice");
  });
});

describe("runLegalReview", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("parses model JSON after normalization", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  overallRisk: "medium",
                  summary: "Some issues found",
                  issues: [
                    {
                      severity: "medium",
                      clause: "Payment",
                      problem: "No payment timing",
                      suggestedFix: "Add payment within 30 days",
                    },
                  ],
                  disclaimer: "This is an AI-assisted contract review, not legal advice.",
                }),
              },
            },
          ],
        }),
      })) as unknown as typeof fetch
    );

    const res = await runLegalReview("contract text", { license_request_id: "req-1" });
    expect(res.overallRisk).toBe("medium");
    expect(res.issues).toHaveLength(1);
    expect(res.issues[0].severity).toBe("warning");
    expect(res.issues[0].message).toBe("No payment timing");
  });
});
