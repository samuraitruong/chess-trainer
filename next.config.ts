import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Use a separate build directory for agent builds to avoid clobbering .next used by dev server
  distDir: process.env.AGENT_BUILD === '1' ? '.next-agent' : '.next',
};

export default nextConfig;
