export type LicenseRequestStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "expired"
  | "withdrawn";

export type LicenseRequestRow = {
  id: string;
  creator_id: string;
  /** Set when the brand account is linked to this request (RLS / messaging). */
  brand_user_id?: string | null;
  brand_email: string;
  brand_name: string;
  brand_company: string | null;
  brand_website: string | null;
  intended_use: string;
  channels: string[];
  territories: string[];
  duration_days: number;
  budget_inr: number | null;
  agreed_budget_inr?: number | null;
  status: LicenseRequestStatus;
  decline_reason: string | null;
  created_at: string;
  responded_at: string | null;
  expires_at: string;
  request_token: string;
  /** TipTap / ProseMirror JSON document */
  contract_body?: unknown | null;
  contract_updated_at?: string | null;
  creator_signed_contract_at?: string | null;
  brand_signed_contract_at?: string | null;
  /** Brand completed payment step; required before signing / contract in force. */
  brand_payment_cleared_at?: string | null;
  /** Set when payment is cleared and both parties have signed; terms in force from this time. */
  contract_effective_at?: string | null;
  creator_signatory_name?: string | null;
  brand_signatory_name?: string | null;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
  cancellation_note?: string | null;
};
