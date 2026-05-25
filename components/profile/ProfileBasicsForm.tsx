"use client";

import { useEffect, useState } from "react";
import {
  PHONE_COUNTRY_CODES,
  buildPhoneE164,
  parsePhoneE164,
  validateProfileBasicsInput,
} from "@/lib/profile/basics";
import { formatFollowerCount } from "@/lib/pricing/followers";
import { solidButtonVariants } from "@/components/ui/button-recipes";
import { cx } from "@/lib/cx";

export type ProfileBasicsValues = {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  addressCity: string;
  addressPinCode: string;
  followerCount: number | null;
  platformLicenseSigned?: boolean;
};

interface ProfileBasicsFormProps {
  initial?: Partial<ProfileBasicsValues & { address?: string }>;
  submitLabel?: string;
  onSubmit: (values: {
    fullName: string;
    phone: string;
    addressLine1: string;
    addressLine2: string;
    addressCity: string;
    addressPinCode: string;
    followerCount: number;
    platformLicenseSigned?: boolean;
  }) => Promise<void>;
  busy?: boolean;
  showLicenseCheckbox?: boolean;
}

export function ProfileBasicsForm({
  initial,
  submitLabel = "Continue",
  onSubmit,
  busy = false,
  showLicenseCheckbox = false,
}: ProfileBasicsFormProps) {
  const [fullName, setFullName] = useState(initial?.fullName ?? "");
  const [countryCode, setCountryCode] = useState("+91");
  const [localPhone, setLocalPhone] = useState("");
  const [addressLine1, setAddressLine1] = useState(initial?.addressLine1 ?? initial?.address ?? "");
  const [addressLine2, setAddressLine2] = useState(initial?.addressLine2 ?? "");
  const [addressCity, setAddressCity] = useState(initial?.addressCity ?? "");
  const [addressPinCode, setAddressPinCode] = useState(initial?.addressPinCode ?? "");
  const [followerText, setFollowerText] = useState("");
  const [licenseSigned, setLicenseSigned] = useState(initial?.platformLicenseSigned ?? false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setFullName(initial?.fullName ?? "");
    setAddressLine1(initial?.addressLine1 ?? initial?.address ?? "");
    setAddressLine2(initial?.addressLine2 ?? "");
    setAddressCity(initial?.addressCity ?? "");
    setAddressPinCode(initial?.addressPinCode ?? "");
    setLicenseSigned(initial?.platformLicenseSigned ?? false);
    if (initial?.phone) {
      const parsed = parsePhoneE164(initial.phone);
      setCountryCode(parsed.countryCode);
      setLocalPhone(parsed.localNumber);
    }
    if (typeof initial?.followerCount === "number" && initial.followerCount > 0) {
      setFollowerText(formatFollowerCount(initial.followerCount));
    }
  }, [
    initial?.fullName,
    initial?.phone,
    initial?.address,
    initial?.addressLine1,
    initial?.addressLine2,
    initial?.addressCity,
    initial?.addressPinCode,
    initial?.followerCount,
    initial?.platformLicenseSigned,
  ]);

  function parseFollowerInput(raw: string): number | null {
    const cleaned = raw.replace(/,/g, "").trim().toLowerCase();
    if (!cleaned) return null;
    if (cleaned.endsWith("m")) {
      const n = Number.parseFloat(cleaned.slice(0, -1));
      return Number.isFinite(n) && n > 0 ? Math.round(n * 1_000_000) : null;
    }
    if (cleaned.endsWith("k")) {
      const n = Number.parseFloat(cleaned.slice(0, -1));
      return Number.isFinite(n) && n > 0 ? Math.round(n * 1_000) : null;
    }
    const n = Number.parseInt(cleaned, 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const phone = buildPhoneE164(countryCode, localPhone);
    if (!localPhone.trim()) {
      setError("Phone number is required.");
      return;
    }
    if (!phone) {
      setError("Enter a valid phone number.");
      return;
    }

    if (!followerText.trim()) {
      setError("Follower count is required.");
      return;
    }
    const followerCount = parseFollowerInput(followerText);
    if (followerCount == null) {
      setError("Enter a valid follower count (e.g. 25000 or 25K).");
      return;
    }

    const validationError = validateProfileBasicsInput({
      fullName,
      phone,
      addressLine1,
      addressLine2,
      addressCity,
      addressPinCode,
      followerCount,
    });
    if (validationError) {
      setError(validationError);
      return;
    }

    if (showLicenseCheckbox && !licenseSigned) {
      setError("Please accept the platform license terms to continue.");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        fullName: fullName.trim(),
        phone,
        addressLine1: addressLine1.trim(),
        addressLine2: addressLine2.trim(),
        addressCity: addressCity.trim(),
        addressPinCode: addressPinCode.trim(),
        followerCount,
        ...(showLicenseCheckbox ? { platformLicenseSigned: licenseSigned } : {}),
      });
    } catch {
      setError("Could not save your details. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const disabled = busy || submitting;

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
          {error}
        </p>
      ) : null}

      <Field label="Full name" htmlFor="profile-full-name" required>
        <input
          id="profile-full-name"
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          maxLength={120}
          required
          autoComplete="name"
          placeholder="Your legal or professional name"
          className={inputClass}
          disabled={disabled}
        />
      </Field>

      <PhoneFields
        countryCode={countryCode}
        localPhone={localPhone}
        onCountryCodeChange={setCountryCode}
        onLocalPhoneChange={setLocalPhone}
        disabled={disabled}
        required
      />

      <fieldset className="space-y-4">
        <legend className="mb-1 block text-sm font-medium text-neutral-900">Address</legend>
        <Field label="Line 1" htmlFor="profile-address-line1" required>
          <input
            id="profile-address-line1"
            type="text"
            value={addressLine1}
            onChange={(e) => setAddressLine1(e.target.value)}
            maxLength={120}
            required
            autoComplete="address-line1"
            placeholder="House / flat / street"
            className={inputClass}
            disabled={disabled}
          />
        </Field>
        <Field label="Line 2 (optional)" htmlFor="profile-address-line2">
          <input
            id="profile-address-line2"
            type="text"
            value={addressLine2}
            onChange={(e) => setAddressLine2(e.target.value)}
            maxLength={120}
            autoComplete="address-line2"
            placeholder="Area, landmark"
            className={inputClass}
            disabled={disabled}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="City" htmlFor="profile-address-city" required>
            <input
              id="profile-address-city"
              type="text"
              value={addressCity}
              onChange={(e) => setAddressCity(e.target.value)}
              maxLength={80}
              required
              autoComplete="address-level2"
              placeholder="City"
              className={inputClass}
              disabled={disabled}
            />
          </Field>
          <Field label="Pin code" htmlFor="profile-address-pin" required>
            <input
              id="profile-address-pin"
              type="text"
              inputMode="numeric"
              value={addressPinCode}
              onChange={(e) => setAddressPinCode(e.target.value.replace(/\D/g, "").slice(0, 10))}
              maxLength={10}
              required
              autoComplete="postal-code"
              placeholder="e.g. 400001"
              className={inputClass}
              disabled={disabled}
            />
          </Field>
        </div>
      </fieldset>

      <Field label="Follower count" htmlFor="profile-followers" required>
        <input
          id="profile-followers"
          type="text"
          inputMode="numeric"
          value={followerText}
          onChange={(e) => setFollowerText(e.target.value)}
          required
          placeholder="e.g. 25000 or 25K"
          className={inputClass}
          disabled={disabled}
        />
        <p className="mt-1 text-xs text-neutral-600">
          Your primary social audience size — powers fee estimates on your dashboard.
        </p>
      </Field>

      {showLicenseCheckbox && (
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={licenseSigned}
            onChange={(e) => setLicenseSigned(e.target.checked)}
            className="mt-0.5 accent-neutral-950"
            disabled={disabled}
          />
          <span className="text-neutral-700">
            I agree to the{" "}
            <a
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-neutral-950 underline underline-offset-2 hover:no-underline"
            >
              Muhr platform license terms
            </a>
            <span className="text-red-600"> *</span>
          </span>
        </label>
      )}

      <button
        type="submit"
        disabled={disabled}
        className={cx(solidButtonVariants({ size: "lg" }), "w-full sm:w-auto")}
      >
        {submitting ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}

function PhoneFields({
  countryCode,
  localPhone,
  onCountryCodeChange,
  onLocalPhoneChange,
  disabled,
  required = false,
}: {
  countryCode: string;
  localPhone: string;
  onCountryCodeChange: (v: string) => void;
  onLocalPhoneChange: (v: string) => void;
  disabled: boolean;
  required?: boolean;
}) {
  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-neutral-900">
        Phone number
        {required ? <span className="text-red-600"> *</span> : null}
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <select
          id="profile-phone-code"
          value={countryCode}
          onChange={(e) => onCountryCodeChange(e.target.value)}
          className={`${inputClass} sm:max-w-[11rem]`}
          disabled={disabled}
          aria-label="Country code"
        >
          {PHONE_COUNTRY_CODES.map((entry) => (
            <option key={entry.code} value={entry.code}>
              {entry.label}
            </option>
          ))}
        </select>
        <input
          id="profile-phone-local"
          type="tel"
          inputMode="numeric"
          value={localPhone}
          onChange={(e) => onLocalPhoneChange(e.target.value.replace(/[^\d\s-]/g, ""))}
          required
          autoComplete="tel-national"
          placeholder="98765 43210"
          className={`${inputClass} flex-1`}
          disabled={disabled}
        />
      </div>
      <p className="mt-1 text-xs text-neutral-600">
        Include country code. We use this only for account and licensing coordination.
      </p>
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-black/10 bg-white px-4 py-2.5 text-sm text-neutral-950 outline-none focus:border-black/20 disabled:opacity-60";

function Field({
  label,
  htmlFor,
  children,
  required = false,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-neutral-900">
        {label}
        {required ? <span className="text-red-600"> *</span> : null}
      </label>
      {children}
    </div>
  );
}