import type { NextConfig } from "next";
import { createApiProxyRewrites } from "./src/lib/api-proxy";

const nextConfig: NextConfig = {
  async rewrites() {
    return createApiProxyRewrites(process.env);
  },
};

export default nextConfig;
