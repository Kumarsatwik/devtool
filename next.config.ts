import type { NextConfig } from "next";
import { toolRedirects } from "./src/lib/tool-redirects";

const nextConfig: NextConfig = {
  // A stray pnpm-lock.yaml in the home directory makes Next infer that as the
  // workspace root; pin it to this project instead.
  turbopack: {
    root: __dirname,
  },
  async redirects() {
    return toolRedirects;
  },
};

export default nextConfig;
