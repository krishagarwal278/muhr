/** Common dial codes for the profile basics form (India first). */
export const PHONE_COUNTRY_CODES = [
  { code: "+91", label: "India (+91)" },
  { code: "+1", label: "US / Canada (+1)" },
  { code: "+44", label: "UK (+44)" },
  { code: "+971", label: "UAE (+971)" },
  { code: "+65", label: "Singapore (+65)" },
  { code: "+61", label: "Australia (+61)" },
  { code: "+49", label: "Germany (+49)" },
  { code: "+33", label: "France (+33)" },
] as const;

export type ProfileAddressInput = {
  addressLine1: string;
  addressLine2?: string;
  addressCity: string;
  addressPinCode: string;
};

export type ProfileBasicsRow = {
  full_name?: string | null;
  phone?: string | null;
  address?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  address_city?: string | null;
  address_pin_code?: string | null;
  follower_count?: number | null;
  platform_license_signed?: boolean | null;
};

export function formatProfileAddress(row: ProfileBasicsRow | null | undefined): string {
  if (!row) return "";
  const line1 = typeof row.address_line1 === "string" ? row.address_line1.trim() : "";
  const line2 = typeof row.address_line2 === "string" ? row.address_line2.trim() : "";
  const city = typeof row.address_city === "string" ? row.address_city.trim() : "";
  const pin = typeof row.address_pin_code === "string" ? row.address_pin_code.trim() : "";
  const structured = [line1, line2, city, pin].filter(Boolean).join(", ");
  if (structured) return structured;
  return typeof row.address === "string" ? row.address.trim() : "";
}

export function parseProfileAddress(row: ProfileBasicsRow | null | undefined): ProfileAddressInput {
  const line1 = typeof row?.address_line1 === "string" ? row.address_line1.trim() : "";
  const line2 = typeof row?.address_line2 === "string" ? row.address_line2.trim() : "";
  const city = typeof row?.address_city === "string" ? row.address_city.trim() : "";
  const pin = typeof row?.address_pin_code === "string" ? row.address_pin_code.trim() : "";
  if (line1 || city || pin) {
    return {
      addressLine1: line1,
      addressLine2: line2,
      addressCity: city,
      addressPinCode: pin,
    };
  }
  const legacy = typeof row?.address === "string" ? row.address.trim() : "";
  return {
    addressLine1: legacy,
    addressLine2: "",
    addressCity: "",
    addressPinCode: "",
  };
}

export function isAddressComplete(row: ProfileBasicsRow | null | undefined): boolean {
  if (!row) return false;
  const line1 = typeof row.address_line1 === "string" ? row.address_line1.trim() : "";
  const city = typeof row.address_city === "string" ? row.address_city.trim() : "";
  const pin = typeof row.address_pin_code === "string" ? row.address_pin_code.trim() : "";
  return line1.length >= 1 && city.length >= 1 && isValidPinCode(pin);
}

export function isValidPinCode(pinCode: string): boolean {
  const trimmed = pinCode.trim();
  return /^\d{4,10}$/.test(trimmed);
}

export function buildAddressDbFields(input: ProfileAddressInput): {
  address_line1: string;
  address_line2: string | null;
  address_city: string;
  address_pin_code: string;
  address: string;
} {
  const addressLine1 = input.addressLine1.trim();
  const addressLine2 = input.addressLine2?.trim() ?? "";
  const addressCity = input.addressCity.trim();
  const addressPinCode = input.addressPinCode.trim();
  const address = [addressLine1, addressLine2, addressCity, addressPinCode].filter(Boolean).join(", ");
  return {
    address_line1: addressLine1,
    address_line2: addressLine2 || null,
    address_city: addressCity,
    address_pin_code: addressPinCode,
    address,
  };
}

export function isProfileBasicsComplete(row: ProfileBasicsRow | null | undefined): boolean {
  if (!row) return false;
  const name = typeof row.full_name === "string" ? row.full_name.trim() : "";
  const phone = typeof row.phone === "string" ? row.phone.trim() : "";
  const followers = row.follower_count;
  const licenseSigned = row.platform_license_signed === true;
  return (
    name.length > 0 &&
    isValidPhoneE164(phone) &&
    isAddressComplete(row) &&
    typeof followers === "number" &&
    followers > 0 &&
    licenseSigned
  );
}

export function isValidPhoneE164(phone: string): boolean {
  const normalized = normalizePhoneE164(phone);
  if (!normalized) return false;
  const digits = normalized.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15;
}

export function normalizePhoneE164(phone: string): string | null {
  const trimmed = phone.trim();
  if (!trimmed.startsWith("+")) return null;
  const digits = trimmed.slice(1).replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) return null;
  return `+${digits}`;
}

export function buildPhoneE164(countryCode: string, localNumber: string): string | null {
  const codeDigits = countryCode.replace(/\D/g, "");
  const localDigits = localNumber.replace(/\D/g, "");
  if (!codeDigits || localDigits.length < 6) return null;
  return normalizePhoneE164(`+${codeDigits}${localDigits}`);
}

export function parsePhoneE164(phone: string | null | undefined): {
  countryCode: string;
  localNumber: string;
} {
  const normalized = typeof phone === "string" ? normalizePhoneE164(phone) : null;
  if (!normalized) {
    return { countryCode: "+91", localNumber: "" };
  }

  const matched =
    PHONE_COUNTRY_CODES.find((entry) => normalized.startsWith(entry.code)) ??
    PHONE_COUNTRY_CODES[0];
  const localDigits = normalized.slice(matched.code.length).replace(/\D/g, "");
  return { countryCode: matched.code, localNumber: localDigits };
}

export function validateAddressInput(input: ProfileAddressInput): string | null {
  const line1 = input.addressLine1.trim();
  if (!line1) return "Address line 1 is required.";
  if (line1.length > 120) return "Address line 1 must be at most 120 characters.";

  const line2 = input.addressLine2?.trim() ?? "";
  if (line2.length > 120) return "Address line 2 must be at most 120 characters.";

  const city = input.addressCity.trim();
  if (!city) return "City is required.";
  if (city.length > 80) return "City must be at most 80 characters.";

  const pin = input.addressPinCode.trim();
  if (!pin) return "Pin code is required.";
  if (!isValidPinCode(pin)) return "Enter a valid pin code (4–10 digits).";

  return null;
}

export function isProfileBasicsPatch(body: Record<string, unknown>): boolean {
  return (
    "fullName" in body &&
    "phone" in body &&
    ("addressLine1" in body || "addressCity" in body || "addressPinCode" in body) &&
    "followerCount" in body
  );
}

export function validateProfileBasicsInput(input: {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  addressCity: string;
  addressPinCode: string;
  followerCount: number;
}): string | null {
  const name = input.fullName.trim();
  if (!name) return "Name is required.";
  if (name.length > 120) return "Name must be at most 120 characters.";

  const phone = input.phone.trim();
  if (!phone) return "Phone number is required.";
  if (!isValidPhoneE164(phone)) {
    return "Enter a valid phone number with country code.";
  }

  const addressError = validateAddressInput({
    addressLine1: input.addressLine1,
    addressLine2: input.addressLine2,
    addressCity: input.addressCity,
    addressPinCode: input.addressPinCode,
  });
  if (addressError) return addressError;

  if (!Number.isFinite(input.followerCount) || input.followerCount <= 0) {
    return "Follower count is required.";
  }
  if (input.followerCount > 500_000_000) {
    return "Follower count is too large.";
  }

  return null;
}
