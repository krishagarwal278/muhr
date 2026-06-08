import { describe, expect, it } from "vitest";
import { vaultStorageContentType, vaultStorageFileExtension } from "./uploadStorage";

describe("uploadStorage", () => {
  it("uses octet-stream for encrypted and voice samples", () => {
    expect(vaultStorageContentType("voice_sample", false, "audio/mp4", "audio/mp4")).toBe(
      "application/octet-stream"
    );
    expect(vaultStorageContentType("face_photo", true, "image/jpeg", "image/jpeg")).toBe(
      "application/octet-stream"
    );
  });

  it("uses original extension instead of enc", () => {
    expect(
      vaultStorageFileExtension(
        "voice_sample",
        "voice-sample-1.mp4.enc",
        "voice-sample-1.mp4",
        true,
        "audio/mp4"
      )
    ).toBe("mp4");
  });
});
