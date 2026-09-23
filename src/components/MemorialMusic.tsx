"use client";

import { useEffect, useRef, useState } from "react";
import { mediaUrl } from "@/lib/config";
import AudioSpectrum from "./AudioSpectrum";

const music = mediaUrl("music/bg.mp3");
const amazingGrace = mediaUrl("music/AmazingGrace.m4a");

// While the music plays the page drifts down through the timeline. Slow
// enough to read each year's lines as they pass — on a phone a year's entry
// is about 150px, so roughly ten seconds each.
const SCROLL_PX_PER_SECOND = 16;
// Keys that move the page. Pressing one means the visitor wants control back.
const SCROLL_KEYS = new Set(["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "]);

// Drifts the page downward until it reaches the end or the visitor reaches for
// it. Returns a function that stops it.
function driftDown(): () => void {
  const scroller = document.scrollingElement;
  if (!scroller) return () => {};

  // Accumulated separately because at this speed a frame moves well under a
  // pixel, and scrollTop rounds: adding to it directly would never move.
  let position = scroller.scrollTop;
  let last = performance.now();
  let frame = requestAnimationFrame(function step(now) {
    position += ((now - last) / 1000) * SCROLL_PX_PER_SECOND;
    last = now;
    scroller.scrollTop = position;
    if (scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 1) {
      stop();
      return;
    }
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
  const [playList, setPlayList] = useState(music);

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

  // Drift through the timeline for as long as the music plays. Pausing, or a
  // track ending, flips `play` and the cleanup stops it. Visitors who have
  // asked their system for reduced motion get the music without the movement.
  useEffect(() => {
    if (!play) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    return driftDown();
  }, [play]);

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

  const onPause = () => {
    setPlay(false);
    if (playList === music) {
      setPlayList(amazingGrace);
    } else {
      setPlayList(music);
    }
  };

  const onEnded = () => {
    if (playList === music) {
      setPlayList(amazingGrace);
      return;
    }
    setPlayList(music);
  };

  const onButtonClick = () => {
    if (!audioContext || !player.current) return;

    if (player.current.paused) {
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
        src={playList}
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
