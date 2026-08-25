import type { VideoMeta } from "@/lib/videos";

export default function VideoPlayer({ video }: { video: VideoMeta }) {
  return (
    <div id="video-page">
      <div className="video-meta">
        <div className="video-year">{video.year}</div>
        <div>{video.description}</div>
      </div>
      <video key={video.link} src={video.link} controls playsInline preload="metadata" />
    </div>
  );
}
