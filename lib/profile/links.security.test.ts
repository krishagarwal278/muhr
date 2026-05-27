import { describe, expect, it } from "vitest";
import {
  coerceProfileLinksFromStorage,
  parseProfileLink,
  resolveProfileLinks,
  sanitizeProfileLinks,
  validateProfileLinksBeforeSave,
} from "./links";

describe("profile links security", () => {
  it("rejects javascript: and data: website URLs", () => {
    expect(parseProfileLink("website", "javascript:alert(1)")).toBeNull();
    expect(parseProfileLink("website", "data:text/html,<script>alert(1)</script>")).toBeNull();
  });

  it("rejects non-https website URLs", () => {
    expect(parseProfileLink("website", "http://example.com")).toBeNull();
  });

  it("rejects wrong host when platform is youtube", () => {
    expect(parseProfileLink("youtube", "https://www.evil.com/channel/UC18sEtOctQgBwiIHTgCxSLQ")).toBeNull();
    expect(parseProfileLink("youtube", "https://youtube.com.evil.com/@foo")).toBeNull();
    expect(parseProfileLink("youtube", "https://evil.com/youtube.com/@foo")).toBeNull();
  });

  it("rejects lookalike linkedin hostnames", () => {
    expect(parseProfileLink("linkedin", "https://attacker-linkedin.com/in/fake")).toBeNull();
  });

  it("hostMatches treats baseHost as literal regex (dots only in domain)", () => {
    expect(parseProfileLink("youtube", "https://www.youtube.com/@creator")).not.toBeNull();
    expect(parseProfileLink("youtube", "https://www.notyoutube.com/@creator")).toBeNull();
  });

  it("rejects wrong host when platform is linkedin", () => {
    expect(parseProfileLink("linkedin", "https://www.instagram.com/in/someone")).toBeNull();
  });

  it("rejects unknown platform in sanitize payload", () => {
    const result = sanitizeProfileLinks([{ platform: "evil", value: "https://example.com" }]);
    expect(result.ok).toBe(false);
  });

  it("rejects more than 8 links", () => {
    const links = Array.from({ length: 9 }, (_, i) => ({
      platform: "website" as const,
      value: `https://example${i}.com`,
    }));
    const result = sanitizeProfileLinks(links);
    expect(result.ok).toBe(false);
  });

  it("resolveProfileLinks only returns https hrefs", () => {
    const resolved = resolveProfileLinks([
      { platform: "instagram", value: "creator" },
      { platform: "youtube", value: "https://www.youtube.com/channel/UC18sEtOctQgBwiIHTgCxSLQ" },
      { platform: "website", value: "https://creator.example.com" },
    ]);
    expect(resolved).toHaveLength(3);
    for (const link of resolved) {
      expect(link.href.startsWith("https://")).toBe(true);
      expect(link.href.toLowerCase()).not.toContain("javascript:");
    }
  });

  it("coerceProfileLinksFromStorage keeps valid rows when one row is corrupt", () => {
    const stored = [
      { platform: "instagram", value: "creator" },
      { platform: "youtube", value: "https://www.youtube.com/channel/UC18sEtOctQgBwiIHTgCxSLQ" },
      { platform: "linkedin", value: "https://evil.example/in/fake" },
      { platform: "imdb", value: "p.cd5qccnt6vnh4afnghlptygjqe" },
    ];
    const links = coerceProfileLinksFromStorage(stored);
    expect(links.map((l) => l.platform)).toEqual(["instagram", "youtube", "imdb"]);
  });

  it("round-trips a full multi-link profile without losing entries", () => {
    const input = [
      { platform: "instagram", value: "@creator" },
      { platform: "youtube", value: "https://www.youtube.com/channel/UC18sEtOctQgBwiIHTgCxSLQ" },
      { platform: "linkedin", value: "https://www.linkedin.com/in/krishagarwal" },
      { platform: "imdb", value: "https://www.imdb.com/user/p.cd5qccnt6vnh4afnghlptygjqe" },
    ] as const;

    const saved = validateProfileLinksBeforeSave([...input]);
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;

    const fromDb = coerceProfileLinksFromStorage(saved.data);
    expect(fromDb).toHaveLength(4);
    expect(fromDb.map((l) => l.platform).sort()).toEqual(["imdb", "instagram", "linkedin", "youtube"]);
  });
});
