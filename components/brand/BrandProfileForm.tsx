"use client";

import { useEffect, useState } from "react";
import { FormInput } from "@/components/ui/form-input";
import { solidButtonVariants } from "@/components/ui/button-recipes";
import { cx } from "@/lib/cx";

type BrandProfileValues = {
  companyName: string;
  addressLine1: string;
  addressLine2?: string;
  city?: string;
  pinCode?: string;
  primaryEmail: string;
  secondaryEmail: string;
  phone: string;
  repName?: string;
  repEmail?: string;
};

export function BrandProfileForm({
  initial,
  onSubmit,
  busy = false,
}: {
  initial?: Partial<BrandProfileValues>;
  onSubmit: (v: BrandProfileValues) => Promise<void>;
  busy?: boolean;
}) {
  const [companyName, setCompanyName] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [primaryEmail, setPrimaryEmail] = useState("");
  const [secondaryEmail, setSecondaryEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [repName, setRepName] = useState("");
  const [repEmail, setRepEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!initial) return;
    setCompanyName(initial.companyName ?? "");
    setAddressLine1(initial.addressLine1 ?? "");
    setAddressLine2(initial.addressLine2 ?? "");
    setCity(initial.city ?? "");
    setPinCode(initial.pinCode ?? "");
    setPrimaryEmail(initial.primaryEmail ?? "");
    setSecondaryEmail(initial.secondaryEmail ?? "");
    setPhone(initial.phone ?? "");
    setRepName(initial.repName ?? "");
    setRepEmail(initial.repEmail ?? "");
  }, [initial]);

  function validate(): string | null {
    if (!companyName.trim()) return "Company name is required.";
    if (!addressLine1.trim()) return "Address line 1 is required.";
    if (!primaryEmail.trim() || !primaryEmail.includes("@")) return "A valid primary email is required.";
    if (!secondaryEmail.trim() || !secondaryEmail.includes("@")) return "A valid secondary email is required.";
    if (!phone.trim()) return "A contact phone number is required.";
    if (repEmail && repEmail.trim() && !repEmail.includes("@")) return "Representative email is invalid.";
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const v: BrandProfileValues = {
      companyName: companyName.trim(),
      addressLine1: addressLine1.trim(),
      addressLine2: addressLine2.trim(),
      city: city.trim(),
      pinCode: pinCode.trim(),
      primaryEmail: primaryEmail.trim(),
      secondaryEmail: secondaryEmail.trim(),
      phone: phone.trim(),
      repName: repName.trim(),
      repEmail: repEmail.trim(),
    };

    const err = validate();
    if (err) {
      setError(err);
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(v);
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to save");
    } finally {
      setSubmitting(false);
    }
  }

  const disabled = busy || submitting;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">{error}</p> : null}

      <div>
        <label className="mb-1.5 block text-sm font-medium text-neutral-900">Company name <span className="text-red-600">*</span></label>
        <FormInput value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
      </div>

      <fieldset className="space-y-4">
        <legend className="mb-1 block text-sm font-medium text-neutral-900">Registered address</legend>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-900">Line 1 <span className="text-red-600">*</span></label>
          <FormInput value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} required />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-900">Line 2</label>
          <FormInput value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-900">City</label>
            <FormInput value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-900">Pin / ZIP</label>
            <FormInput value={pinCode} onChange={(e) => setPinCode(e.target.value)} />
          </div>
        </div>
      </fieldset>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-neutral-900">Primary contact email <span className="text-red-600">*</span></label>
        <FormInput value={primaryEmail} onChange={(e) => setPrimaryEmail(e.target.value)} type="email" required />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-neutral-900">Secondary contact email <span className="text-red-600">*</span></label>
        <FormInput value={secondaryEmail} onChange={(e) => setSecondaryEmail(e.target.value)} type="email" required />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-neutral-900">Phone <span className="text-red-600">*</span></label>
        <FormInput value={phone} onChange={(e) => setPhone(e.target.value)} required />
      </div>

      <fieldset className="space-y-4">
        <legend className="mb-1 block text-sm font-medium text-neutral-900">Representative</legend>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-900">Name</label>
          <FormInput value={repName} onChange={(e) => setRepName(e.target.value)} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-900">Email</label>
          <FormInput value={repEmail} onChange={(e) => setRepEmail(e.target.value)} type="email" />
        </div>
      </fieldset>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-neutral-900">Verification documents</label>
        <p className="mb-2 text-xs text-neutral-600">Upload government-registered filings like MCA (India) or equivalent. You’ll be prompted to select files after saving — uploads are stored in Vault.</p>
        <p className="text-xs text-neutral-600">(This UI saves the metadata and triggers the file upload flow from the brand vault.)</p>
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={disabled} className={cx(solidButtonVariants({ size: "lg" }), "w-full sm:w-auto")}>
          {submitting ? "Saving…" : "Save profile"}
        </button>
      </div>
    </form>
  );
}
