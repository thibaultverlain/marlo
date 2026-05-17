import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Compress responses
  compress: true,

  // External packages for server components
  serverExternalPackages: ["@react-pdf/renderer"],

  // Disable powered-by header (security + tiny perf)
  poweredByHeader: false,

  // Experimental optimizations
  experimental: {
    // Optimize package imports - tree shake icon libraries
    optimizePackageImports: ["lucide-react", "date-fns", "recharts"],
  },

  // Compiler optimizations
  compiler: {
    // Strip console.log in production (keep error/warn)
    removeConsole: process.env.NODE_ENV === "production" ? {
      exclude: ["error", "warn"],
    } : false,
  },
};

export default nextConfig;
