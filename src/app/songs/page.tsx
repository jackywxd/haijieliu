"use client";

import { useEffect, useRef, useState } from "react";
import AudioSpectrum from "@/components/AudioSpectrum";
import SlideShow from "@/components/SlideShow";
import { mediaUrl } from "@/lib/config";

const goinghome = mediaUrl("music/goinghome.m4a");
const raisemeup = mediaUrl("music/raisemeup.m4a");
const pic01 = mediaUrl("images/pic01.jpg");
const pic02 = mediaUrl("images/pic02.jpg");

const settings = {
  images: ["b01", "b02", "b03", "b04", "b05", "b06"].map((id) => ({
    url: mediaUrl(`images/${id}.jpg`),
    position: "center",
  })),
  delay: 10000,
};

type PlayerName = "sunny" | "lamby" | false;

export default function SongsPage() {
  const sunny = useRef<HTMLAudioElement>(null);
  const lamby = useRef<HTMLAudioElement>(null);
  const [play, setPlay] = useState<PlayerName>(false);
  const [audioContext, setContext] = useState<
    Partial<Record<"sunny" | "lamby", AudioContext>>
  >({});

  const state = useRef({
    audioEle: {} as Partial<Record<"sunny" | "lamby", HTMLAudioElement>>,
    mediaEleSource: {} as Partial<
      Record<"sunny" | "lamby", MediaElementAudioSourceNode>
    >,
    analyser: {} as Partial<Record<"sunny" | "lamby", AnalyserNode>>,
  });

  useEffect(() => {
    (["sunny", "lamby"] as const).forEach((name) => {
      if (!audioContext[name]) {
        prepareAPIs(name);
      }
      if (audioContext[name]) {
        setupAudioNode(name);
      }
    });
  }, [audioContext]);

  function setupAudioNode(name: "sunny" | "lamby") {
    const audioEle = document.getElementById(name) as HTMLAudioElement | null;
    if (!audioEle || !audioContext[name]) return;

    state.current.audioEle[name] = audioEle;

    if (!state.current.analyser[name]) {
      state.current.analyser[name] = audioContext[name]!.createAnalyser();
      state.current.analyser[name]!.smoothingTimeConstant = 0.85;
      state.current.analyser[name]!.fftSize = 256;
    }

    if (!state.current.mediaEleSource[name]) {
      state.current.mediaEleSource[name] = audioContext[
        name
      ]!.createMediaElementSource(audioEle);
      state.current.mediaEleSource[name]!.connect(
        state.current.analyser[name]!,
      );
      state.current.mediaEleSource[name]!.connect(
        audioContext[name]!.destination,
      );
    }
  }

  function prepareAPIs(name: "sunny" | "lamby") {
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
      const context = new win.AudioContext();
      setContext((prev) => ({ ...prev, [name]: context }));
    } catch (e) {
      console.error("!Your browser does not support AudioContext", e);
    }
  }

  const playSunny = () => {
    if (!play) {
      setPlay("sunny");
      sunny.current?.play();
      audioContext.sunny?.resume();
    } else if (play === "sunny") {
      setPlay(false);
      sunny.current?.pause();
      audioContext.sunny?.suspend();
    } else {
      lamby.current?.pause();
      audioContext.lamby?.suspend();
      setPlay("sunny");
      sunny.current?.play();
      audioContext.sunny?.resume();
    }
  };

  const playLamby = () => {
    if (!play) {
      setPlay("lamby");
      lamby.current?.play();
      audioContext.lamby?.resume();
    } else if (play === "lamby") {
      setPlay(false);
      lamby.current?.pause();
      audioContext.lamby?.suspend();
    } else {
      sunny.current?.pause();
      audioContext.sunny?.suspend();
      setPlay("lamby");
      lamby.current?.play();
      audioContext.lamby?.resume();
    }
  };

  return (
    <div id="songs-wrapper">
      <SlideShow settings={settings} />
      <section id="songs-banner" className="major">
        <div className="inner">
          <header className="major">
            <h1>Songs for Haijie</h1>
          </header>
          <div className="content">
            <p>Performed by: Lamby and Sunny</p>
          </div>
        </div>
      </section>
      <div />
      <div id="songs-main">
        <section className="tiles">
          <article
            style={{ backgroundImage: `url(${pic01})` }}
            onClick={playSunny}
          >
            <audio id="sunny" ref={sunny}>
              <source src={goinghome} />
              Your browser does not support the <code>audio</code> element.
            </audio>
            {play !== "sunny" ? (
              <header className="major">
                <h3>Going Home</h3>
                <p>Sunny Wu</p>
              </header>
            ) : (
              <div className="icon">
                <i className="fa fa-pause fa-2x" aria-hidden="true" />
              </div>
            )}
            <div
              className="wave"
              style={{ display: play === "sunny" ? "" : "none" }}
            >
              <AudioSpectrum
                audioId="sunny"
                analyser={state.current.analyser.sunny ?? null}
              />
            </div>
          </article>
          <article
            style={{ backgroundImage: `url(${pic02})` }}
            onClick={playLamby}
          >
            <audio id="lamby" ref={lamby}>
              <source src={raisemeup} />
              Your browser does not support the <code>audio</code> element.
            </audio>
            {play !== "lamby" ? (
              <header className="major">
                <h3>Raise me up</h3>
                <p>Lamby Wu</p>
              </header>
            ) : (
              <div className="icon">
                <i className="fa fa-pause fa-2x" aria-hidden="true" />
              </div>
            )}
            <div
              className="wave"
              style={{ display: play === "lamby" ? "" : "none" }}
            >
              <AudioSpectrum
                audioId="lamby"
                analyser={state.current.analyser.lamby ?? null}
              />
            </div>
          </article>
        </section>
      </div>
    </div>
  );
}
