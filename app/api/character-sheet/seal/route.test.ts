import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/requireUser");
vi.mock("@/lib/character-sheet/server");
vi.mock("@/lib/supabase/route");
vi.mock("@/lib/supabase/service");
vi.mock("@/lib/vault/ensureBrandShareCopy");

import { requireUser } from "@/lib/auth/requireUser";
import { markCharacterSheetSealed } from "@/lib/character-sheet/server";
import { prepareBrandSharesForVaultAsset } from "@/lib/vault/ensureBrandShareCopy";
import { createRouteClient } from "@/lib/supabase/route";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { POST } from "./route";

const NEW_ID = "200d0836-a6d8-4d17-8139-f603b88fbf68";
const OLD_ID = "fd5d9583-37c5-49c3-a8eb-efd5388b4990";
const LICENSE_ID = "fd7acd73-4977-4c36-b7ce-d328819a622b";

function chainEndingWith<T>(value: T) {
  const terminal = {
    maybeSingle: vi.fn().mockResolvedValue(value),
    eq: vi.fn(),
  };
  terminal.eq.mockReturnValue(terminal);
  return terminal;
}

describe("POST /api/character-sheet/seal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireUser).mockResolvedValue({ id: "creator-1", email: "c@test.com" } as never);
    vi.mocked(markCharacterSheetSealed).mockResolvedValue(undefined);
    vi.mocked(prepareBrandSharesForVaultAsset).mockResolvedValue(undefined);
    vi.mocked(createServiceRoleClient).mockReturnValue(null);
  });

  function buildReplaceMocks() {
    const callOrder: string[] = [];

    const deliveryUpdateEq = vi.fn().mockImplementation(async () => {
      callOrder.push("delivery_update");
      return { error: null };
    });
    const deliveryUpdate = vi.fn().mockReturnValue({ eq: deliveryUpdateEq });

    const deliveryUpsert = vi.fn().mockImplementation(async () => {
      callOrder.push("delivery_upsert");
      return { error: null };
    });

    const vaultDeleteSecondEq = vi.fn().mockImplementation(async () => {
      callOrder.push("vault_delete");
      return { error: null };
    });
    const vaultDeleteFirstEq = vi.fn().mockReturnValue({ eq: vaultDeleteSecondEq });
    const vaultDelete = vi.fn().mockReturnValue({ eq: vaultDeleteFirstEq });

    const remove = vi.fn().mockImplementation(async () => {
      callOrder.push("storage_remove");
      return { error: null };
    });

    let vaultSelectCalls = 0;

    const from = vi.fn((table: string) => {
      if (table === "vault_assets") {
        return {
          select: vi.fn(() => {
            vaultSelectCalls += 1;
            if (vaultSelectCalls === 1) {
              return chainEndingWith({
                data: { id: NEW_ID, asset_type: "character_sheet" },
                error: null,
              });
            }
            return chainEndingWith({
              data: { id: OLD_ID, file_path: "creator-1/character_sheet/old.jpg" },
              error: null,
            });
          }),
          delete: vaultDelete,
        };
      }
      if (table === "license_deliveries") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [{ license_request_id: LICENSE_ID, delivered_by: "creator-1" }],
            }),
          }),
          update: deliveryUpdate,
          upsert: deliveryUpsert,
        };
      }
      return {};
    });

    const supabase = {
      from,
      storage: { from: vi.fn().mockReturnValue({ remove }) },
    };

    return { supabase, callOrder, deliveryUpdate, deliveryUpsert, vaultDelete };
  }

  it("returns 404 when the vault asset is missing", async () => {
    const supabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue(
          chainEndingWith({ data: null, error: null })
        ),
      }),
    };
    vi.mocked(createRouteClient).mockResolvedValue(supabase as never);

    const response = await POST(
      new Request("http://test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vaultAssetId: NEW_ID,
          generationMode: "compose",
        }),
      })
    );

    expect(response.status).toBe(404);
    expect(prepareBrandSharesForVaultAsset).not.toHaveBeenCalled();
  });

  it("migrates deliveries before deleting the replaced vault asset", async () => {
    const { supabase, callOrder, deliveryUpdate, vaultDelete } = buildReplaceMocks();
    vi.mocked(createRouteClient).mockResolvedValue(supabase as never);

    const response = await POST(
      new Request("http://test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vaultAssetId: NEW_ID,
          generationMode: "compose",
          replaceVaultAssetId: OLD_ID,
        }),
      })
    );

    const json = await response.json();
    expect(json, JSON.stringify(json)).toEqual({ ok: true });
    expect(response.status).toBe(200);
    expect(deliveryUpdate).toHaveBeenCalledWith({ vault_asset_id: NEW_ID });
    expect(vaultDelete).toHaveBeenCalled();
    expect(callOrder.indexOf("delivery_update")).toBeLessThan(callOrder.indexOf("vault_delete"));
    expect(prepareBrandSharesForVaultAsset).toHaveBeenCalledWith(supabase, supabase, NEW_ID);
  });

  it("re-upserts deliveries after replace so cascade-deleted rows are restored", async () => {
    const { supabase, deliveryUpsert } = buildReplaceMocks();
    vi.mocked(createRouteClient).mockResolvedValue(supabase as never);

    await POST(
      new Request("http://test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vaultAssetId: NEW_ID,
          generationMode: "ai",
          replaceVaultAssetId: OLD_ID,
        }),
      })
    );

    expect(deliveryUpsert).toHaveBeenCalledWith(
      [
        {
          license_request_id: LICENSE_ID,
          vault_asset_id: NEW_ID,
          delivered_by: "creator-1",
        },
      ],
      { onConflict: "license_request_id,vault_asset_id" }
    );
  });
});
