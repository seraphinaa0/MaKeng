import type { NextConfig } from "next";
const config: NextConfig = {
  env: {
    NEXT_PUBLIC_MAKENG_DEMO: process.env.NEXT_PUBLIC_MAKENG_DEMO ?? "true",
  },
  serverExternalPackages: ["node:sqlite"],
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "same-origin" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};
export default config;
