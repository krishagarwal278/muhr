import { isValidPhoneE164 } from "@/lib/profile/basics";

export const BRAND_VERIFICATION_DOCUMENT_TYPES = [
  { type: "mca_registration", label: "MCA registration" },
  { type: "rep_aadhar", label: "Rep. Aadhaar" },
  { type: "tax_registration", label: "Tax / GST" },
] as const;

export type BrandVerificationDocumentType =
  (typeof BRAND_VERIFICATION_DOCUMENT_TYPES)[number]["type"];

/** At least this many document categories must have one or more uploads. */
export const BRAND_VERIFICATION_MIN_CATEGORIES = 2;

export const BRAND_VERIFICATION_MAX_BYTES = 10 * 1024 * 1024;

export const BRAND_VERIFICATION_ACCEPT = "application/pdf,image/jpeg,image/png";

const ALLOWED_MIMES = new Set(["application/pdf", "image/jpeg", "image/png"]);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

export type BrandProfileRow = {
  id?: string;
  user_id?: string;
  company_name: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  pin_code: string | null;
  primary_email: string | null;
  secondary_email: string | null;
  phone: string | null;
  rep_name: string | null;
  rep_email: string | null;
  created_at?: string;
  updated_at?: string;
};

export type BrandProfileValues = {
  companyName: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  pinCode: string;
  primaryEmail: string;
  secondaryEmail: string;
  phone: string;
  repName: string;
  repEmail: string;
};

export type BrandVerificationDocument = {
  id: string;
  documentType: BrandVerificationDocumentType;
  fileName: string;
  mimeType: string;
  fileSize: number;
  createdAt: string;
  downloadUrl: string | null;
};

export function isValidBrandEmail(email: string): boolean {
  const trimmed = email.trim();
  if (!trimmed || trimmed.length > 254) return false;
  return EMAIL_RE.test(trimmed);
}

export function isBrandVerificationMime(mime: string): boolean {
  return ALLOWED_MIMES.has(mime);
}

export function isBrandVerificationDocumentType(value: string): value is BrandVerificationDocumentType {
  return BRAND_VERIFICATION_DOCUMENT_TYPES.some((slot) => slot.type === value);
}

export function brandVerificationStoragePath(userId: string, documentId: string, fileName: string): string {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 80);
  return `${userId}/brand/verification/${documentId}-${safeName}`;
}

export function documentsForType(
  documents: BrandVerificationDocument[],
  type: BrandVerificationDocumentType
): BrandVerificationDocument[] {
  return documents.filter((doc) => doc.documentType === type);
}

export function filledVerificationCategoryCount(documents: BrandVerificationDocument[]): number {
  return BRAND_VERIFICATION_DOCUMENT_TYPES.filter((slot) =>
    documents.some((doc) => doc.documentType === slot.type)
  ).length;
}

export function validateBrandVerificationDocuments(documents: BrandVerificationDocument[]): string | null {
  const filled = filledVerificationCategoryCount(documents);
  if (filled < BRAND_VERIFICATION_MIN_CATEGORIES) {
    return "Upload files for at least 2 document types.";
  }
  return null;
}

export function brandVerificationTypeLabel(type: BrandVerificationDocumentType): string {
  return BRAND_VERIFICATION_DOCUMENT_TYPES.find((slot) => slot.type === type)?.label ?? type;
}

export function mapBrandProfileFromDb(row: Partial<BrandProfileRow> | null | undefined): Partial<BrandProfileValues> {
  if (!row) return {};
  return {
    companyName: row.company_name ?? "",
    addressLine1: row.address_line1 ?? "",
    addressLine2: row.address_line2 ?? "",
    city: row.city ?? "",
    pinCode: row.pin_code ?? "",
    primaryEmail: row.primary_email ?? "",
    secondaryEmail: row.secondary_email ?? "",
    phone: row.phone ?? "",
    repName: row.rep_name ?? "",
    repEmail: row.rep_email ?? "",
  };
}

export function mapBrandProfileToDb(values: BrandProfileValues): Omit<BrandProfileRow, "id" | "user_id" | "created_at" | "updated_at"> {
  return {
    company_name: values.companyName.trim(),
    address_line1: values.addressLine1.trim(),
    address_line2: values.addressLine2.trim() || null,
    city: values.city.trim() || null,
    pin_code: values.pinCode.trim() || null,
    primary_email: values.primaryEmail.trim().toLowerCase(),
    secondary_email: values.secondaryEmail.trim().toLowerCase(),
    phone: values.phone.trim(),
    rep_name: values.repName.trim() || null,
    rep_email: values.repEmail.trim().toLowerCase() || null,
  };
}

export function validateBrandProfile(values: BrandProfileValues): string | null {
  if (!values.companyName.trim()) return "Company name is required.";
  if (!values.addressLine1.trim()) return "Registered address is required.";
  if (!isValidBrandEmail(values.primaryEmail)) return "Enter a valid primary email.";
  if (!isValidBrandEmail(values.secondaryEmail)) return "Enter a valid secondary email.";
  if (values.primaryEmail.trim().toLowerCase() === values.secondaryEmail.trim().toLowerCase()) {
    return "Primary and secondary email must be different.";
  }
  if (!values.phone.trim()) return "Phone number is required.";
  if (!isValidPhoneE164(values.phone)) return "Enter a valid phone number with country code.";
  if (values.repEmail.trim() && !isValidBrandEmail(values.repEmail)) {
    return "Representative email is invalid.";
  }
  return null;
}

export const BRAND_PROFILE_MIGRATION_HINT =
  "Run migrations 032_brand_profiles.sql and 033_brand_verification_pdf_storage.sql against your Supabase project, then reload this page.";
