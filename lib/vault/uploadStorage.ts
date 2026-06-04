import type { AssetType } from "@/types";
import { extensionForAudioMime } from "@/lib/vault/audioMime";

/** Content-Type sent to Supabase Storage (bucket allowlist applies here). */
export function vaultStorageContentType(
  assetType: AssetType,
  isEncrypted: boolean,
  effectiveMimeType: string,
  fileType: string
): string {
  if (isEncrypted || assetType === "voice_sample") {
    return "application/octet-stream";
  }
  return effectiveMimeType || fileType || "application/octet-stream";
}

/** Object path extension — avoid `.enc`, which breaks bucket MIME inference. */
export function vaultStorageFileExtension(
  assetType: AssetType,
  fileName: string,
  originalFileName: string,
  isEncrypted: boolean,
  effectiveMimeType: string
): string {
  if (originalFileName) {
    const fromOriginal = originalFileName.split(".").pop()?.toLowerCase();
    if (fromOriginal && fromOriginal !== "enc") return fromOriginal;
  }
  if (isEncrypted && effectiveMimeType) {
    const fromMime = extensionForAudioMime(effectiveMimeType);
    if (fromMime) return fromMime;
  }
  const fromUpload = fileName.split(".").pop()?.toLowerCase();
  if (fromUpload && fromUpload !== "enc") return fromUpload;
  if (assetType === "voice_sample") return "mp4";
  return "bin";
}
