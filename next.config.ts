import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produce a self-contained Node.js server for the production Docker image.
  output: "standalone",
};

export default nextConfig;
