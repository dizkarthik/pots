import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the dev badge away from the sidebar's sign-out row.
  devIndicators: { position: "bottom-right" },
};

export default nextConfig;
