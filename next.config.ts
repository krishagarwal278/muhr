import path from "node:path";
import { fileURLToPath } from "node:url";
import { withWorkflow } from "workflow/next";
import type { NextConfig } from "next";

/** Keeps Turbopack tied to this repo (avoids wrong root when a parent folder has another lockfile). */
const projectDir = path.dirname(fileURLToPath(import.meta.url));

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  turbopack: {
    root: projectDir,
  },
  // Mirrors `DEV_AUTH_BYPASS` for any client checks; forced empty when `NODE_ENV === "production"`.
  env: {
    NEXT_PUBLIC_DEV_AUTH_BYPASS:
      process.env.NODE_ENV === "production" ? "" : (process.env.DEV_AUTH_BYPASS ?? ""),
  },
  async headers() {
    const headers = [...securityHeaders];
    if (process.env.NODE_ENV === "production") {
      headers.push({
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      });
    }
    return [{ source: "/:path*", headers }];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/**",
      },
    ],
  },
};

export default withWorkflow(nextConfig);
