import type { VideoMeta } from "@/lib/videos";

export default function VideoPlayer({ video }: { video: VideoMeta }) {
  return (
    <div style={{ paddingTop: "1em" }}>
      <div>{video.year}</div>
      <div>{video.description}</div>
      <video
        key={video.link}
        src={video.link}
        controls
        playsInline
        preload="metadata"
        style={{ width: "100%", maxWidth: "1200px", height: "auto" }}
      />
    </div>
  );
}
