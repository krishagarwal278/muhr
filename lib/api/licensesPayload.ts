import type { LicenseRequestRow } from "@/types/license";
import { dataFromApiJson } from "@/lib/api/response";

export type LicenseListCounts = {
  pending: number;
  accepted: number;
  declined: number;
  withdrawn: number;
};

export type LicenseListPayload = {
  incomingRequests?: LicenseRequestRow[];
  respondedRequests?: LicenseRequestRow[];
  withdrawnRequests?: LicenseRequestRow[];
  counts?: LicenseListCounts;
};

export function licensesListFromApiJson(json: unknown): LicenseListPayload | null {
  return dataFromApiJson<LicenseListPayload>(json);
}
