import fs from "node:fs";
import path from "node:path";
import { load } from "js-yaml";
import { mediaUrl } from "./config";

export type VideoMeta = {
  year: number;
  link: string;
  description: string;
  appearance?: string;
};

type RawVideo = {
  year: number;
  link: string;
  description: string;
  appearance?: string;
};

export function getVideos(): VideoMeta[] {
  const filePath = path.join(process.cwd(), "src/content/videos.yaml");
  const raw = fs.readFileSync(filePath, "utf8");
  const items = load(raw) as RawVideo[];

  return items.map((item) => ({
    year: item.year,
    description: item.description,
    appearance: item.appearance,
    link: item.link.startsWith("http")
      ? item.link
      : mediaUrl(item.link.replace(/^\/videos\//, "videos/")),
  }));
}

export function getVideoByYear(year: number): VideoMeta | undefined {
  return getVideos().find((v) => v.year === year);
}
