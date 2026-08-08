import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

initOpenNextCloudflareForDev();

const mediaUpstream = (
  process.env.R2_MEDIA_UPSTREAM ||
  process.env.R2_CDN_URL ||
  "https://pub-61e673eb650a4aae97101bc4eb2334df.r2.dev"
).replace(/\/$/, "");

const nextConfig: NextConfig = {
  // The HTML5-UP template's SCSS still uses @import and legacy global
  // functions (mix, darken, if, ...). Silence the Dart Sass deprecation
  // warnings until the styles are migrated to @use/@forward.
  sassOptions: {
    silenceDeprecations: [
      "import",
      "global-builtin",
      "color-functions",
      "if-function",
      "slash-div",
    ],
  },
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
    // fallback: serve public/media/* first; proxy to R2 only if missing
    return {
      fallback: [
        {
          source: "/media/:path*",
          destination: `${mediaUpstream}/:path*`,
        },
      ],
    };
  },
};

export default nextConfig;
