import { describe, expect, it } from "vitest";
import {
  buildAddressDbFields,
  buildPhoneE164,
  formatProfileAddress,
  isAddressComplete,
  isProfileBasicsComplete,
  isProfileBasicsPatch,
  isValidPhoneE164,
  isValidPinCode,
  parsePhoneE164,
  validateAddressInput,
  validateProfileBasicsInput,
} from "./basics";

describe("profile basics", () => {
  it("builds E.164 phone numbers", () => {
    expect(buildPhoneE164("+91", "9876543210")).toBe("+919876543210");
    expect(buildPhoneE164("+1", "4155550100")).toBe("+14155550100");
  });

  it("validates complete profile rows with structured address", () => {
    expect(
      isProfileBasicsComplete({
        full_name: "Priya Sharma",
        phone: "+919876543210",
        address_line1: "12 Marine Drive",
        address_city: "Mumbai",
        address_pin_code: "400001",
        follower_count: 25000,
      })
    ).toBe(true);
    expect(
      isProfileBasicsComplete({
        full_name: "Priya Sharma",
        phone: "+919876543210",
        address: "Mumbai, Maharashtra, India",
        follower_count: 25000,
      })
    ).toBe(false);
    expect(
      isProfileBasicsComplete({
        full_name: "Priya Sharma",
        phone: "+919876543210",
        address_line1: "12 Marine Drive",
        address_city: "Mumbai",
        address_pin_code: "400001",
        follower_count: null,
      })
    ).toBe(false);
  });

  it("formats structured addresses", () => {
    expect(
      formatProfileAddress({
        address_line1: "12 Marine Drive",
        address_line2: "Colaba",
        address_city: "Mumbai",
        address_pin_code: "400001",
      })
    ).toBe("12 Marine Drive, Colaba, Mumbai, 400001");
  });

  it("validates pin codes and address input", () => {
    expect(isValidPinCode("400001")).toBe(true);
    expect(isValidPinCode("12")).toBe(false);
    expect(
      validateAddressInput({
        addressLine1: "12 Marine Drive",
        addressCity: "Mumbai",
        addressPinCode: "400001",
      })
    ).toBeNull();
    expect(isAddressComplete({ address_line1: "Flat 1", address_city: "Delhi", address_pin_code: "110001" })).toBe(true);
  });

  it("requires structured address fields for completion", () => {
    expect(
      isAddressComplete({
        address_line1: "Flat 1",
        address_city: "Delhi",
        address_pin_code: "110001",
      })
    ).toBe(true);
    expect(isAddressComplete({ address: "Mumbai, Maharashtra, India" })).toBe(false);
  });

  it("detects profile basics patch payloads", () => {
    expect(
      isProfileBasicsPatch({
        fullName: "Krish",
        phone: "+919876543210",
        addressLine1: "801 Sky Garden",
        addressCity: "Mumbai",
        addressPinCode: "400052",
        followerCount: 1000,
      })
    ).toBe(true);
  });

  it("validates required profile basics fields", () => {
    expect(
      validateProfileBasicsInput({
        fullName: "Krish",
        phone: "",
        addressLine1: "801 Sky Garden",
        addressCity: "Mumbai",
        addressPinCode: "400052",
        followerCount: 1000,
      })
    ).toBe("Phone number is required.");
    expect(
      validateProfileBasicsInput({
        fullName: "Krish",
        phone: "+919876543210",
        addressLine1: "801 Sky Garden",
        addressCity: "Mumbai",
        addressPinCode: "400052",
        followerCount: 0,
      })
    ).toBe("Follower count is required.");
  });

  it("parses stored phone numbers", () => {
    expect(parsePhoneE164("+919876543210")).toEqual({
      countryCode: "+91",
      localNumber: "9876543210",
    });
  });

  it("rejects invalid phone numbers", () => {
    expect(isValidPhoneE164("9876543210")).toBe(false);
    expect(isValidPhoneE164("+91987")).toBe(false);
  });

  it("validates form input", () => {
    expect(
      validateProfileBasicsInput({
        fullName: "A",
        phone: "+919876543210",
        addressLine1: "12 Marine Drive",
        addressCity: "Mumbai",
        addressPinCode: "400001",
        followerCount: 1000,
      })
    ).toBeNull();
    expect(
      validateProfileBasicsInput({
        fullName: "",
        phone: "+919876543210",
        addressLine1: "12 Marine Drive",
        addressCity: "Mumbai",
        addressPinCode: "400001",
        followerCount: 1000,
      })
    ).toBe("Name is required.");
  });

  it("builds address db fields", () => {
    expect(
      buildAddressDbFields({
        addressLine1: "12 Marine Drive",
        addressLine2: "Colaba",
        addressCity: "Mumbai",
        addressPinCode: "400001",
      })
    ).toEqual({
      address_line1: "12 Marine Drive",
      address_line2: "Colaba",
      address_city: "Mumbai",
      address_pin_code: "400001",
      address: "12 Marine Drive, Colaba, Mumbai, 400001",
    });
  });
});
