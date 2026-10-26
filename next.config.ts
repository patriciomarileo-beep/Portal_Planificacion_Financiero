import type { NextConfig } from "next";
import { baselineHeaders } from "./app/security-headers";
const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  outputFileTracingIncludes: { "/data/*": ["./private-data/assets/**/*"] },
  async headers() {
    return [{ source: "/:path*", headers: Object.entries(baselineHeaders()).map(([key, value]) => ({ key, value })) }];
  },
};
export default nextConfig;
