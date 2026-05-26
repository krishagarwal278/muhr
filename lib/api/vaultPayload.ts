import type { CharacterSheetGenerateResponse, CharacterSheetStatusResponse } from "@/lib/character-sheet/types";
import type { VaultAsset } from "@/types";
import { dataFromApiJson } from "@/lib/api/response";

export type VaultAssetWithUrl = VaultAsset & { signed_url: string | null };

function mapVaultAssets(
  list: Array<VaultAsset & { signed_url?: string | null }> | undefined
): VaultAssetWithUrl[] {
  if (!Array.isArray(list)) return [];
  return list.map((a): VaultAssetWithUrl => ({ ...a, signed_url: a.signed_url ?? null }));
}

export function vaultAssetsFromApiJson(json: unknown): VaultAssetWithUrl[] | null {
  const data = dataFromApiJson<{
    assets?: Array<VaultAsset & { signed_url?: string | null }>;
  }>(json);
  if (!data) return null;
  return mapVaultAssets(data.assets);
}

export function vaultListFromApiJson(json: unknown): {
  assets: VaultAssetWithUrl[];
  archived: VaultAssetWithUrl[];
} | null {
  const data = dataFromApiJson<{
    assets?: Array<VaultAsset & { signed_url?: string | null }>;
    archived?: Array<VaultAsset & { signed_url?: string | null }>;
  }>(json);
  if (!data) return null;
  return {
    assets: mapVaultAssets(data.assets),
    archived: mapVaultAssets(data.archived),
  };
}

export function characterSheetFromApiJson(json: unknown): CharacterSheetStatusResponse | null {
  return dataFromApiJson<CharacterSheetStatusResponse>(json);
}

export function characterSheetGenerateFromApiJson(
  json: unknown
): CharacterSheetGenerateResponse | null {
  return dataFromApiJson<CharacterSheetGenerateResponse>(json);
}

export function vaultUploadFromApiJson(json: unknown): {
  message?: string;
  asset?: VaultAsset;
} | null {
  return dataFromApiJson<{ message?: string; asset?: VaultAsset }>(json);
}
