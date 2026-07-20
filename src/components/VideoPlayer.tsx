"use client";

import { useEffect, useRef } from "react";
import videojs from "video.js";
import "video.js/dist/video-js.css";
import type { VideoMeta } from "@/lib/videos";

type VideoJsOptions = Parameters<typeof videojs>[1];
type VideoJsPlayer = ReturnType<typeof videojs>;

function VideoJS({
  options,
  onReady,
}: {
  options: VideoJsOptions;
  onReady?: (player: VideoJsPlayer) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<VideoJsPlayer | null>(null);

  useEffect(() => {
    if (!playerRef.current && videoRef.current) {
      const player = videojs(videoRef.current, options, () => {
        videojs.log("player is ready");
        onReady?.(player);
      });
      playerRef.current = player;
    }
  }, [options, onReady]);

  useEffect(() => {
    const player = playerRef.current;
    return () => {
      if (player) {
        player.dispose();
        playerRef.current = null;
      }
    };
  }, []);

  return (
    <div data-vjs-player>
      <video ref={videoRef} className="video-js vjs-big-play-centered" />
    </div>
  );
}

export default function VideoPlayer({ video }: { video: VideoMeta }) {
  const videoJsOptions: VideoJsOptions = {
    autoplay: true,
    controls: true,
    responsive: true,
    fluid: true,
    html5: {
      vhs: {
        overrideNative: !videojs.browser.IS_SAFARI,
      },
    },
    sources: [
      {
        src: video.link,
        type: "application/x-mpegURL",
      },
    ],
  };

  return (
    <div style={{ paddingTop: "1em" }}>
      <div>{video.year}</div>
      <div>{video.description}</div>
      <VideoJS options={videoJsOptions} />
    </div>
  );
}
