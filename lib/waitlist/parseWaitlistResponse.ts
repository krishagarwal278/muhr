import type { WaitlistResponse } from "@/types";

type WaitlistApiJson = {
  ok?: boolean;
  success?: boolean;
  message?: string;
  needsDetails?: boolean;
  code?: string;
  data?: {
    message?: string;
    needsDetails?: boolean;
  };
  error?: {
    code?: string;
    message?: string;
  };
};

/** Normalizes waitlist API envelopes (`ok`/`data`) and legacy `{ success, message }` shapes. */
export function parseWaitlistResponse(json: WaitlistApiJson, resOk: boolean): WaitlistResponse {
  if (resOk && (json.ok === true || json.success === true)) {
    return {
      success: true,
      message: json.data?.message ?? json.message ?? "",
      needsDetails: json.data?.needsDetails ?? json.needsDetails,
    };
  }

  return {
    success: false,
    message: json.error?.message ?? json.message ?? "Something went wrong.",
    code: json.error?.code ?? json.code,
  };
}
