/**
 * Next.js Configuration
 *
 * Enables standalone output for Docker deployment — Next.js bundles
 * all server dependencies into a self-contained folder that can run
 * without the full node_modules directory.
 */

import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Standalone output creates a minimal, self-contained build that includes
  // only the files needed to run the production server. This dramatically
  // reduces the Docker image size (from ~1GB to ~100MB).
  output: "standalone",
}

export default nextConfig
