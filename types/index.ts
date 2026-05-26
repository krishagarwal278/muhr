export type KycStatus = "unverified" | "pending" | "verified" | "failed";

export type UserType = "creator" | "business";

export interface WaitlistEntry {
  id: string;
  email: string;
  user_type: UserType;
  created_at: string;
}

export interface WaitlistRequest {
  email: string;
  user_type: UserType;
}

export interface WaitlistResponse {
  success: boolean;
  message: string;
  /** Stable machine-readable code when `success` is false (optional). */
  code?: string;
  /** When true, client should collect Instagram + profession before welcome email. */
  needsDetails?: boolean;
}

export type IdentityVerificationFileKind =
  | "social_followers"
  | "social_age"
  | "social_location";

export interface ProfileCompletionResponse {
  percent: number;
  items: { id: string; label: string; complete: boolean; href?: string }[];
}

// Vault assets
export type AssetType = "face_photo" | "voice_sample" | "document" | "character_sheet";

export interface VaultAsset {
  id: string;
  user_id: string;
  asset_type: AssetType;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  hash_sha256?: string;
  /** Populated when DB columns exist; used by vault security badges */
  encryption_key_id?: string | null;
  encryption_version?: number | null;
  encryption_alg?: string | null;
  encryption_iv?: string | null;
  wrapped_data_key?: string | null;
  wrapped_key_iv?: string | null;
  wrapped_key_salt?: string | null;
  original_file_name?: string | null;
  original_mime_type?: string | null;
  transparency_log_url?: string | null;
  last_accessed_at?: string | null;
  /** Embeddings are stored server-side in pgvector; this is the public status only. */
  face_embedding_status?: "pending" | "ready" | "failed";
  face_embedding_model?: string | null;
  face_embedding_created_at?: string | null;
  /** Set when removed from active vault; stored unencrypted in archive. */
  archived_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UploadResponse {
  success: boolean;
  message: string;
  asset?: VaultAsset;
}
