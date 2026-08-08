import type { Metadata } from "next";
import Link from "next/link";
import { getVideos } from "@/lib/videos";

export const metadata: Metadata = {
  title: "Memorial Videos | In Loving Memory Haijie",
  description: "Yearly memorial videos in loving memory of Haijie.",
};

export default function VideosPage() {
  const videos = getVideos();

  return (
    <div
      style={{
        paddingTop: "1em",
        fontSize: 30,
        lineHeight: 2,
        margin: "auto",
      }}
    >
      <ul>
        {videos.map((video) => (
          <li key={video.year}>
            <Link href={`/videos/${video.year}`}>{video.year}</Link>
            <p>{video.description}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
