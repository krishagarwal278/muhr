import { afterEach, describe, expect, it } from "vitest";

import {
  getEmailSiteBaseUrl,
  getPublicShareableSiteBase,
  getPublicSiteBaseUrl,
  isLocalDevOrigin,
} from "@/lib/app/publicSiteUrl";

describe("isLocalDevOrigin", () => {
  it("detects localhost and 127.x", () => {
    expect(isLocalDevOrigin("http://localhost:3000")).toBe(true);
    expect(isLocalDevOrigin("http://127.0.0.1:3000")).toBe(true);
    expect(isLocalDevOrigin("https://www.muhr.app")).toBe(false);
  });
});

describe("getEmailSiteBaseUrl", () => {
  const env = process.env;

  afterEach(() => {
    process.env = { ...env };
  });

  it("defaults to www.muhr.app when env is unset", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;
    expect(getEmailSiteBaseUrl()).toBe("https://www.muhr.app");
  });

  it("ignores localhost NEXT_PUBLIC_SITE_URL", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
    delete process.env.NEXT_PUBLIC_APP_URL;
    expect(getEmailSiteBaseUrl()).toBe("https://www.muhr.app");
  });

  it("uses production NEXT_PUBLIC_SITE_URL when set", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://www.muhr.app/";
    delete process.env.NEXT_PUBLIC_APP_URL;
    expect(getEmailSiteBaseUrl()).toBe("https://www.muhr.app");
  });

  it("falls back from localhost SITE_URL to production APP_URL", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
    process.env.NEXT_PUBLIC_APP_URL = "https://app.muhr.app";
    expect(getEmailSiteBaseUrl()).toBe("https://app.muhr.app");
  });
});

describe("getPublicSiteBaseUrl", () => {
  const env = process.env;

  afterEach(() => {
    process.env = { ...env };
  });

  it("never returns localhost from env", () => {
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    expect(getPublicSiteBaseUrl(null)).toBe("https://muhr.app");
  });

  it("never returns localhost from request origin", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.NEXT_PUBLIC_SITE_URL;
    expect(getPublicSiteBaseUrl("http://localhost:3000")).toBe("https://muhr.app");
  });
});

describe("getPublicShareableSiteBase", () => {
  const env = process.env;

  afterEach(() => {
    process.env = { ...env };
  });

  it("never returns localhost from env when window is unavailable", () => {
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    expect(getPublicShareableSiteBase()).toBe("https://muhr.app");
  });
});
