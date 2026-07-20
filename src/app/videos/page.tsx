import Link from "next/link";
import { getVideos } from "@/lib/videos";

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
