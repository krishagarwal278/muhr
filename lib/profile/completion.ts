import type { KycStatus } from "@/types";

export const MIN_CHARACTER_PHOTOS = 5;
export const MAX_CHARACTER_PHOTOS = 5;

export type ProfileCompletionItemId =
  | "identity"
  | "character_photos"
  | "measurements"
  | "handle"
  | "pricing"
  | "consent_video"
  | "license_agreement";

export interface ProfileCompletionInput {
  kycStatus: KycStatus;
  identitySubmittedAt: string | null;
  characterPhotoCount: number;
  hasMeasurements: boolean;
  handle: string | null;
  hasPricing: boolean;
  consentVideoCompleted: boolean;
  platformLicenseSigned: boolean;
}

export interface ProfileCompletionItem {
  id: ProfileCompletionItemId;
  label: string;
  complete: boolean;
  href?: string;
}

export function buildProfileCompletionItems(
  data: ProfileCompletionInput
): ProfileCompletionItem[] {
  const identityComplete =
    data.kycStatus === "verified" ||
    data.kycStatus === "pending" ||
    !!data.identitySubmittedAt;

  return [
    {
      id: "identity",
      label: "Identity review",
      complete: identityComplete,
      href: "/settings#identity-verification",
    },
    {
      id: "character_photos",
      label: `Upload ${MIN_CHARACTER_PHOTOS} high-quality character photos`,
      complete: data.characterPhotoCount >= MIN_CHARACTER_PHOTOS,
      href: "/settings#complete-profile",
    },
    {
      id: "measurements",
      label: "Enter measurements",
      complete: data.hasMeasurements,
      href: "/settings#complete-profile",
    },
    {
      id: "handle",
      label: "Instagram handle",
      complete: !!data.handle?.trim(),
      href: "/settings",
    },
    {
      id: "pricing",
      label: "Set pricing",
      complete: data.hasPricing,
      href: "/settings",
    },
    {
      id: "consent_video",
      label: "Record consent video",
      complete: data.consentVideoCompleted,
      href: "/settings#complete-profile",
    },
    {
      id: "license_agreement",
      label: "Sign license agreement",
      complete: data.platformLicenseSigned,
      href: "/settings#complete-profile",
    },
  ];
}

export function profileCompletionPercent(items: ProfileCompletionItem[]): number {
  if (items.length === 0) return 0;
  const done = items.filter((i) => i.complete).length;
  return Math.round((done / items.length) * 100);
}

export function hasAllMeasurements(row: {
  height?: string | null;
  weight?: string | null;
  chest?: string | null;
  waist?: string | null;
  hips?: string | null;
  shoe_size?: string | null;
}): boolean {
  return ["height", "weight", "chest", "waist", "hips", "shoe_size"].every((k) => {
    const v = row[k as keyof typeof row];
    return typeof v === "string" && v.trim().length > 0;
  });
}
