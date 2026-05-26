import { webcrypto } from "crypto";

import type { VaultEncryptionMetadataV1 } from "@/lib/vault/crypto";

const subtle = webcrypto.subtle;

function b64Decode(b64: string): Uint8Array {
  return new Uint8Array(Buffer.from(b64, "base64"));
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

async function deriveWrappingKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const baseKey = await subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
  return subtle.deriveKey(
    { name: "PBKDF2", salt: toArrayBuffer(salt), iterations: 310_000, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/** Server-side decrypt (same algorithm as browser vault crypto). */
export async function decryptBufferWithVaultPassword(args: {
  ciphertext: Buffer;
  password: string;
  meta: VaultEncryptionMetadataV1;
}): Promise<Buffer> {
  const { ciphertext, password, meta } = args;
  if (!password || password.trim().length < 8) {
    throw new Error("Vault password must be at least 8 characters");
  }

  const salt = b64Decode(meta.wrapped_key_salt_b64);
  const wrappedKeyIv = b64Decode(meta.wrapped_key_iv_b64);
  const wrappedDataKey = b64Decode(meta.wrapped_data_key_b64);
  const wrappingKey = await deriveWrappingKey(password, salt);

  const rawDataKeyBuf = await subtle.decrypt(
    { name: "AES-GCM", iv: toArrayBuffer(wrappedKeyIv) },
    wrappingKey,
    toArrayBuffer(wrappedDataKey),
  );
  const dataKey = await subtle.importKey("raw", new Uint8Array(rawDataKeyBuf), { name: "AES-GCM" }, false, [
    "decrypt",
  ]);
  const encryptionIv = b64Decode(meta.encryption_iv_b64);
  const plainBuf = await subtle.decrypt(
    { name: "AES-GCM", iv: toArrayBuffer(encryptionIv) },
    dataKey,
    toArrayBuffer(new Uint8Array(ciphertext)),
  );
  return Buffer.from(plainBuf);
}
