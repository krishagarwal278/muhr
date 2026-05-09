import { formatDistanceStrict } from "date-fns";
import type {
  CreatorSecurityState,
  SecurityBadge,
  VaultAssetForSecurity,
} from "@/types/vault";

function livenessBadge(
  asset: VaultAssetForSecurity,
  creator: CreatorSecurityState
): SecurityBadge {
  const { kyc_status, kyc_verified_at } = creator;

  if (kyc_status !== "verified") {
    return {
      key: "liveness",
      state: "missing",
      label: "Liveness",
      tooltip: "Complete identity verification in Settings to enable this badge.",
    };
  }

  if (!kyc_verified_at) {
    return {
      key: "liveness",
      state: "pending",
      label: "Liveness",
      tooltip:
        "Your identity was verified after this asset was uploaded. Future uploads will be tied to verification.",
    };
  }

  const verifiedAt = new Date(kyc_verified_at).getTime();
  const uploadedAt = new Date(asset.created_at).getTime();

  if (verifiedAt <= uploadedAt) {
    return {
      key: "liveness",
      state: "verified",
      label: "Liveness",
      tooltip: "Your identity was verified via biometric liveness check at upload time.",
    };
  }

  return {
    key: "liveness",
    state: "pending",
    label: "Liveness",
    tooltip:
      "Your identity was verified after this asset was uploaded. Future uploads will be tied to verification.",
  };
}

function encryptedBadge(asset: VaultAssetForSecurity): SecurityBadge {
  if (asset.encryption_key_id) {
    return {
      key: "encrypted",
      state: "verified",
      label: "Encrypted",
      tooltip:
        "This asset is encrypted at rest with AES-256. Even Muhr cannot read it without your password.",
    };
  }
  return {
    key: "encrypted",
    state: "missing",
    label: "Encrypted",
    tooltip: "This asset is not yet encrypted. Re-upload to enable encryption.",
  };
}

function hashLoggedBadge(asset: VaultAssetForSecurity): SecurityBadge {
  if (asset.transparency_log_url) {
    return {
      key: "hash",
      state: "verified",
      label: "Hash logged",
      tooltip:
        "A cryptographic hash of this asset is recorded in a public log. Tampering is detectable.",
    };
  }
  return {
    key: "hash",
    state: "missing",
    label: "Hash logged",
    tooltip: "Hash logging is being set up. This badge will appear within 24 hours.",
  };
}

function lastAccessedBadge(asset: VaultAssetForSecurity): SecurityBadge {
  if (!asset.last_accessed_at) {
    return {
      key: "last_accessed",
      state: "verified",
      label: "Never accessed",
      tooltip:
        "This asset has never been accessed via a signed URL. Nobody outside Muhr has seen it.",
    };
  }

  const accessed = new Date(asset.last_accessed_at);
  const now = new Date();
  const label = formatDistanceStrict(accessed, now, { addSuffix: true });

  return {
    key: "last_accessed",
    state: "verified",
    label,
    tooltip: `Last accessed ${label} via a valid signed URL.`,
  };
}

/**
 * Pure helper — no I/O. Order: Encrypted, Liveness, Hash logged, Last accessed.
 */
export function computeSecurityBadges(
  asset: VaultAssetForSecurity,
  creator: CreatorSecurityState
): SecurityBadge[] {
  return [
    encryptedBadge(asset),
    livenessBadge(asset, creator),
    hashLoggedBadge(asset),
    lastAccessedBadge(asset),
  ];
}
