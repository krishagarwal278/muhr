import { describe, expect, it } from "vitest";
import {
  parseProfileLink,
  profileLinksFromLegacyRow,
  sanitizeProfileLinks,
  validateProfileLinksBeforeSave,
} from "./links";

describe("profile links", () => {
  it("normalizes instagram handles", () => {
    const link = parseProfileLink("instagram", "@Creator_01");
    expect(link?.value).toBe("Creator_01");
    expect(link?.href).toBe("https://instagram.com/Creator_01");
  });

  it("normalizes imdb IDs", () => {
    const link = parseProfileLink("imdb", "nm1234567");
    expect(link?.value).toBe("nm1234567");
    expect(link?.href).toBe("https://www.imdb.com/name/nm1234567/");
  });

  it("accepts imdb user profile URLs", () => {
    const link = parseProfileLink("imdb", "https://www.imdb.com/user/ur12345678/?ref_=nv_usr_prof_2");
    expect(link?.value).toBe("ur12345678");
    expect(link?.href).toBe("https://www.imdb.com/user/ur12345678/");
  });

  it("accepts imdb p-dot profile URLs", () => {
    const link = parseProfileLink("imdb", "https://www.imdb.com/user/p.cd5qccnt6vnh4afnghlptygjqe?ref_=upe_hd_bk");
    expect(link?.value).toBe("p.cd5qccnt6vnh4afnghlptygjqe");
    expect(link?.href).toBe("https://www.imdb.com/user/p.cd5qccnt6vnh4afnghlptygjqe/");
  });

  it("rejects non-https websites", () => {
    expect(parseProfileLink("website", "http://example.com")).toBeNull();
  });

  it("accepts youtube channel URL (stores full link)", () => {
    const link = parseProfileLink("youtube", "https://www.youtube.com/channel/UC18sEtOctQgBwiIHTgCxSLQ");
    expect(link?.value).toBe("https://www.youtube.com/channel/UC18sEtOctQgBwiIHTgCxSLQ");
    expect(link?.href).toBe("https://www.youtube.com/channel/UC18sEtOctQgBwiIHTgCxSLQ");
  });

  it("accepts youtube @handle url with extra path segments", () => {
    const link = parseProfileLink("youtube", "https://www.youtube.com/@krishagarwal/videos?si=abc");
    expect(link?.value).toBe("https://www.youtube.com/@krishagarwal");
    expect(link?.href).toBe("https://www.youtube.com/@krishagarwal");
  });

  it("accepts youtube.com/@handle without scheme", () => {
    const link = parseProfileLink("youtube", "youtube.com/@krishagarwal");
    expect(link?.value).toBe("https://www.youtube.com/@krishagarwal");
    expect(link?.href).toBe("https://www.youtube.com/@krishagarwal");
  });

  it("accepts linkedin slugs with dots", () => {
    const link = parseProfileLink("linkedin", "https://www.linkedin.com/in/krish.agarwal-123/");
    expect(link?.value).toBe("https://www.linkedin.com/in/krish.agarwal-123");
    expect(link?.href).toBe("https://www.linkedin.com/in/krish.agarwal-123");
  });

  it("accepts youtube channel URLs with trailing segments", () => {
    const link = parseProfileLink(
      "youtube",
      "https://www.youtube.com/channel/UC1234567890abcdefghijk/videos"
    );
    expect(link?.value).toBe("https://www.youtube.com/channel/UC1234567890abcdefghijk");
    expect(link?.href).toBe("https://www.youtube.com/channel/UC1234567890abcdefghijk");
  });

  it("accepts linkedin profile pasted without scheme", () => {
    const link = parseProfileLink("linkedin", "linkedin.com/in/krishagarwal");
    expect(link?.value).toBe("https://www.linkedin.com/in/krishagarwal");
    expect(link?.href).toBe("https://www.linkedin.com/in/krishagarwal");
  });

  it("round-trips channel URL through sanitize", () => {
    const result = sanitizeProfileLinks([
      { platform: "youtube", value: "https://www.youtube.com/channel/UC18sEtOctQgBwiIHTgCxSLQ" },
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data[0]?.value).toBe("https://www.youtube.com/channel/UC18sEtOctQgBwiIHTgCxSLQ");
    }
  });

  it("rejects empty link rows before save", () => {
    const result = validateProfileLinksBeforeSave([
      { platform: "instagram", value: "creator" },
      { platform: "youtube", value: "   " },
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/YouTube/i);
    }
  });

  it("rejects duplicate platforms in sanitize", () => {
    const result = sanitizeProfileLinks([
      { platform: "instagram", value: "@one" },
      { platform: "instagram", value: "@two" },
    ]);
    expect(result.ok).toBe(false);
  });

  it("drops empty draft entries in sanitize (prevents accidental wipes)", () => {
    const result = sanitizeProfileLinks([
      { platform: "imdb", value: "nm1234567" },
      { platform: "youtube", value: "   " },
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual([{ platform: "imdb", value: "nm1234567" }]);
    }
  });

  it("builds legacy instagram link from social fields", () => {
    const links = profileLinksFromLegacyRow({
      social_platform: "instagram",
      social_username: "@creator",
    });
    expect(links).toEqual([{ platform: "instagram", value: "creator" }]);
  });
});
