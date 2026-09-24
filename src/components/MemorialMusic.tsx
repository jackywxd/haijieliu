"use client";

import { useEffect, useRef, useState } from "react";
import { claimPlaybackAudioSession } from "@/lib/audioSession";
import { mediaUrl } from "@/lib/config";
import AudioSpectrum from "./AudioSpectrum";

// Played in order, then from the top again.
const PLAYLIST = [
  mediaUrl("music/bg.mp3"),
  mediaUrl("music/AmazingGrace.m4a"),
  mediaUrl("music/lifeLongLove.m4a"),
];

// While the music plays the page drifts through the timeline, down to the end
// and back up to the top, for as long as it plays. Slow enough to read each
// year's lines as they pass — on a phone a year's entry is about 150px, so
// roughly ten seconds each.
const SCROLL_PX_PER_SECOND = 16;
// The drift turns back this far short of the very end of the page, so it
// never presses against the end, where iOS Safari brings its toolbar back
// out. It is less than the space below the last year, so that year is still
// read in full before the turn.
const TURN_BEFORE_END_PX = 24;
// Keys that move the page. Pressing one means the visitor wants control back.
const SCROLL_KEYS = new Set(["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "]);

type Direction = { current: 1 | -1 };

// Drifts the page back and forth between the top and the end until the
// visitor reaches for it. `direction` outlives a single drift, so pausing on
// the way up and playing again carries on up. Returns a function that stops it.
function drift(direction: Direction): () => void {
  const scroller = document.scrollingElement;
  if (!scroller) return () => {};

  // Accumulated separately because at this speed a frame moves well under a
  // pixel, and scrollTop rounds: adding to it directly would never move.
  let position = scroller.scrollTop;
  let last = performance.now();
  let frame = requestAnimationFrame(function step(now) {
    // The end is computed, not detected by reading scrollTop back after
    // setting it: on iOS a programmatic scroll is handed to the native scroll
    // view unclamped (WebCore ScrollView::setScrollPosition skips clamping
    // when it delegates scrolling), so scrollTop reads back whatever was set
    // and never shows the page stopping. innerHeight is the visible height
    // there, matching visualViewport. Worked out afresh each frame because
    // the page grows as images load.
    const end = Math.max(0, scroller.scrollHeight - window.innerHeight - TURN_BEFORE_END_PX);
    position += direction.current * ((now - last) / 1000) * SCROLL_PX_PER_SECOND;
    last = now;
    if (position >= end) {
      position = end;
      direction.current = -1;
    } else if (position <= 0) {
      position = 0;
      direction.current = 1;
    }
    scroller.scrollTop = position;
    frame = requestAnimationFrame(step);
  });

  // Scroll events cannot say who moved the page — the drift fires them too —
  // so the visitor taking over is read from their input instead.
  const onKey = (e: KeyboardEvent) => {
    if (SCROLL_KEYS.has(e.key)) stop();
  };
  const inputs = ["wheel", "touchstart", "mousedown"] as const;
  inputs.forEach((type) => window.addEventListener(type, stop, { passive: true }));
  window.addEventListener("keydown", onKey);

  function stop() {
    cancelAnimationFrame(frame);
    inputs.forEach((type) => window.removeEventListener(type, stop));
    window.removeEventListener("keydown", onKey);
  }
  return stop;
}

export default function MemorialMusic() {
  const player = useRef<HTMLAudioElement>(null);
  const [play, setPlay] = useState(false);
  const [audioContext, setContext] = useState<AudioContext | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [track, setTrack] = useState(0);
  // Set when a track ends, so the next one starts on its own once its src is
  // in place; a track chosen any other way waits for the button.
  const advancing = useRef(false);
  const direction = useRef<1 | -1>(1);

  const state = useRef({
    audioEle: null as HTMLAudioElement | null,
    mediaEleSource: null as MediaElementAudioSourceNode | null,
  });

  useEffect(() => {
    if (!audioContext) {
      prepareAPIs();
    }
    if (audioContext) {
      setupAudioNode();
    }
  }, [audioContext]);

  // Drift through the timeline for as long as the music plays. Pausing flips
  // `play` and the cleanup stops it; moving from one track to the next does
  // not (see onPause), so a visitor who took over scrolling keeps it. Visitors
  // who have asked their system for reduced motion get the music without the
  // movement.
  useEffect(() => {
    if (!play) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    return drift(direction);
  }, [play]);

  useEffect(() => {
    if (!advancing.current || !player.current) return;
    advancing.current = false;
    player.current.play().catch(() => setPlay(false));
  }, [track]);

  function setupAudioNode() {
    let ana = analyser;
    if (!state.current.audioEle) {
      state.current.audioEle = document.getElementById(
        "songsforhaijie",
      ) as HTMLAudioElement | null;
    }
    if (!ana && audioContext) {
      ana = audioContext.createAnalyser();
      ana.smoothingTimeConstant = 0.85;
      ana.fftSize = 256;
      setAnalyser(ana);
    }

    if (
      !state.current.mediaEleSource &&
      audioContext &&
      ana &&
      state.current.audioEle
    ) {
      state.current.mediaEleSource = audioContext.createMediaElementSource(
        state.current.audioEle,
      );
      state.current.mediaEleSource.connect(ana);
      state.current.mediaEleSource.connect(audioContext.destination);
    }
  }

  function prepareAPIs() {
    const win = window as Window &
      typeof globalThis & {
        webkitAudioContext?: typeof AudioContext;
        mozAudioContext?: typeof AudioContext;
        msAudioContext?: typeof AudioContext;
      };

    win.AudioContext =
      win.AudioContext ||
      win.webkitAudioContext ||
      win.mozAudioContext ||
      win.msAudioContext;

    try {
      setContext(new win.AudioContext());
    } catch (e) {
      console.error("!Your browser does not support AudioContext", e);
    }
  }

  // A track reaching its end fires `pause` just before `ended`. That one is
  // not the visitor stopping the music — the next track is about to start —
  // so the button and the drift carry straight on through it.
  const onPause = (e: React.SyntheticEvent<HTMLAudioElement>) => {
    if (e.currentTarget.ended) return;
    setPlay(false);
  };

  const onEnded = () => {
    advancing.current = true;
    setTrack((t) => (t + 1) % PLAYLIST.length);
  };

  const onButtonClick = () => {
    if (!audioContext || !player.current) return;

    if (player.current.paused) {
      // Without this the music falls silent when the screen locks on iOS:
      // it plays through the AudioContext, which iOS interrupts in the
      // background unless the page holds a playback session.
      claimPlaybackAudioSession();
      player.current.play();
      audioContext.resume();
    } else {
      player.current.pause();
      audioContext.suspend();
    }
  };

  return (
    <div className="timeline-music">
      <audio
        id="songsforhaijie"
        ref={player}
        crossOrigin="anonymous"
        preload="metadata"
        onPlay={() => setPlay(true)}
        onPause={onPause}
        onEnded={onEnded}
        src={PLAYLIST[track]}
      >
        Your browser does not support the <code>audio</code> element.
      </audio>
      {/* A real button, so it can be reached and pressed from a keyboard and
          is announced by name — it was a bare div with a click handler. */}
      <button
        type="button"
        className="timeline-music-toggle"
        onClick={onButtonClick}
        aria-label={play ? "暫停音樂" : "播放音樂"}
      >
        <i className={play ? "fa fa-pause" : "fa fa-play"} aria-hidden="true" />
      </button>
      <div className="timeline-music-wave" aria-hidden="true">
        <AudioSpectrum
          audioId="songsforhaijie"
          height={28}
          width={120}
          analyser={analyser}
        />
      </div>
    </div>
  );
}
