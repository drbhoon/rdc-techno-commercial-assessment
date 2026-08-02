import type { NextConfig } from "next";

// Mounted under /techno on the HR platform, at the root locally and on
// Railway. BASE_PATH is a build-time value — it must be passed as a build arg
// in Docker, not only at runtime.
const basePath = process.env.BASE_PATH || "";

const nextConfig: NextConfig = {
  ...(basePath ? { basePath } : {}),
  // Self-contained server bundle for the Docker image.
  output: "standalone",
  env: {
    // Exposes the prefix to client code via withBase() in src/lib/basePath.ts
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default nextConfig;
