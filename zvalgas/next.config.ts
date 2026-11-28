import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // This app lives inside another repo; pin the root so Next doesn't pick the parent lockfile.
  turbopack: { root: path.resolve(".") },
};

export default nextConfig;
