import type { VaultAsset } from "@/types";
import type { VaultEncryptionMetadataV1 } from "@/lib/vault/crypto";

export function vaultEncryptionMetaFromAsset(asset: VaultAsset): VaultEncryptionMetadataV1 | null {
  if (!asset.encryption_key_id || !asset.encryption_iv || !asset.wrapped_data_key) {
    return null;
  }
  return {
    encryption_version: 1,
    encryption_alg: "AES-256-GCM",
    encryption_iv_b64: asset.encryption_iv,
    wrapped_data_key_b64: asset.wrapped_data_key,
    wrapped_key_iv_b64: asset.wrapped_key_iv ?? "",
    wrapped_key_salt_b64: asset.wrapped_key_salt ?? "",
    original_file_name: asset.original_file_name ?? asset.file_name,
    original_mime_type: asset.original_mime_type ?? asset.mime_type ?? "application/octet-stream",
  };
}
