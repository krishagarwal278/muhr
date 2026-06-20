import type { RulesAndRatesPayload } from "@/lib/consent/rulesAndRates";

export type RateFieldKey =
  | "faceOnlyRateInr"
  | "voiceFaceRateInr"
  | "voiceOnlyRateInr"
  | "otherRateInr";

export const RATE_FIELDS: { key: RateFieldKey; label: string; hint: string }[] = [
  { key: "faceOnlyRateInr", label: "Face only", hint: "Likeness in AI video." },
  { key: "voiceFaceRateInr", label: "Voice + face", hint: "Likeness and voice together." },
  { key: "voiceOnlyRateInr", label: "Voice only", hint: "Synthetic voice, no face." },
  { key: "otherRateInr", label: "Other", hint: "Non-standard or custom uses." },
];

export type UsageRuleKey = keyof Pick<
  RulesAndRatesPayload,
  | "allowPaidSocial"
  | "allowBroadcast"
  | "allowPoliticalContent"
  | "allowAlcoholGambling"
  | "requireExclusivityOptIn"
  | "requireApprovalPerUse"
>;

export const USAGE_RULE_FIELDS: { key: UsageRuleKey; label: string; hint: string }[] = [
  { key: "allowPaidSocial", label: "Paid social", hint: "Permit Instagram, TikTok, YouTube ads, and similar." },
  { key: "allowBroadcast", label: "Broadcast / TV", hint: "Permit television and connected TV." },
  { key: "allowPoliticalContent", label: "Political content", hint: "Permit campaigns and advocacy." },
  { key: "allowAlcoholGambling", label: "Alcohol & gambling", hint: "Permit regulated categories." },
  {
    key: "requireExclusivityOptIn",
    label: "Exclusivity opt-in",
    hint: "Ask before any exclusive deal.",
  },
  {
    key: "requireApprovalPerUse",
    label: "Approval per use",
    hint: "Review each request individually.",
  },
];
