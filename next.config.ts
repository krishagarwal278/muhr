import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // So client components can align with `DEV_AUTH_BYPASS` in middleware (same value in `.env`).
  env: {
    NEXT_PUBLIC_DEV_AUTH_BYPASS: process.env.DEV_AUTH_BYPASS ?? "",
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

export default nextConfig;
