import type { KycStatus } from "@/types";

/** Optional security columns (stub until wired in DB) */
export interface VaultAssetSecurityFields {
  encryption_key_id?: string | null;
  transparency_log_url?: string | null;
  last_accessed_at?: string | null;
}

/** Shape passed to computeSecurityBadges (subset of vault row + stubs) */
export interface VaultAssetForSecurity {
  id: string;
  created_at: string;
  hash_sha256?: string | null;
  encryption_key_id?: string | null;
  transparency_log_url?: string | null;
  last_accessed_at?: string | null;
}

export interface CreatorSecurityState {
  kyc_status: KycStatus;
  kyc_verified_at: string | null;
}

export type BadgeState = "verified" | "pending" | "missing" | "unknown";

export type SecurityBadgeKey = "encrypted" | "liveness" | "hash" | "last_accessed";

export interface SecurityBadge {
  key: SecurityBadgeKey;
  state: BadgeState;
  label: string;
  tooltip: string;
}
