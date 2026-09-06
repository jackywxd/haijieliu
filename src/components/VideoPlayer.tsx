import type { VideoMeta } from "@/lib/videos";

export default function VideoPlayer({ video }: { video: VideoMeta }) {
  return (
    <div id="video-page">
      <h1 className="sr-only">
        {video.year} 年紀念影片 — Memorial Video for Haijie Liu
      </h1>
      <div className="video-meta">
        <div className="video-year">{video.year}</div>
        <div>{video.description}</div>
      </div>
      <video
        key={video.link}
        src={video.link}
        poster={video.poster}
        controls
        playsInline
        autoPlay
        preload="auto"
      />
    </div>
  );
}
