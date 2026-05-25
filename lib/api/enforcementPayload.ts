import { dataFromApiJson } from "@/lib/api/response";

export type EnforcementCaseRow = {
  id: string;
  platform: string;
  url: string;
  description: string;
  status: "open" | "in_progress" | "resolved" | "rejected";
  created_at: string;
};

export type EnforcementListPayload = {
  cases?: EnforcementCaseRow[];
  open?: EnforcementCaseRow[];
  inProgress?: EnforcementCaseRow[];
  resolved?: EnforcementCaseRow[];
};

export function enforcementListFromApiJson(json: unknown): EnforcementListPayload | null {
  return dataFromApiJson<EnforcementListPayload>(json);
}

export function enforcementCreateFromApiJson(json: unknown): {
  message?: string;
  case?: EnforcementCaseRow;
} | null {
  return dataFromApiJson<{ message?: string; case?: EnforcementCaseRow }>(json);
}
