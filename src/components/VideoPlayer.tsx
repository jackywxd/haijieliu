"use client";

import { useCallback, useEffect, useRef } from "react";
import type { VideoMeta } from "@/lib/videos";

// Mobile browsers stop a <video> element as soon as the tab is backgrounded or
// the screen locks — iOS Safari and Android Chrome both do it, and nothing on
// the video element itself opts out. What they *do* keep running is <audio>
// (that is how web radio survives a locked phone) and picture-in-picture.
//
// So this player keeps a silent shadow <audio> element pointed at the same
// file. When the page goes into the background mid-playback we hand the stream
// over to it: seek it to the video's position, start it, and pause the
// video. Coming back to the foreground reverses the swap. If the browser put
// the video into picture-in-picture instead, the video is already surviving on
// its own and the handoff is skipped.
//
// Two supporting details matter as much as the swap itself:
//   - iOS only lets an element play without a user gesture once that element
//     has played inside one, so the audio element is "primed" (play + immediate
//     pause) on the first interaction. Without this the background play() is
//     rejected and the sound just stops.
//   - The Media Session API is what puts the title and the play/pause/seek
//     controls on the lock screen, and it has to keep pointing at whichever
//     element is currently carrying the stream.

const SEEK_STEP_SECONDS = 10;

const ARTWORK = [
  { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
  { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
];

export default function VideoPlayer({ video }: { video: VideoMeta }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // The audio element is standing in for the video right now.
  const handedOffRef = useRef(false);
  // The viewer wants playback to continue. Kept separate from `video.paused`
  // because the browser pauses the video on backgrounding, which is exactly the
  // moment we need to know that playback was still wanted.
  const playIntentRef = useRef(false);
  // The audio element has played inside a user gesture at least once.
  const primedRef = useRef(false);

  // Whichever element currently carries the stream. Media Session handlers and
  // lock-screen controls have to act on this one, not always the video.
  const activeMedia = useCallback((): HTMLMediaElement | null => {
    return handedOffRef.current ? audioRef.current : videoRef.current;
  }, []);

  const setPlaybackState = useCallback((state: MediaSessionPlaybackState) => {
    if ("mediaSession" in navigator) navigator.mediaSession.playbackState = state;
  }, []);

  // Unlock the audio element for later gesture-less playback. play() followed
  // immediately by pause() never gets far enough to make a sound, but it does
  // spend the gesture, which is all iOS is looking for.
  const primeAudio = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || primedRef.current) return;
    primedRef.current = true;
    const started = audio.play();
    audio.pause();
    // pause() during startup rejects the play promise with AbortError; the
    // element counts as unlocked either way.
    if (started) started.catch(() => {});
  }, []);

  const handoffToAudio = useCallback(() => {
    const videoEl = videoRef.current;
    const audioEl = audioRef.current;
    if (!videoEl || !audioEl || handedOffRef.current) return;
    // A video that is playing right now wants to keep playing even if no play
    // event was ever seen — with autoPlay the event can land before hydration
    // attaches the listeners below.
    if (!playIntentRef.current && (videoEl.paused || videoEl.ended)) return;
    // Picture-in-picture already keeps the video itself alive in the
    // background, and swapping under it would leave a frozen frame on screen.
    if (document.pictureInPictureElement === videoEl) return;

    handedOffRef.current = true;
    const position = videoEl.currentTime;
    if (Number.isFinite(position)) audioEl.currentTime = position;

    const started = audioEl.play();
    // Pause the video in the same tick: the audio has not produced any sound
    // yet, so the swap is seamless rather than briefly doubled.
    videoEl.pause();

    if (started) {
      started.catch(() => {
        // Background playback was refused (typically an unprimed element on
        // iOS). Give the stream back so returning to the tab still works.
        handedOffRef.current = false;
        setPlaybackState("paused");
      });
    }
  }, [setPlaybackState]);

  const restoreToVideo = useCallback(() => {
    const videoEl = videoRef.current;
    const audioEl = audioRef.current;
    if (!videoEl || !audioEl || !handedOffRef.current) return;

    handedOffRef.current = false;
    const position = audioEl.currentTime;
    const wasPlaying = !audioEl.paused && !audioEl.ended;
    audioEl.pause();
    if (Number.isFinite(position)) videoEl.currentTime = position;

    if (wasPlaying && playIntentRef.current) {
      videoEl.play().catch(() => {});
    }
  }, []);

  // Handoff wiring: visibility, the browser's own pause, and picture-in-picture.
  useEffect(() => {
    const videoEl = videoRef.current;
    const audioEl = audioRef.current;
    if (!videoEl || !audioEl) return;

    // autoPlay starts the video during hydration, so its play event is often
    // already gone by the time this effect runs. Read the state instead, and
    // seed the lock screen from it for the same reason.
    playIntentRef.current = !videoEl.paused && !videoEl.ended;
    setPlaybackState(playIntentRef.current ? "playing" : "paused");

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        handoffToAudio();
      } else {
        restoreToVideo();
      }
    };

    const onVideoPlay = () => {
      playIntentRef.current = true;
      primeAudio();
      setPlaybackState("playing");
    };

    const onVideoPause = () => {
      // A pause that arrives while the page is hidden, or while the audio
      // element has already taken over, is the browser suspending the video —
      // not the viewer asking for silence — so the intent to play survives it.
      if (handedOffRef.current || document.visibilityState === "hidden") {
        // Safari can pause the video a moment before it reports the page as
        // hidden, so treat this as the trigger too.
        handoffToAudio();
        return;
      }
      playIntentRef.current = false;
      setPlaybackState("paused");
    };

    const onVideoEnded = () => {
      playIntentRef.current = false;
      setPlaybackState("none");
    };

    const onAudioEnded = () => {
      playIntentRef.current = false;
      handedOffRef.current = false;
      if (Number.isFinite(videoEl.duration)) videoEl.currentTime = videoEl.duration;
      setPlaybackState("none");
    };

    // If the browser moves the video into picture-in-picture after we have
    // already swapped (Android Chrome can do this when the user leaves the
    // app), hand the stream back so the floating window is not a still frame.
    const onEnterPip = () => restoreToVideo();
    const onLeavePip = () => {
      if (document.visibilityState === "hidden") handoffToAudio();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    videoEl.addEventListener("play", onVideoPlay);
    videoEl.addEventListener("pause", onVideoPause);
    videoEl.addEventListener("ended", onVideoEnded);
    videoEl.addEventListener("enterpictureinpicture", onEnterPip);
    videoEl.addEventListener("leavepictureinpicture", onLeavePip);
    audioEl.addEventListener("ended", onAudioEnded);
    // Autoplay with sound is blocked on mobile, so the first tap anywhere is
    // usually the one that starts the video — prime off it as well.
    document.addEventListener("pointerdown", primeAudio, { once: true });
    document.addEventListener("touchstart", primeAudio, { once: true });

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      videoEl.removeEventListener("play", onVideoPlay);
      videoEl.removeEventListener("pause", onVideoPause);
      videoEl.removeEventListener("ended", onVideoEnded);
      videoEl.removeEventListener("enterpictureinpicture", onEnterPip);
      videoEl.removeEventListener("leavepictureinpicture", onLeavePip);
      audioEl.removeEventListener("ended", onAudioEnded);
      document.removeEventListener("pointerdown", primeAudio);
      document.removeEventListener("touchstart", primeAudio);
      audioEl.pause();
      handedOffRef.current = false;
      playIntentRef.current = false;
    };
  }, [handoffToAudio, primeAudio, restoreToVideo, setPlaybackState]);

  // Lock-screen / notification-shade controls. Without these the phone shows a
  // nameless stream and the hardware buttons do nothing once the tab is hidden.
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    const session = navigator.mediaSession;

    session.metadata = new MediaMetadata({
      title: `Haijie ${video.year}`,
      artist: video.description,
      album: "In Loving Memory Haijie",
      artwork: ARTWORK,
    });

    const seekBy = (offset: number) => {
      const media = activeMedia();
      if (!media) return;
      const duration = Number.isFinite(media.duration) ? media.duration : Infinity;
      media.currentTime = Math.min(Math.max(media.currentTime + offset, 0), duration);
    };

    const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      [
        "play",
        () => {
          playIntentRef.current = true;
          activeMedia()?.play().catch(() => {});
        },
      ],
      [
        "pause",
        () => {
          playIntentRef.current = false;
          activeMedia()?.pause();
          setPlaybackState("paused");
        },
      ],
      ["seekbackward", (details) => seekBy(-(details.seekOffset ?? SEEK_STEP_SECONDS))],
      ["seekforward", (details) => seekBy(details.seekOffset ?? SEEK_STEP_SECONDS)],
      [
        "seekto",
        (details) => {
          const media = activeMedia();
          if (media && details.seekTime != null) media.currentTime = details.seekTime;
        },
      ],
    ];

    for (const [action, handler] of handlers) {
      try {
        session.setActionHandler(action, handler);
      } catch {
        // Not every browser implements every action.
      }
    }

    return () => {
      for (const [action] of handlers) {
        try {
          session.setActionHandler(action, null);
        } catch {
          // ignore
        }
      }
      session.metadata = null;
      session.playbackState = "none";
    };
  }, [activeMedia, setPlaybackState, video.description, video.year]);

  // Keep the lock-screen scrubber in step with whichever element is playing.
  const syncPositionState = useCallback(() => {
    if (!("mediaSession" in navigator) || !navigator.mediaSession.setPositionState) return;
    const media = activeMedia();
    if (!media || !Number.isFinite(media.duration) || media.duration <= 0) return;
    try {
      navigator.mediaSession.setPositionState({
        duration: media.duration,
        playbackRate: media.playbackRate || 1,
        position: Math.min(Math.max(media.currentTime, 0), media.duration),
      });
    } catch {
      // Ignore transient states the spec rejects (seeking past the end, etc).
    }
  }, [activeMedia]);

  return (
    <div id="video-page">
      <div className="video-meta">
        <div className="video-year">{video.year}</div>
        <div>{video.description}</div>
      </div>
      <video
        ref={videoRef}
        key={video.link}
        src={video.link}
        controls
        playsInline
        autoPlay
        preload="auto"
        onTimeUpdate={syncPositionState}
        onDurationChange={syncPositionState}
      />
      {/* Stand-in for background playback. preload="none" keeps it off the
          network until the handoff actually needs it; the file itself is
          already in the HTTP cache from the video by then. */}
      <audio
        ref={audioRef}
        key={`${video.link}#audio`}
        src={video.link}
        preload="none"
        onTimeUpdate={syncPositionState}
        onPlay={() => {
          if (handedOffRef.current) setPlaybackState("playing");
        }}
        hidden
        aria-hidden="true"
      />
    </div>
  );
}
