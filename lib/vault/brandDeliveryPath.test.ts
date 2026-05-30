import { describe, expect, it } from "vitest";
import {
  brandDeliveryMimeType,
  brandDeliveryStoragePath,
  isBrandViewableDeliveredAsset,
  isLegacyEncryptedCharacterSheet,
} from "./brandDeliveryPath";

describe("brandDeliveryPath", () => {
  it("uses plaintext file_path for standard assets", () => {
    const asset = {
      asset_type: "face_photo" as const,
      file_path: "user/face.png",
      mime_type: "image/png",
      encryption_key_id: null,
    };
    expect(brandDeliveryStoragePath(asset)).toBe("user/face.png");
    expect(isBrandViewableDeliveredAsset(asset)).toBe(true);
  });

  it("blocks legacy encrypted character sheets without share copy", () => {
    const asset = {
      asset_type: "character_sheet" as const,
      file_path: "user/sheet.enc",
      mime_type: "application/octet-stream",
      encryption_key_id: "muhr-vault-pbkdf2-aesgcm-v1",
      original_mime_type: "image/jpeg",
      share_file_path: null,
    };
    expect(brandDeliveryStoragePath(asset)).toBeNull();
    expect(isBrandViewableDeliveredAsset(asset)).toBe(false);
    expect(brandDeliveryMimeType(asset)).toBe("image/jpeg");
  });

  it("uses share_file_path when set for any asset type", () => {
    const asset = {
      asset_type: "character_sheet" as const,
      file_path: "user/sheet.enc",
      mime_type: "application/octet-stream",
      encryption_key_id: "muhr-vault-pbkdf2-aesgcm-v1",
      original_mime_type: "image/png",
      share_file_path: "user/sheet-share.png",
    };
    expect(brandDeliveryStoragePath(asset)).toBe("user/sheet-share.png");
    expect(isBrandViewableDeliveredAsset(asset)).toBe(true);
  });

  it("treats plaintext character sheets as brand-viewable via file_path", () => {
    const asset = {
      asset_type: "character_sheet" as const,
      file_path: "user/character_sheet/sheet.jpg",
      mime_type: "image/jpeg",
      encryption_key_id: null,
      share_file_path: null,
    };
    expect(brandDeliveryStoragePath(asset)).toBe("user/character_sheet/sheet.jpg");
    expect(isBrandViewableDeliveredAsset(asset)).toBe(true);
    expect(brandDeliveryMimeType(asset)).toBe("image/jpeg");
  });

  it("identifies legacy encrypted character sheets without a share copy", () => {
    const asset = {
      id: "a1",
      user_id: "u1",
      file_name: "sheet.enc",
      file_path: "user/sheet.enc",
      file_size: 1,
      mime_type: "application/octet-stream",
      asset_type: "character_sheet" as const,
      encryption_key_id: "muhr-vault-pbkdf2-aesgcm-v1",
      share_file_path: null,
      created_at: "",
      updated_at: "",
    };
    expect(isLegacyEncryptedCharacterSheet(asset)).toBe(true);
  });
});
