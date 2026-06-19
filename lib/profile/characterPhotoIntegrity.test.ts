import { describe, expect, it } from "vitest";

import {
  auditCharacterPhotoIntegrity,
  formatCharacterPhotoIntegrityReport,
} from "./characterPhotoIntegrity";

describe("auditCharacterPhotoIntegrity", () => {
  it("returns normalized issues from the RPC payload", async () => {
    const admin = {
      rpc: async () => ({
        data: {
          checkedAt: "2026-06-13T00:00:00.000Z",
          totalDbRows: 2,
          totalStorageFiles: 1,
          missingInStorage: [
            {
              photoId: "photo-2",
              userId: "user-1",
              filePath: "user-1/character-photos/missing.jpg",
              fileName: "missing.jpg",
              slotIndex: 4,
              userName: "Krish Agarwal",
              userHandle: "krish",
            },
          ],
          orphanInStorage: [
            {
              filePath: "user-1/character-photos/orphan.jpg",
              createdAt: "2026-01-02T00:00:00.000Z",
            },
          ],
        },
        error: null,
      }),
    };

    const report = await auditCharacterPhotoIntegrity(admin as never);

    expect(report.missingInStorage).toHaveLength(1);
    expect(report.missingInStorage[0]?.fileName).toBe("missing.jpg");
    expect(report.orphanInStorage).toHaveLength(1);
  });

  it("throws a helpful error when the RPC is missing", async () => {
    const admin = {
      rpc: async () => ({
        data: null,
        error: { message: "function audit_character_photo_integrity() does not exist" },
      }),
    };

    await expect(auditCharacterPhotoIntegrity(admin as never)).rejects.toThrow(
      /Apply migration 035_character_photo_integrity_audit/
    );
  });
});

describe("formatCharacterPhotoIntegrityReport", () => {
  it("prints an OK message when there are no issues", () => {
    const text = formatCharacterPhotoIntegrityReport({
      checkedAt: "2026-06-13T00:00:00.000Z",
      totalDbRows: 2,
      totalStorageFiles: 2,
      missingInStorage: [],
      orphanInStorage: [],
    });

    expect(text).toContain("OK");
  });
});
