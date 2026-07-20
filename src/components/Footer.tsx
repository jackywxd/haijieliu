"use client";

import { useEffect, useRef, useState } from "react";
import { mediaUrl } from "@/lib/config";
import AudioSpectrum from "./AudioSpectrum";

const music = mediaUrl("music/bg.mp3");
const amazingGrace = mediaUrl("music/AmazingGrace.m4a");

export default function Footer() {
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
    <footer id="footer">
      <div
        style={{ display: "flex", justifyContent: "center" }}
        onClick={onButtonClick}
      >
        <audio
          id="songsforhaijie"
          ref={player}
          onPlay={() => setPlay(true)}
          onPause={onPause}
          onEnded={onEnded}
          src={playList}
        >
          Your browser does not support the <code>audio</code> element.
        </audio>
        <div className="faIcon">
          {!play ? (
            <i className="fa fa-play fa-2x" aria-hidden="true" />
          ) : (
            <i className="fa fa-pause fa-2x" aria-hidden="true" />
          )}
        </div>
        <div className="wave">
          <AudioSpectrum
            audioId="songsforhaijie"
            height={50}
            width={350}
            analyser={analyser}
          />
        </div>
      </div>
    </footer>
  );
}
