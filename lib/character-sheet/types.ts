export type CharacterSheetStatus = "locked" | "ready" | "generating" | "sealed" | "failed";

export type CharacterSheetGenerationMode = "ai" | "compose";

export interface CharacterSheetStats {
  height: string;
  weight: string;
  chest: string;
  waist: string;
  hips: string;
  shoeSize: string;
}

export interface CharacterSheetPhotoRef {
  id: string;
  signedUrl: string;
}

export interface CharacterSheetStatusResponse {
  status: CharacterSheetStatus;
  eligible: boolean;
  photoCount: number;
  minPhotos: number;
  hasMeasurements: boolean;
  vaultAssetId: string | null;
  stats: CharacterSheetStats | null;
  generationMode: CharacterSheetGenerationMode | null;
  errorMessage: string | null;
  /** Sealed sheet stored with vault password encryption (pre-plaintext delivery). */
  legacyEncrypted?: boolean;
  /** Active license deliveries waiting on a brand-viewable copy. */
  pendingBrandDeliveries?: number;
}

export interface CharacterSheetGenerateResponse {
  mode: CharacterSheetGenerationMode;
  /** AI-generated sheet image URL (when mode is ai) */
  imageUrl?: string;
  stats: CharacterSheetStats;
  photos: CharacterSheetPhotoRef[];
  displayName: string;
}
