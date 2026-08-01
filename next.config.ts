import type { NextConfig } from "next";

/**
 * Static HTML export for PlanetHoster (no Node process required at runtime).
 * Images are unoptimized so export works without a Next image server.
 */
const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
};

export default nextConfig;
