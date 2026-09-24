"use client";

import { useCallback, useEffect, useRef } from "react";
import { claimPlaybackAudioSession } from "@/lib/audioSession";
import type { VideoMeta } from "@/lib/videos";

// Mobile browsers stop a <video> element as soon as the tab is backgrounded or
// the screen locks, and nothing on the video element itself opts out. What
// they *do* keep running is <audio> — that is how web radio survives a locked
// phone — so this player keeps an <audio> element pointed at the same file and
// lets it carry the sound when the picture cannot. How it does that depends on
// the platform:
//
// iOS and iPadOS — the audio element leads, always. The video is muted and
// only follows along for the picture. On lock, WebKit suspends the muted video
// and leaves the audio element alone (audio-only media has no background
// restrictions there), so the sound simply never stops. This cannot be done as
// a swap at the moment the page is hidden: by the time any script hears about
// the lock, WebKit has already interrupted the video and the page is in the
// background, where iOS will not let new sound begin. That swap is what the
// first version did, and on an iPhone it produced a lock screen whose progress
// bar kept moving — extrapolated from the Media Session position — over
// silence.
//
// Everywhere else — the video plays its own sound in the foreground and hands
// over to the audio element when the page is hidden. Android Chrome lets a
// page that has been interacted with start audio from the background, and
// desktop browsers never stop a hidden tab in the first place, so the swap is
// enough there and keeps the native volume controls truthful.
//
// Both paths publish Media Session metadata and handlers, which is what puts
// the title and the play/pause/seek controls on the lock screen.

const SEEK_STEP_SECONDS = 10;

// How far the picture may wander from the sound before it is pulled back, and
// how often. Two elements decoding the same file drift apart slowly, and a
// stalled video falls behind quickly; either way a jump in the picture is far
// less noticeable than one in the music, so the video is the one that moves.
const DRIFT_TOLERANCE_SECONDS = 0.3;
const RESYNC_COOLDOWN_MS = 2000;

// A pause that WebKit issues on lock can reach the page a moment before the
// visibility change does. Waiting this long before treating a video pause as
// the viewer's tells the two apart, at the cost of the sound outlasting a
// tapped pause by the same margin.
const SYSTEM_PAUSE_GRACE_MS = 500;

const ARTWORK = [
  { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
  { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
];

// iPadOS reports itself as a Mac, so a touch-capable "Mac" counts too. Every
// browser on iOS is WebKit underneath, so this covers Chrome and Firefox there.
function needsAudioLedPlayback(): boolean {
  const ua = navigator.userAgent;
  return /iP(hone|od|ad)/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

function isInPictureInPicture(videoEl: HTMLVideoElement): boolean {
  const webkitMode = (videoEl as HTMLVideoElement & { webkitPresentationMode?: string })
    .webkitPresentationMode;
  return document.pictureInPictureElement === videoEl || webkitMode === "picture-in-picture";
}

export default function VideoPlayer({ video }: { video: VideoMeta }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // The audio element carries the sound at all times (iOS). Decided on mount,
  // since the server cannot know which device it is rendering for.
  const audioLedRef = useRef(false);
  // The audio element is standing in for a hidden video right now (elsewhere).
  const handedOffRef = useRef(false);
  // The viewer wants playback to continue. Kept separate from `paused` because
  // the browser pauses the video on backgrounding, which is exactly the moment
  // we need to know that playback was still wanted.
  const playIntentRef = useRef(false);
  // The audio element has played inside a user gesture at least once.
  const primedRef = useRef(false);

  // Whichever element currently carries the sound. Media Session handlers and
  // the lock-screen scrubber have to act on this one.
  const activeMedia = useCallback((): HTMLMediaElement | null => {
    return audioLedRef.current || handedOffRef.current ? audioRef.current : videoRef.current;
  }, []);

  const setPlaybackState = useCallback((state: MediaSessionPlaybackState) => {
    if ("mediaSession" in navigator) navigator.mediaSession.playbackState = state;
  }, []);

  // ---------------------------------------------------------------------------
  // iOS: the audio element leads, the muted video follows.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const videoEl = videoRef.current;
    const audioEl = audioRef.current;
    if (!videoEl || !audioEl || !needsAudioLedPlayback()) return;

    audioLedRef.current = true;
    videoEl.muted = true;
    audioEl.muted = false;
    claimPlaybackAudioSession();

    let pauseCheck: number | undefined;
    let hiddenSincePause = false;
    let lastResync = 0;

    // Bring the picture to where the sound is.
    const resyncVideo = () => {
      if (Math.abs(videoEl.currentTime - audioEl.currentTime) > DRIFT_TOLERANCE_SECONDS) {
        videoEl.currentTime = audioEl.currentTime;
      }
    };

    const stopBoth = () => {
      playIntentRef.current = false;
      window.clearTimeout(pauseCheck);
      audioEl.pause();
      videoEl.pause();
      setPlaybackState("paused");
    };

    const onVideoPlay = () => {
      // The sound is already running — WebKit resuming the picture after the
      // lock screen, or our own call below. The picture just has to catch up.
      if (!audioEl.paused) {
        resyncVideo();
        return;
      }
      playIntentRef.current = true;
      claimPlaybackAudioSession();
      setPlaybackState("playing");
      if (Math.abs(audioEl.currentTime - videoEl.currentTime) > DRIFT_TOLERANCE_SECONDS) {
        audioEl.currentTime = videoEl.currentTime;
      }
      // A tap on the play button leaves the page transient user activation,
      // which is what lets this start with sound.
      audioEl.play().catch((error: DOMException) => {
        // Nothing to start sound with (no recent tap). Stop the picture too so
        // the play button is there to press; a muted video is no use here.
        if (error.name !== "NotAllowedError") return;
        playIntentRef.current = false;
        videoEl.pause();
        setPlaybackState("paused");
      });
    };

    const onVideoPause = () => {
      // Ours, the end of the file, or already settled.
      if (!playIntentRef.current || videoEl.ended || audioEl.paused) return;
      // Controls on a picture-in-picture window are the viewer's, even though
      // the page itself is in the background.
      if (isInPictureInPicture(videoEl)) {
        stopBoth();
        return;
      }
      // Otherwise this is either the viewer tapping pause or WebKit suspending
      // the picture on lock, and the sound must survive the second. Decide
      // once the visibility change has had time to arrive.
      hiddenSincePause = document.visibilityState === "hidden";
      window.clearTimeout(pauseCheck);
      pauseCheck = window.setTimeout(() => {
        if (hiddenSincePause || document.visibilityState === "hidden") return;
        if (videoEl.paused && playIntentRef.current) stopBoth();
      }, SYSTEM_PAUSE_GRACE_MS);
    };

    // Seeking with the video's scrubber moves the sound with it. Our own
    // resyncs land within the tolerance and are left alone.
    const onVideoSeeking = () => {
      if (Math.abs(videoEl.currentTime - audioEl.currentTime) > DRIFT_TOLERANCE_SECONDS) {
        audioEl.currentTime = videoEl.currentTime;
      }
    };

    const onVideoTimeUpdate = () => {
      if (videoEl.paused || audioEl.paused || videoEl.seeking) return;
      if (document.visibilityState === "hidden") return;
      const now = performance.now();
      if (now - lastResync < RESYNC_COOLDOWN_MS) return;
      if (Math.abs(videoEl.currentTime - audioEl.currentTime) > DRIFT_TOLERANCE_SECONDS) {
        lastResync = now;
        videoEl.currentTime = audioEl.currentTime;
      }
    };

    // The video's mute button is the only one on screen, and the video is
    // always muted, so treat any unmute as a tap on a sound toggle: flip the
    // audio element and keep the picture silent.
    const onVideoVolumeChange = () => {
      if (videoEl.muted) return;
      videoEl.muted = true;
      audioEl.muted = !audioEl.muted;
    };

    const onAudioPlay = () => {
      playIntentRef.current = true;
      setPlaybackState("playing");
      // Started from the lock screen or a headset: bring the picture along if
      // anyone can see it.
      if (document.visibilityState === "visible" && videoEl.paused) {
        resyncVideo();
        videoEl.play().catch(() => {});
      }
    };

    // Seeks from the lock screen land on the audio element.
    const onAudioSeeked = () => {
      if (document.visibilityState === "visible") resyncVideo();
    };

    const onAudioPause = () => {
      if (!playIntentRef.current || audioEl.ended) return;
      // The system stopped the sound — headphones unplugged, a call, Siri.
      // Follow it with the picture so the controls tell the truth.
      stopBoth();
    };

    const onAudioEnded = () => {
      playIntentRef.current = false;
      window.clearTimeout(pauseCheck);
      if (!videoEl.ended && Number.isFinite(videoEl.duration)) {
        videoEl.currentTime = videoEl.duration;
      }
      videoEl.pause();
      setPlaybackState("none");
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        hiddenSincePause = true;
        return;
      }
      // Back from the lock screen: the picture is frozen where the lock caught
      // it while the sound carried on.
      resyncVideo();
      if (!audioEl.paused && videoEl.paused) videoEl.play().catch(() => {});
    };

    videoEl.addEventListener("play", onVideoPlay);
    videoEl.addEventListener("pause", onVideoPause);
    videoEl.addEventListener("seeking", onVideoSeeking);
    videoEl.addEventListener("timeupdate", onVideoTimeUpdate);
    videoEl.addEventListener("volumechange", onVideoVolumeChange);
    audioEl.addEventListener("play", onAudioPlay);
    audioEl.addEventListener("seeked", onAudioSeeked);
    audioEl.addEventListener("pause", onAudioPause);
    audioEl.addEventListener("ended", onAudioEnded);
    document.addEventListener("visibilitychange", onVisibilityChange);

    // autoPlay can start the video during hydration, before these listeners
    // existed. Pick it up as if the play event had just arrived.
    if (!videoEl.paused && !videoEl.ended) onVideoPlay();
    else setPlaybackState("paused");

    return () => {
      videoEl.removeEventListener("play", onVideoPlay);
      videoEl.removeEventListener("pause", onVideoPause);
      videoEl.removeEventListener("seeking", onVideoSeeking);
      videoEl.removeEventListener("timeupdate", onVideoTimeUpdate);
      videoEl.removeEventListener("volumechange", onVideoVolumeChange);
      audioEl.removeEventListener("play", onAudioPlay);
      audioEl.removeEventListener("seeked", onAudioSeeked);
      audioEl.removeEventListener("pause", onAudioPause);
      audioEl.removeEventListener("ended", onAudioEnded);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.clearTimeout(pauseCheck);
      playIntentRef.current = false;
      audioEl.pause();
      audioLedRef.current = false;
    };
  }, [
    setPlaybackState,
    // The keyed elements are replaced when the video changes; the new ones
    // need wiring too.
    video.link,
  ]);

  // ---------------------------------------------------------------------------
  // Elsewhere: the video plays its own sound and hands over when hidden.
  // ---------------------------------------------------------------------------

  // Unlock the audio element for later gesture-less playback. play() followed
  // immediately by pause() never gets far enough to make a sound, but it does
  // spend the gesture, which is all the browser is looking for.
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
    if (isInPictureInPicture(videoEl)) return;

    handedOffRef.current = true;
    const position = videoEl.currentTime;
    if (Number.isFinite(position)) audioEl.currentTime = position;

    const started = audioEl.play();
    // Pause the video in the same tick: the audio has not produced any sound
    // yet, so the swap is seamless rather than briefly doubled.
    videoEl.pause();

    if (started) {
      started.catch(() => {
        // Background playback was refused. Give the stream back so returning
        // to the tab still works.
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

  useEffect(() => {
    const videoEl = videoRef.current;
    const audioEl = audioRef.current;
    if (!videoEl || !audioEl || needsAudioLedPlayback()) return;

    // autoPlay starts the video during hydration, so its play event is often
    // already gone by the time this effect runs. Read the state instead, and
    // seed the lock screen from it for the same reason.
    playIntentRef.current = !videoEl.paused && !videoEl.ended;
    setPlaybackState(playIntentRef.current ? "playing" : "paused");
    claimPlaybackAudioSession();

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        handoffToAudio();
      } else {
        restoreToVideo();
      }
    };

    const onVideoPlay = () => {
      playIntentRef.current = true;
      claimPlaybackAudioSession();
      primeAudio();
      setPlaybackState("playing");
    };

    const onVideoPause = () => {
      // A pause that arrives while the page is hidden, or while the audio
      // element has already taken over, is the browser suspending the video —
      // not the viewer asking for silence — so the intent to play survives it.
      if (handedOffRef.current || document.visibilityState === "hidden") {
        // The browser can pause the video a moment before it reports the page
        // as hidden, so treat this as the trigger too.
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

    const onAudioPlay = () => {
      if (handedOffRef.current) setPlaybackState("playing");
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
    audioEl.addEventListener("play", onAudioPlay);
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
      audioEl.removeEventListener("play", onAudioPlay);
      audioEl.removeEventListener("ended", onAudioEnded);
      document.removeEventListener("pointerdown", primeAudio);
      document.removeEventListener("touchstart", primeAudio);
      audioEl.pause();
      handedOffRef.current = false;
      playIntentRef.current = false;
    };
  }, [
    handoffToAudio,
    primeAudio,
    restoreToVideo,
    setPlaybackState,
    video.link,
  ]);

  // ---------------------------------------------------------------------------
  // Lock-screen / notification-shade controls, shared by both paths. Without
  // these the phone shows a nameless stream and the hardware buttons do nothing
  // once the tab is hidden.
  // ---------------------------------------------------------------------------
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
          // Both, not just the active one: on iOS the muted picture would
          // otherwise play on without its sound.
          audioRef.current?.pause();
          videoRef.current?.pause();
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
      <h1 className="sr-only">
        {video.year} 年紀念影片 — Memorial Video for Haijie Liu
      </h1>
      <div className="video-meta">
        <div className="video-year">{video.year}</div>
        <div>{video.description}</div>
      </div>
      <video
        ref={videoRef}
        key={video.link}
        src={video.link}
        poster={video.poster}
        controls
        playsInline
        autoPlay
        preload="auto"
        onTimeUpdate={syncPositionState}
        onDurationChange={syncPositionState}
      />
      {/* Carries the sound whenever the picture cannot. preload="none" keeps
          it off the network until playback actually needs it. */}
      <audio
        ref={audioRef}
        key={`${video.link}#audio`}
        src={video.link}
        preload="none"
        onTimeUpdate={syncPositionState}
        onDurationChange={syncPositionState}
        hidden
        aria-hidden="true"
      />
    </div>
  );
}
