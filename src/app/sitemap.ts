import type { MetadataRoute } from "next";
import { getVideos } from "@/lib/videos";

const BASE_URL = "https://haijieliu.com";

// Required by `output: export` — without it the route is treated as dynamic
// and the build fails rather than emitting a sitemap.xml file.
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = [
    "",
    "/about",
    "/journey",
    "/gallery",
    "/songs",
    "/message",
    "/videos",
  ].map((route) => ({
    url: `${BASE_URL}${route}`,
    lastModified: new Date(),
  }));

  const videoRoutes = getVideos().map((video) => ({
    url: `${BASE_URL}/videos/${video.year}`,
    lastModified: new Date(),
  }));

  return [...staticRoutes, ...videoRoutes];
}
