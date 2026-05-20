import type { CharacterSheetStats } from "./types";

/** Prompt for image-to-image turnaround generation (fal / similar). */
export function buildCharacterSheetPrompt(stats: CharacterSheetStats): string {
  const statLine = [
    stats.height && `height ${stats.height}`,
    stats.weight && `weight ${stats.weight}`,
    stats.chest && `chest ${stats.chest}`,
    stats.waist && `waist ${stats.waist}`,
    stats.hips && `hips ${stats.hips}`,
    stats.shoeSize && `shoe ${stats.shoeSize}`,
  ]
    .filter(Boolean)
    .join(", ");

  return [
    "Professional character reference turnaround sheet for brand licensing.",
    "Clean white studio background, consistent lighting.",
    "Grid layout: front face close-up, left profile, right profile, back of head;",
    "waist-up front, waist-up profile, waist-up back.",
    "Photorealistic, same person in every panel, neutral expression.",
    statLine ? `Physical stats for accuracy: ${statLine}.` : "",
    "High resolution reference sheet, no text overlays, no watermarks.",
  ]
    .filter(Boolean)
    .join(" ");
}
