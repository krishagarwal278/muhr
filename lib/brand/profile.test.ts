import { describe, expect, it } from "vitest";
import {
  brandVerificationStoragePath,
  brandVerificationTypeLabel,
  filledVerificationCategoryCount,
  isBrandVerificationDocumentType,
  isBrandVerificationMime,
  isValidBrandEmail,
  mapBrandProfileFromDb,
  mapBrandProfileToDb,
  validateBrandProfile,
  validateBrandVerificationDocuments,
  type BrandProfileValues,
  type BrandVerificationDocument,
} from "./profile";

const validProfile: BrandProfileValues = {
  companyName: "Acme India Pvt Ltd",
  addressLine1: "12 Marine Drive",
  addressLine2: "",
  city: "Mumbai",
  pinCode: "400001",
  primaryEmail: "legal@acme.in",
  secondaryEmail: "ops@acme.in",
  phone: "+919876543210",
  repName: "Priya Sharma",
  repEmail: "priya@acme.in",
};

function doc(
  type: BrandVerificationDocument["documentType"],
  id = "doc-1"
): BrandVerificationDocument {
  return {
    id,
    documentType: type,
    fileName: "file.pdf",
    mimeType: "application/pdf",
    fileSize: 1000,
    createdAt: "2026-05-31T00:00:00.000Z",
    downloadUrl: null,
  };
}

describe("brand profile validation", () => {
  it("accepts a complete profile", () => {
    expect(validateBrandProfile(validProfile)).toBeNull();
  });

  it("requires company name and address", () => {
    expect(validateBrandProfile({ ...validProfile, companyName: "  " })).toContain("Company name");
    expect(validateBrandProfile({ ...validProfile, addressLine1: "" })).toContain("address");
  });

  it("rejects duplicate primary and secondary email", () => {
    expect(
      validateBrandProfile({
        ...validProfile,
        primaryEmail: "same@acme.in",
        secondaryEmail: "SAME@acme.in",
      })
    ).toContain("different");
  });

  it("requires valid E.164 phone", () => {
    expect(validateBrandProfile({ ...validProfile, phone: "98765" })).toContain("phone");
  });

  it("validates optional representative email when present", () => {
    expect(validateBrandProfile({ ...validProfile, repEmail: "not-an-email" })).toContain(
      "Representative email"
    );
    expect(validateBrandProfile({ ...validProfile, repEmail: "" })).toBeNull();
  });
});

describe("brand verification documents", () => {
  it("recognizes allowed mime types and document slots", () => {
    expect(isBrandVerificationMime("application/pdf")).toBe(true);
    expect(isBrandVerificationMime("image/png")).toBe(true);
    expect(isBrandVerificationMime("text/plain")).toBe(false);
    expect(isBrandVerificationDocumentType("mca_registration")).toBe(true);
    expect(isBrandVerificationDocumentType("unknown")).toBe(false);
  });

  it("requires uploads in at least two categories", () => {
    expect(validateBrandVerificationDocuments([doc("mca_registration")])).toContain("2 document");
    expect(
      validateBrandVerificationDocuments([doc("mca_registration"), doc("tax_registration", "doc-2")])
    ).toBeNull();
  });

  it("counts filled categories and builds storage paths", () => {
    const documents = [doc("mca_registration"), doc("rep_aadhar", "doc-2")];
    expect(filledVerificationCategoryCount(documents)).toBe(2);
    expect(brandVerificationTypeLabel("tax_registration")).toBe("Tax / GST");
    expect(
      brandVerificationStoragePath("user-1", "doc-1", "My Cert (2024).pdf")
    ).toBe("user-1/brand/verification/doc-1-My-Cert-2024-.pdf");
  });
});

describe("brand profile db mapping", () => {
  it("maps between db row and form values", () => {
    const db = mapBrandProfileToDb(validProfile);
    expect(db.company_name).toBe("Acme India Pvt Ltd");
    expect(db.primary_email).toBe("legal@acme.in");
    expect(db.rep_email).toBe("priya@acme.in");

    expect(
      mapBrandProfileFromDb({
        company_name: "Acme India Pvt Ltd",
        address_line1: "12 Marine Drive",
        address_line2: null,
        city: "Mumbai",
        pin_code: "400001",
        primary_email: "legal@acme.in",
        secondary_email: "ops@acme.in",
        phone: "+919876543210",
        rep_name: "Priya Sharma",
        rep_email: "priya@acme.in",
      })
    ).toEqual(validProfile);
  });

  it("validates brand emails", () => {
    expect(isValidBrandEmail("user@example.com")).toBe(true);
    expect(isValidBrandEmail("bad")).toBe(false);
    expect(isValidBrandEmail("")).toBe(false);
  });
});
