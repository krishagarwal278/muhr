import { describe, expect, it } from "vitest";
import {
  filterDeliverableVaultAssets,
  isDeliverableVaultAsset,
  isVaultGalleryFacePhoto,
  isActiveVaultAsset,
} from "./assetFilters";

const base = {
  id: "a1",
  user_id: "u1",
  file_name: "x",
  file_path: "u1/x",
  file_size: 1,
  mime_type: "image/png",
  created_at: "",
  updated_at: "",
};

describe("vault asset filters", () => {
  it("hides encrypted face photos from gallery and delivery", () => {
    const encryptedFace = {
      ...base,
      asset_type: "face_photo" as const,
      encryption_key_id: "muhr-vault-pbkdf2-aesgcm-v1",
    };
    expect(isVaultGalleryFacePhoto(encryptedFace)).toBe(false);
    expect(isDeliverableVaultAsset(encryptedFace)).toBe(false);
    expect(filterDeliverableVaultAssets([encryptedFace])).toHaveLength(0);
  });

  it("excludes archived assets from delivery and gallery", () => {
    const archived = {
      ...base,
      asset_type: "face_photo" as const,
      archived_at: "2026-01-01T00:00:00Z",
    };
    expect(isActiveVaultAsset(archived)).toBe(false);
    expect(isVaultGalleryFacePhoto(archived)).toBe(false);
    expect(isDeliverableVaultAsset(archived)).toBe(false);
  });

  it("includes plain face photos and character sheets for delivery", () => {
    const face = { ...base, asset_type: "face_photo" as const };
    const sheet = { ...base, asset_type: "character_sheet" as const };
    const legacyEncryptedSheet = {
      ...base,
      asset_type: "character_sheet" as const,
      encryption_key_id: "k",
    };
    const list = filterDeliverableVaultAssets([face, sheet, legacyEncryptedSheet]);
    expect(list).toHaveLength(2);
    expect(isDeliverableVaultAsset(legacyEncryptedSheet)).toBe(false);
  });

  it("allows legacy encrypted character sheets once a share copy exists", () => {
    const legacyWithShare = {
      ...base,
      asset_type: "character_sheet" as const,
      encryption_key_id: "k",
      share_file_path: "u1/brand_delivery/lic/sheet.jpg",
    };
    expect(isDeliverableVaultAsset(legacyWithShare)).toBe(true);
  });
});
