import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    const securityHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    ];
    const privateHeaders = [{ key: "Cache-Control", value: "private, no-store, max-age=0" }];
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/admin/:path*", headers: privateHeaders },
      { source: "/mypage/:path*", headers: privateHeaders },
      { source: "/checkout/:path*", headers: privateHeaders },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
};

export default nextConfig;
