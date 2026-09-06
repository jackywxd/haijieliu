import { mediaUrl } from "./config";
import rawVideos from "@/content/videos.json";
import videoMedia from "@/content/video-media.json";

export type VideoMeta = {
  year: number;
  link: string;
  description: string;
  poster?: string;
  width?: number;
  height?: number;
  durationSeconds?: number;
  /** ISO 8601 date. Required by schema.org VideoObject. */
  uploadDate: string;
};

// The memorial videos are published for the anniversary of Haijie's death,
// Aug 28 (see src/components/Timeline.tsx and the About page). Encode
// timestamps on the local MP4s cluster in the days just before it, so the
// anniversary is the closest defensible publication date — the MP4s are
// gitignored, so there is no commit history to read a real one from.
const ANNIVERSARY_MONTH_DAY = "08-28";

// Keyed by MP4 filename, which is what scripts/generate-video-posters.mjs
// records — videos.json addresses the same files by path.
const mediaByFile = new Map(videoMedia.map((m) => [m.file, m]));

function normalizeLink(link: string): string {
  return link.startsWith("http") ? link : mediaUrl(link);
}

function fileNameOf(link: string): string {
  return link.split("/").pop() ?? link;
}

export function getVideos(): VideoMeta[] {
  return rawVideos.map((item) => {
    const media = mediaByFile.get(fileNameOf(item.link));
    return {
      year: item.year,
      description: item.description,
      link: normalizeLink(item.link),
      poster: media?.poster ? mediaUrl(media.poster) : undefined,
      width: media?.width ?? undefined,
      height: media?.height ?? undefined,
      durationSeconds: media?.durationSeconds ?? undefined,
      uploadDate: `${item.year}-${ANNIVERSARY_MONTH_DAY}`,
    };
  });
}

export function getVideoByYear(year: number): VideoMeta | undefined {
  return getVideos().find((v) => v.year === year);
}

/** schema.org expects an ISO 8601 duration, e.g. 272s -> "PT4M32S". */
export function isoDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `PT${m > 0 ? `${m}M` : ""}${s}S`;
}
