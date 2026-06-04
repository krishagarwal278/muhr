const ALLOWED_AUDIO_BASE = new Set(["audio/mpeg", "audio/mp4"]);

export function normalizeAudioMimeType(mime: string): string {
  return mime.split(";")[0]?.trim().toLowerCase() || "";
}

export function isAllowedVaultAudioMime(mime: string): boolean {
  return ALLOWED_AUDIO_BASE.has(normalizeAudioMimeType(mime));
}

/** In-browser recording: prefer MP4 (upload formats are MP3/MP4 only). */
export function preferredVoiceRecorderMimeType(): string | undefined {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") return undefined;
  const candidates = ["audio/mp4", "audio/mp4;codecs=mp4a"];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t));
}

export function mimeTypeFromFileName(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "mp3":
      return "audio/mpeg";
    case "mp4":
    case "m4a":
      return "audio/mp4";
    default:
      return "";
  }
}

export function extensionForAudioMime(mime: string): string {
  const base = normalizeAudioMimeType(mime);
  if (base === "audio/mp4") return "mp4";
  if (base === "audio/mpeg") return "mp3";
  return "mp3";
}

export const VOICE_SAMPLE_UPLOAD_ACCEPT = "audio/mpeg,audio/mp4,.mp3,.mp4,.m4a";
