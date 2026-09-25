"use client";

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { claimPlaybackAudioSession } from "@/lib/audioSession";
import { mediaUrl } from "@/lib/config";
import SpectrumBackdrop from "./SpectrumBackdrop";

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
// How long the play button takes to fly from the heading to the corner.
// layout/_music.scss times the rest of the controls' entrance against it.
const FLIGHT_MS = 750;

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
  // so the visitor taking over is read from their input instead. Pressing the
  // music controls is not reaching for the page, so those do not count.
  const onKey = (e: KeyboardEvent) => {
    if (SCROLL_KEYS.has(e.key) && !isOnMusicControls(e.target)) stop();
  };
  const onInput = (e: Event) => {
    if (!isOnMusicControls(e.target)) stop();
  };
  const inputs = ["wheel", "touchstart", "mousedown"] as const;
  inputs.forEach((type) => window.addEventListener(type, onInput, { passive: true }));
  window.addEventListener("keydown", onKey);

  function stop() {
    cancelAnimationFrame(frame);
    inputs.forEach((type) => window.removeEventListener(type, onInput));
    window.removeEventListener("keydown", onKey);
  }
  return stop;
}

// The layer the controls and the spectrum are rendered into: AppShell's root,
// the one `body > *` in base/_page.scss makes a stacking context. It lives in
// the root layout, so it is already there on every render, including a
// client-side navigation into the home page, and there is nothing to
// subscribe to. The server has no document; the portals appear on hydrate.
const subscribeToNothing = () => () => {};
const findLayer = () => document.querySelector<HTMLElement>("body > .body") ?? document.body;
const noLayerOnServer = () => null;

function isOnMusicControls(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(".music-dock") !== null;
}

// The control starts beside the timeline heading. The first press sends it
// flying to the bottom-right corner, where it stays, flanked by previous and
// next, while the page drifts under it. The spectrum lies faintly along the
// bottom of the window behind everything.
//
// Both the corner controls and the spectrum are rendered into AppShell's root,
// the layer that also holds the background slideshow (#bg), not the timeline:
// fixed there, they cover the window, and z-index places the spectrum between
// the slideshow and the text, and the controls above the text but below the
// menu.
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
  // Set while previous/next swaps the src of a playing track, so the pause the
  // swap causes does not read as the visitor stopping the music.
  const switching = useRef(false);

  const layer = useSyncExternalStore(subscribeToNothing, findLayer, noLayerOnServer);
  // Whether the control has moved to the corner. It never moves back.
  const [docked, setDocked] = useState(false);
  const headingButton = useRef<HTMLButtonElement>(null);
  const dockFly = useRef<HTMLSpanElement>(null);
  const dockButton = useRef<HTMLButtonElement>(null);
  // Where the heading button was when pressed, for the flight to start from.
  const flight = useRef<{ from: DOMRect; focused: boolean } | null>(null);

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
    player.current.play().catch(() => {
      switching.current = false;
      setPlay(false);
    });
  }, [track]);

  // Fly the control from the heading to the corner: measure both ends and
  // play the difference back to zero. X and Y ride on separate elements with
  // different easings — across first, then down — which bends the straight
  // line into an arc.
  useLayoutEffect(() => {
    const trip = flight.current;
    flight.current = null;
    const fly = dockFly.current;
    const button = dockButton.current;
    if (!docked || !trip || !fly || !button) return;

    // The heading button had keyboard focus; hand it to its replacement.
    if (trip.focused) button.focus({ preventScroll: true });
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const to = button.getBoundingClientRect();
    const dx = trip.from.left + trip.from.width / 2 - (to.left + to.width / 2);
    const dy = trip.from.top + trip.from.height / 2 - (to.top + to.height / 2);
    const scale = trip.from.width / to.width;
    fly.animate([{ transform: `translateX(${dx}px)` }, { transform: "none" }], {
      duration: FLIGHT_MS,
      easing: "cubic-bezier(0.3, 0.7, 0.4, 1)",
    });
    button.animate([{ transform: `translateY(${dy}px) scale(${scale})` }, { transform: "none" }], {
      duration: FLIGHT_MS,
      easing: "cubic-bezier(0.6, 0, 0.8, 0.4)",
    });
  }, [docked]);

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
    if (e.currentTarget.ended || switching.current) return;
    setPlay(false);
  };

  const onPlay = () => {
    switching.current = false;
    setPlay(true);
  };

  const onEnded = () => {
    advancing.current = true;
    setTrack((t) => (t + 1) % PLAYLIST.length);
  };

  const togglePlayback = () => {
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

  // The first press, from beside the heading: start the music and send the
  // control to the corner.
  const onHeadingButtonClick = () => {
    const button = headingButton.current;
    if (!audioContext || !player.current || !button) return;
    flight.current = {
      from: button.getBoundingClientRect(),
      focused: document.activeElement === button,
    };
    togglePlayback();
    setDocked(true);
  };

  // Previous and next keep the music as it was: a playing track hands over to
  // the next one playing, a paused one to the next one paused.
  const skip = (step: 1 | -1) => {
    const audio = player.current;
    if (audio && !audio.paused) {
      advancing.current = true;
      switching.current = true;
    }
    setTrack((t) => (t + step + PLAYLIST.length) % PLAYLIST.length);
  };

  return (
    <div className="timeline-music">
      <audio
        id="songsforhaijie"
        ref={player}
        crossOrigin="anonymous"
        preload="metadata"
        onPlay={onPlay}
        onPause={onPause}
        onEnded={onEnded}
        src={PLAYLIST[track]}
      >
        Your browser does not support the <code>audio</code> element.
      </audio>
      {/* A real button, so it can be reached and pressed from a keyboard and
          is announced by name. Only ever shown paused: pressing it plays, and
          the control moves to the corner for good. */}
      {!docked && (
        <button
          ref={headingButton}
          type="button"
          className="timeline-music-toggle"
          onClick={onHeadingButtonClick}
          aria-label="播放音樂"
        >
          <i className="fa fa-play" aria-hidden="true" />
        </button>
      )}
      {layer &&
        createPortal(
          <div className="music-spectrum" aria-hidden="true">
            <SpectrumBackdrop analyser={analyser} playing={play} />
          </div>,
          layer,
        )}
      {layer &&
        docked &&
        createPortal(
          <div className="music-dock" role="group" aria-label="音樂">
            <button
              type="button"
              className="music-dock-skip music-dock-previous"
              onClick={() => skip(-1)}
              aria-label="上一首"
            >
              <i className="fa fa-step-backward" aria-hidden="true" />
            </button>
            <span className="music-dock-fly" ref={dockFly}>
              <button
                ref={dockButton}
                type="button"
                className="music-dock-toggle"
                onClick={togglePlayback}
                aria-label={play ? "暫停音樂" : "播放音樂"}
              >
                <i className={play ? "fa fa-pause" : "fa fa-play"} aria-hidden="true" />
              </button>
            </span>
            <button
              type="button"
              className="music-dock-skip music-dock-next"
              onClick={() => skip(1)}
              aria-label="下一首"
            >
              <i className="fa fa-step-forward" aria-hidden="true" />
            </button>
          </div>,
          layer,
        )}
    </div>
  );
}
