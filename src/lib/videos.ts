import { mediaUrl } from "./config";
import rawVideos from "@/content/videos.json";

export type VideoMeta = {
  year: number;
  link: string;
  description: string;
};

function normalizeLink(link: string): string {
  return link.startsWith("http") ? link : mediaUrl(link);
}

export function getVideos(): VideoMeta[] {
  return rawVideos.map((item) => ({
    year: item.year,
    description: item.description,
    link: normalizeLink(item.link),
  }));
}

export function getVideoByYear(year: number): VideoMeta | undefined {
  return getVideos().find((v) => v.year === year);
}
