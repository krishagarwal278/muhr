export type LicensePaymentStatus =
  | "created"
  | "authorized"
  | "captured"
  | "failed"
  | "refunded";

export type CreatorPayoutStatus = "pending_manual" | "paid";

export type LicensePaymentSummary = {
  id: string;
  licenseRequestId: string;
  amountPaise: number;
  currency: string;
  status: LicensePaymentStatus;
  creatorPayoutStatus: CreatorPayoutStatus;
  rzpPaymentId: string | null;
  createdAt: string;
  updatedAt: string;
};
