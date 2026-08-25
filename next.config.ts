import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every route is static and media is served from R2, so the site needs no
  // server runtime — `next build` emits plain files into out/.
  output: "export",
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
    unoptimized: true,
  },
};

export default nextConfig;
