/** Target length for uploaded voice samples (~2 minutes). */
export const MAX_VOICE_SAMPLE_MS = 120_000;
export const MIN_VOICE_SAMPLE_MS = 45_000;

/** Human-readable length requirement for UI copy. */
export const VOICE_SAMPLE_LENGTH_LABEL = "45 seconds to 2 minutes";

export function voiceSampleLengthRangeCompact(): string {
  return `${formatDurationMs(MIN_VOICE_SAMPLE_MS)}–${formatDurationMs(MAX_VOICE_SAMPLE_MS)}`;
}

export function formatDurationMs(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export async function getAudioDurationMs(file: File): Promise<number> {
  const url = URL.createObjectURL(file);
  try {
    return await new Promise((resolve, reject) => {
      const audio = new Audio();
      audio.preload = "metadata";
      audio.onloadedmetadata = () => {
        const sec = audio.duration;
        if (!Number.isFinite(sec) || sec <= 0) {
          reject(new Error("Could not read audio duration."));
          return;
        }
        resolve(sec * 1000);
      };
      audio.onerror = () => reject(new Error("Could not read audio file."));
      audio.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function validateVoiceSampleDurationMs(ms: number): string | null {
  if (ms < MIN_VOICE_SAMPLE_MS) {
    return `Too short to save — record at least ${formatDurationMs(MIN_VOICE_SAMPLE_MS)}.`;
  }
  if (ms > MAX_VOICE_SAMPLE_MS) {
    return `Too long to save — trim to ${formatDurationMs(MAX_VOICE_SAMPLE_MS)} or less.`;
  }
  return null;
}
