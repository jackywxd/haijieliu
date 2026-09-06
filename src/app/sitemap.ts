import type { MetadataRoute } from "next";
import { getVideos } from "@/lib/videos";

const BASE_URL = "https://haijieliu.com";

// Required by `output: export` — without it the route is treated as dynamic
// and the build fails rather than emitting a sitemap.xml file.
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = [
    // No trailing slash: Next normalizes the home page's canonical to a bare
    // https://haijieliu.com, and the sitemap must spell it the same way.
    "",
    "/about",
    "/journey",
    "/gallery",
    "/songs",
    "/message",
    "/videos",
  ].map((route) => ({
    // No lastModified: every URL previously carried the build timestamp, so a
    // deploy that changed nothing claimed every page had just changed. Google
    // discounts a lastmod it finds inaccurate, which costs more than omitting
    // it. These pages have no per-page modification date to report.
    url: `${BASE_URL}${route}`,
  }));

  // A video page's real content date is the anniversary it was published for.
  const videoRoutes = getVideos().map((video) => ({
    url: `${BASE_URL}/videos/${video.year}`,
    lastModified: video.uploadDate,
  }));

  return [...staticRoutes, ...videoRoutes];
}
