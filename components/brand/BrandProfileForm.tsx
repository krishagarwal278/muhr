"use client";

import { useEffect, useState } from "react";
import { BrandVerificationDocuments } from "./BrandVerificationDocuments";
import { Alert } from "@/components/ui/alert";
import { FormField } from "@/components/ui/form-field";
import { FormInput } from "@/components/ui/form-input";
import { FormSelect } from "@/components/ui/form-select";
import { SectionCard } from "@/components/ui/section-card";
import { solidButtonVariants } from "@/components/ui/button-recipes";
import {
  type BrandProfileValues,
  type BrandVerificationDocument,
  validateBrandProfile,
  validateBrandVerificationDocuments,
} from "@/lib/brand/profile";
import {
  buildPhoneE164,
  parsePhoneE164,
  PHONE_COUNTRY_CODES,
} from "@/lib/profile/basics";
import { cx } from "@/lib/cx";

const emptyValues: BrandProfileValues = {
  companyName: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  pinCode: "",
  primaryEmail: "",
  secondaryEmail: "",
  phone: "",
  repName: "",
  repEmail: "",
};

export function BrandProfileForm({
  initial,
  documents: initialDocuments = [],
  onSubmit,
  onDocumentsChange,
  busy = false,
}: {
  initial?: Partial<BrandProfileValues>;
  documents?: BrandVerificationDocument[];
  onSubmit: (values: BrandProfileValues) => Promise<void>;
  onDocumentsChange?: (documents: BrandVerificationDocument[]) => void;
  busy?: boolean;
}) {
  const [values, setValues] = useState<BrandProfileValues>(emptyValues);
  const [countryCode, setCountryCode] = useState("+91");
  const [localPhone, setLocalPhone] = useState("");
  const [documents, setDocuments] = useState<BrandVerificationDocument[]>(initialDocuments);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setValues({ ...emptyValues, ...initial });
    if (initial?.phone) {
      const parsed = parsePhoneE164(initial.phone);
      setCountryCode(parsed.countryCode);
      setLocalPhone(parsed.localNumber);
    }
  }, [initial]);

  useEffect(() => {
    setDocuments(initialDocuments);
  }, [initialDocuments]);

  function updateField<K extends keyof BrandProfileValues>(key: K, value: BrandProfileValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const phone = buildPhoneE164(countryCode, localPhone);
    const payload: BrandProfileValues = {
      ...values,
      phone: phone ?? "",
    };

    const validationError = validateBrandProfile(payload);
    if (validationError) {
      setError(validationError);
      return;
    }

    const documentError = validateBrandVerificationDocuments(documents);
    if (documentError) {
      setError(documentError);
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(payload);
    } catch (err) {
      setError((err as Error)?.message ?? "Failed to save profile");
    } finally {
      setSubmitting(false);
    }
  }

  const disabled = busy || submitting;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error ? <Alert variant="error">{error}</Alert> : null}

      <SectionCard title="Company" required>
        <FormField label="Company name" required htmlFor="companyName">
          <FormInput
            id="companyName"
            value={values.companyName}
            onChange={(e) => updateField("companyName", e.target.value)}
            required
          />
        </FormField>
      </SectionCard>

      <SectionCard title="Registered address" required>
        <div className="grid gap-4">
          <FormField label="Address line 1" required htmlFor="addressLine1">
            <FormInput
              id="addressLine1"
              value={values.addressLine1}
              onChange={(e) => updateField("addressLine1", e.target.value)}
              required
            />
          </FormField>
          <FormField label="Address line 2" htmlFor="addressLine2">
            <FormInput
              id="addressLine2"
              value={values.addressLine2}
              onChange={(e) => updateField("addressLine2", e.target.value)}
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="City" htmlFor="city" required>
              <FormInput id="city" value={values.city} onChange={(e) => updateField("city", e.target.value)} required />
            </FormField>

            <FormField label="Pin / ZIP" htmlFor="pinCode" required>
              <FormInput
                id="pinCode"
                value={values.pinCode}
                onChange={(e) => updateField("pinCode", e.target.value.replace(/\D/g, "").slice(0, 10))}
                inputMode="numeric"
                required
              />
            </FormField>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Contacts" required>
        <div className="grid gap-4 lg:grid-cols-2">
          <FormField label="Primary email" required htmlFor="primaryEmail">
            <FormInput
              id="primaryEmail"
              type="email"
              autoComplete="email"
              value={values.primaryEmail}
              onChange={(e) => updateField("primaryEmail", e.target.value)}
              required
            />
          </FormField>
          <FormField label="Secondary email" htmlFor="secondaryEmail">
            <FormInput
              id="secondaryEmail"
              type="email"
              autoComplete="email"
              value={values.secondaryEmail}
              onChange={(e) => updateField("secondaryEmail", e.target.value)}
            />
          </FormField>
          <FormField label="Phone" required htmlFor="localPhone" className="lg:col-span-2">
            <div className="flex flex-col gap-2 sm:flex-row">
              <FormSelect
                aria-label="Country code"
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="sm:max-w-[11rem]"
              >
                {PHONE_COUNTRY_CODES.map((entry) => (
                  <option key={entry.code} value={entry.code}>
                    {entry.label}
                  </option>
                ))}
              </FormSelect>
              <FormInput
                id="localPhone"
                value={localPhone}
                onChange={(e) => setLocalPhone(e.target.value.replace(/\D/g, "").slice(0, 15))}
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder="Phone number"
                required
                className="flex-1"
              />
            </div>
          </FormField>
        </div>
      </SectionCard>

      <SectionCard title="Authorized representative">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Name" htmlFor="repName" required>
            <FormInput
              id="repName"
              required
              value={values.repName}
              onChange={(e) => updateField("repName", e.target.value)}
            />
          </FormField>
          <FormField label="Email" htmlFor="repEmail" required>
            <FormInput
              id="repEmail"
              type="email"
              autoComplete="email"
              required
              value={values.repEmail}
              onChange={(e) => updateField("repEmail", e.target.value)}
            />
          </FormField>
        </div>
      </SectionCard>

      <SectionCard title="Verification documents" required>
        <BrandVerificationDocuments
          documents={documents}
          disabled={disabled}
          onChange={(next) => {
            setDocuments(next);
            onDocumentsChange?.(next);
          }}
        />
      </SectionCard>

      <div className="flex flex-wrap items-center gap-3 border-t border-neutral-200/90 pt-6 pb-24">
        <button
          type="submit"
          disabled={disabled}
          className={cx(solidButtonVariants({ size: "lg" }), "min-w-[9rem]")}
        >
          {submitting ? "Saving…" : "Save profile"}
        </button>
      </div>
    </form>
  );
}
