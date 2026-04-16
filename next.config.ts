import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    // Injected at build time so the client cache auto-evicts after each deploy
    NEXT_PUBLIC_BUILD_ID: process.env.VERCEL_DEPLOYMENT_ID ?? Date.now().toString(),
  },
};

export default nextConfig;
