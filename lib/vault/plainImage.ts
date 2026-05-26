/** Detect JPEG / PNG / WebP from file magic (relaxed JPEG: FF D8). */
export function isPlainImageBuffer(buf: Buffer): boolean {
  if (buf.length < 3) return false;
  if (buf[0] === 0xff && buf[1] === 0xd8) return true;
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return true;
  if (
    buf.length >= 12 &&
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45
  ) {
    return true;
  }
  return false;
}

export function mimeFromImageBuffer(buf: Buffer, fallback?: string | null): string {
  if (buf[0] === 0x89) return "image/png";
  if (buf[0] === 0x52) return "image/webp";
  return fallback?.startsWith("image/") ? fallback : "image/jpeg";
}
