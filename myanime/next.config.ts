import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
    unoptimized: true, // Skip Next.js image optimization for faster builds on Vercel
  },

  // Compress responses
  compress: true,

  async headers() {
    return [
      {
        source: "/api/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=60, stale-while-revalidate=300",
          },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "frame-src * blob: data:; frame-ancestors *;",
          },
          {
            key: "X-Frame-Options",
            value: "ALLOWALL",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
