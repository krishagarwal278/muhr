import { describe, expect, it } from "vitest";
import { extensionForAudioMime, isAllowedVaultAudioMime, mimeTypeFromFileName } from "./audioMime";

describe("audioMime", () => {
  it("allows only mp3 and mp4 mime types", () => {
    expect(isAllowedVaultAudioMime("audio/mpeg")).toBe(true);
    expect(isAllowedVaultAudioMime("audio/mp4")).toBe(true);
    expect(isAllowedVaultAudioMime("audio/webm")).toBe(false);
    expect(isAllowedVaultAudioMime("audio/wav")).toBe(false);
  });

  it("maps file extensions", () => {
    expect(mimeTypeFromFileName("sample.mp3")).toBe("audio/mpeg");
    expect(mimeTypeFromFileName("sample.mp4")).toBe("audio/mp4");
    expect(mimeTypeFromFileName("sample.m4a")).toBe("audio/mp4");
    expect(extensionForAudioMime("audio/mp4")).toBe("mp4");
  });
});
