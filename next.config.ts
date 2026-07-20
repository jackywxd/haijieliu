import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

initOpenNextCloudflareForDev();

const mediaUpstream = (
  process.env.R2_MEDIA_UPSTREAM ||
  process.env.R2_CDN_URL ||
  "https://pub-61e673eb650a4aae97101bc4eb2334df.r2.dev"
).replace(/\/$/, "");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "media.haijieliu.com",
      },
      {
        protocol: "https",
        hostname: "pub-61e673eb650a4aae97101bc4eb2334df.r2.dev",
      },
    ],
    unoptimized: true,
  },
  async rewrites() {
    return [
      {
        source: "/media/:path*",
        destination: `${mediaUpstream}/:path*`,
      },
    ];
  },
};

export default nextConfig;
