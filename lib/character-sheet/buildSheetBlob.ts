import type { CharacterSheetGenerateResponse } from "./types";
import { renderCharacterSheetToBlob } from "./renderSheetCanvas";

/** Build export/seal blob via fixed-size canvas (correct proportions, JPEG for size). */
export async function buildCharacterSheetPngBlob(
  generated: CharacterSheetGenerateResponse
): Promise<Blob> {
  if (generated.mode === "ai" && generated.imageUrl) {
    try {
      const imgRes = await fetch(generated.imageUrl);
      const aiBlob = await imgRes.blob();
      if (aiBlob.size <= 9 * 1024 * 1024) return aiBlob;
    } catch {
      /* fall through to canvas compose */
    }
  }

  return renderCharacterSheetToBlob(generated, generated.imageUrl, true);
}
