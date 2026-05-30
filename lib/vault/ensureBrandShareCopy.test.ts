import { describe, expect, it, vi } from "vitest";

import {
  brandShareStoragePath,
  ensureBrandShareCopy,
  prepareBrandSharesForVaultAsset,
} from "./ensureBrandShareCopy";

function mockStorageCopy(error: { message: string } | null = null) {
  return {
    storage: {
      from: vi.fn().mockReturnValue({
        copy: vi.fn().mockResolvedValue({ error }),
      }),
    },
  };
}

function mockDbUpdate() {
  const eq = vi.fn().mockResolvedValue({ error: null });
  const update = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ update, select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn() });
  return { from, update, eq };
}

describe("brandShareStoragePath", () => {
  it("builds a per-license brand delivery path", () => {
    expect(brandShareStoragePath("user-1", "asset-1", "license-1", "jpg")).toBe(
      "user-1/brand_delivery/license-1/asset-1.jpg"
    );
  });
});

describe("ensureBrandShareCopy", () => {
  const asset = {
    id: "asset-1",
    user_id: "user-1",
    file_path: "user-1/character_sheet/sheet.jpg",
    encryption_key_id: null as string | null,
    share_file_path: null as string | null,
  };

  it("returns an existing share_file_path without copying", async () => {
    const storage = mockStorageCopy();
    const db = mockDbUpdate();
    const existing = "user-1/brand_delivery/license-1/asset-1.jpg";

    const result = await ensureBrandShareCopy(
      storage as never,
      db as never,
      { ...asset, share_file_path: existing },
      "license-1"
    );

    expect(result).toBe(existing);
    expect(storage.storage.from).not.toHaveBeenCalled();
  });

  it("returns null for encrypted assets", async () => {
    const storage = mockStorageCopy();
    const db = mockDbUpdate();

    const result = await ensureBrandShareCopy(
      storage as never,
      db as never,
      { ...asset, encryption_key_id: "muhr-vault-pbkdf2-aesgcm-v1" },
      "license-1"
    );

    expect(result).toBeNull();
    expect(storage.storage.from).not.toHaveBeenCalled();
  });

  it("copies plaintext assets and persists share_file_path", async () => {
    const storage = mockStorageCopy();
    const db = mockDbUpdate();

    const result = await ensureBrandShareCopy(storage as never, db as never, asset, "license-1");

    expect(storage.storage.from).toHaveBeenCalledWith("assets");
    expect(storage.storage.from().copy).toHaveBeenCalledWith(
      asset.file_path,
      "user-1/brand_delivery/license-1/asset-1.jpg"
    );
    expect(db.update).toHaveBeenCalledWith({
      share_file_path: "user-1/brand_delivery/license-1/asset-1.jpg",
    });
    expect(result).toBe("user-1/brand_delivery/license-1/asset-1.jpg");
  });

  it("falls back to file_path when storage copy fails", async () => {
    const storage = mockStorageCopy({ message: "copy failed" });
    const db = mockDbUpdate();

    const result = await ensureBrandShareCopy(storage as never, db as never, asset, "license-1");

    expect(result).toBe(asset.file_path);
    expect(db.update).not.toHaveBeenCalled();
  });
});

describe("prepareBrandSharesForVaultAsset", () => {
  it("skips encrypted vault assets", async () => {
    const storage = mockStorageCopy();
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: "asset-1",
        user_id: "user-1",
        file_path: "user-1/sheet.enc",
        encryption_key_id: "muhr-vault-pbkdf2-aesgcm-v1",
        share_file_path: null,
      },
    });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });

    await prepareBrandSharesForVaultAsset({ storage: storage.storage } as never, { from } as never, "asset-1");

    expect(from).toHaveBeenCalledWith("vault_assets");
    expect(from).not.toHaveBeenCalledWith("license_deliveries");
  });

  it("prepares a brand share for each delivery of a plaintext asset", async () => {
    const assetRow = {
      id: "asset-1",
      user_id: "user-1",
      file_path: "user-1/character_sheet/sheet.jpg",
      encryption_key_id: null,
      share_file_path: null,
    };

    const vaultEq = vi.fn().mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue({ data: assetRow }),
    });
    const vaultSelect = vi.fn().mockReturnValue({ eq: vaultEq });

    const deliveryEq = vi.fn().mockResolvedValue({
      data: [{ license_request_id: "lic-a" }, { license_request_id: "lic-b" }],
    });
    const deliverySelect = vi.fn().mockReturnValue({ eq: deliveryEq });

    const updateEq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq: updateEq });

    const from = vi.fn((table: string) => {
      if (table === "vault_assets") return { select: vaultSelect, update };
      if (table === "license_deliveries") return { select: deliverySelect };
      return { select: vi.fn(), update: vi.fn() };
    });

    const copy = vi.fn().mockResolvedValue({ error: null });
    const storage = { from: vi.fn().mockReturnValue({ copy }) };

    await prepareBrandSharesForVaultAsset({ storage } as never, { from } as never, "asset-1");

    expect(copy).toHaveBeenCalledTimes(2);
    expect(update).toHaveBeenCalledTimes(2);
  });
});
