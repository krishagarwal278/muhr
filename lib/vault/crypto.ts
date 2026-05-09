// Browser-only vault encryption helpers (AES-256-GCM + PBKDF2 wrapping key)

export type VaultEncryptionMetadataV1 = {
  encryption_version: 1;
  encryption_alg: "AES-256-GCM";
  encryption_iv_b64: string;
  wrapped_data_key_b64: string;
  wrapped_key_iv_b64: string;
  wrapped_key_salt_b64: string;
  original_file_name: string;
  original_mime_type: string;
};

function assertBrowserCrypto(): Crypto {
  if (typeof window === "undefined" || !window.crypto?.subtle) {
    throw new Error("WebCrypto is not available in this environment");
  }
  return window.crypto;
}

function b64Encode(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function b64Decode(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function randomBytes(n: number): Uint8Array {
  const c = assertBrowserCrypto();
  const b = new Uint8Array(n);
  c.getRandomValues(b);
  return b;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

async function deriveWrappingKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const c = assertBrowserCrypto();
  const enc = new TextEncoder();
  const baseKey = await c.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, [
    "deriveKey",
  ]);
  // Chosen to be “slow enough” for MVP while still usable in-browser.
  const iterations = 310_000;
  return await c.subtle.deriveKey(
    { name: "PBKDF2", salt: toArrayBuffer(salt), iterations, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptFileWithVaultPassword(
  file: File,
  password: string
): Promise<{ encryptedFile: File; meta: VaultEncryptionMetadataV1 }> {
  if (!password || password.trim().length < 8) {
    throw new Error("Vault password must be at least 8 characters");
  }

  const c = assertBrowserCrypto();

  const dataKey = await c.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, [
    "encrypt",
    "decrypt",
  ]);
  const rawDataKey = new Uint8Array(await c.subtle.exportKey("raw", dataKey));

  const wrappedKeySalt = randomBytes(16);
  const wrappedKeyIv = randomBytes(12);
  const wrappingKey = await deriveWrappingKey(password, wrappedKeySalt);

  const wrappedDataKeyBuf = await c.subtle.encrypt(
    { name: "AES-GCM", iv: toArrayBuffer(wrappedKeyIv) },
    wrappingKey,
    toArrayBuffer(rawDataKey)
  );
  const wrappedDataKey = new Uint8Array(wrappedDataKeyBuf);

  const encryptionIv = randomBytes(12);
  const plain = new Uint8Array(await file.arrayBuffer());
  const cipherBuf = await c.subtle.encrypt({ name: "AES-GCM", iv: toArrayBuffer(encryptionIv) }, dataKey, plain);

  // Preserve the original mime type so storage rules that whitelist image/* still accept ciphertext.
  // (This does not weaken encryption; it only changes the Content-Type header.)
  const encryptedBlob = new Blob([cipherBuf], { type: file.type || "application/octet-stream" });
  const encryptedName = `${file.name}.enc`;
  const encryptedFile = new File([encryptedBlob], encryptedName, { type: file.type || "application/octet-stream" });

  return {
    encryptedFile,
    meta: {
      encryption_version: 1,
      encryption_alg: "AES-256-GCM",
      encryption_iv_b64: b64Encode(encryptionIv),
      wrapped_data_key_b64: b64Encode(wrappedDataKey),
      wrapped_key_iv_b64: b64Encode(wrappedKeyIv),
      wrapped_key_salt_b64: b64Encode(wrappedKeySalt),
      original_file_name: file.name,
      original_mime_type: file.type || "application/octet-stream",
    },
  };
}

export async function decryptToBlobWithVaultPassword(args: {
  ciphertext: ArrayBuffer;
  password: string;
  meta: VaultEncryptionMetadataV1;
}): Promise<Blob> {
  const { ciphertext, password, meta } = args;
  const c = assertBrowserCrypto();

  const salt = b64Decode(meta.wrapped_key_salt_b64);
  const wrappedKeyIv = b64Decode(meta.wrapped_key_iv_b64);
  const wrappedDataKey = b64Decode(meta.wrapped_data_key_b64);
  const wrappingKey = await deriveWrappingKey(password, salt);

  const rawDataKeyBuf = await c.subtle.decrypt(
    { name: "AES-GCM", iv: toArrayBuffer(wrappedKeyIv) },
    wrappingKey,
    toArrayBuffer(wrappedDataKey)
  );
  const rawDataKey = new Uint8Array(rawDataKeyBuf);

  const dataKey = await c.subtle.importKey("raw", rawDataKey, { name: "AES-GCM" }, false, [
    "decrypt",
  ]);
  const encryptionIv = b64Decode(meta.encryption_iv_b64);

  const plainBuf = await c.subtle.decrypt(
    { name: "AES-GCM", iv: toArrayBuffer(encryptionIv) },
    dataKey,
    ciphertext
  );
  return new Blob([plainBuf], { type: meta.original_mime_type || "application/octet-stream" });
}

