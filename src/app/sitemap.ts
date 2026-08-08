import type { MetadataRoute } from "next";
import { getVideos } from "@/lib/videos";

const BASE_URL = "https://haijieliu.com";

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
