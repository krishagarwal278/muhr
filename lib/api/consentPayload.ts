import { dataFromApiJson } from "@/lib/api/response";

export type ConsentRulesPayload = {
  channels: string[];
  territories: string[];
  blockedCategories: string[];
  allowVoiceSynthesis: boolean;
  allowFaceReenactment: boolean;
  requireApprovalPerUse: boolean;
  defaultDurationDays: number;
};

export function consentRulesFromApiJson(json: unknown): ConsentRulesPayload | null {
  return dataFromApiJson<ConsentRulesPayload>(json);
}
