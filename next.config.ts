import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

initOpenNextCloudflareForDev();

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
  },
  async redirects() {
    return [];
  },
};

export default nextConfig;
