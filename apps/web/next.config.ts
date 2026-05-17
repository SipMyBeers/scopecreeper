import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Deployed to Cloudflare Pages via @cloudflare/next-on-pages.
  output: "standalone",
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
