"use client";

import { useEffect, useRef } from "react";

type MeterColorStop = { stop: number; color: string };

type AudioSpectrumProps = {
  audioId: string;
  analyser: AnalyserNode | null;
  width?: number;
  height?: number;
  capColor?: string;
  capHeight?: number;
  meterWidth?: number;
  meterCount?: number;
  meterColor?: MeterColorStop[] | string;
  gap?: number;
};

export default function AudioSpectrum(options: AudioSpectrumProps) {
  const defaultProps = {
    width: 300,
    height: 200,
    capColor: "#FFF",
    capHeight: 2,
    meterWidth: 2,
    meterCount: 40 * (2 + 2),
    meterColor: [
      { stop: 0, color: "grey" },
      { stop: 0.5, color: "#0CD7FD" },
      { stop: 1, color: "#000" },
    ] as MeterColorStop[],
    gap: 10,
  };

  const props = { ...defaultProps, ...options };

  const state = useRef({
    animationId: null as number | null,
    audioEle: null as HTMLAudioElement | null,
    audioCanvas: null as HTMLCanvasElement | null,
    playStatus: null as "PAUSED" | "PLAYING" | null,
  });

  useEffect(() => {
    state.current.audioCanvas = document.getElementById(
      `${props.audioId}-canvas`,
    ) as HTMLCanvasElement | null;
    state.current.audioEle = document.getElementById(
      props.audioId,
    ) as HTMLAudioElement | null;

    const audioEle = state.current.audioEle;
    const analyser = options.analyser;

    if (audioEle) {
      audioEle.onpause = () => {
        state.current.playStatus = "PAUSED";
      };
      audioEle.onplay = () => {
        state.current.playStatus = "PLAYING";
        drawSpectrum(analyser);
      };
    }

    function drawSpectrum(analyserNode: AnalyserNode | null) {
      if (!state.current.audioCanvas) {
        state.current.audioCanvas = document.getElementById(
          `${props.audioId}-canvas`,
        ) as HTMLCanvasElement | null;
      }
      if (!state.current.audioCanvas) return;

      const cwidth = state.current.audioCanvas.width;
      const cheight = state.current.audioCanvas.height - props.capHeight;
      const capYPositionArray: number[] = [];
      const ctx = state.current.audioCanvas.getContext("2d");
      if (!ctx) return;

      let gradient: CanvasGradient | string = ctx.createLinearGradient(20, 0, 0, 200);

      if (Array.isArray(props.meterColor)) {
        for (const stop of props.meterColor) {
          (gradient as CanvasGradient).addColorStop(stop.stop, stop.color);
        }
      } else if (typeof props.meterColor === "string") {
        gradient = props.meterColor;
      }

      const drawMeter = () => {
        if (!analyserNode) return;

        const array = new Uint8Array(analyserNode.frequencyBinCount);
        analyserNode.getByteFrequencyData(array);

        if (state.current.playStatus === "PAUSED") {
          for (let i = array.length - 1; i >= 0; i--) {
            array[i] = 0;
          }
          const allCapsReachBottom = !capYPositionArray.some((cap) => cap > 0);
          if (allCapsReachBottom) {
            ctx.clearRect(0, 0, cwidth, cheight + props.capHeight);
            if (state.current.animationId !== null) {
              cancelAnimationFrame(state.current.animationId);
            }
            return;
          }
        }

        const step = Math.round(array.length / props.meterCount);
        ctx.clearRect(0, 0, cwidth, cheight + props.capHeight);

        for (let i = 0; i < Math.round(props.meterCount); i++) {
          const value = array[i * step];
          if (capYPositionArray.length < Math.round(props.meterCount)) {
            capYPositionArray.push(value);
          }

          ctx.fillStyle = props.capColor;
          if (value < capYPositionArray[i]) {
            const preValue = --capYPositionArray[i];
            const y = ((270 - preValue) * cheight) / 270;
            ctx.fillRect(
              i * (props.meterWidth + props.gap),
              y,
              props.meterWidth,
              props.capHeight,
            );
          } else {
            const y = ((270 - value) * cheight) / 270;
            ctx.fillRect(
              i * (props.meterWidth + props.gap),
              y,
              props.meterWidth,
              props.capHeight,
            );
            capYPositionArray[i] = value;
          }

          ctx.fillStyle = gradient;
          const meterY = ((270 - value) * cheight) / 270 + props.capHeight;
          ctx.fillRect(
            i * (props.meterWidth + props.gap),
            meterY,
            props.meterWidth,
            cheight,
          );
        }

        state.current.animationId = requestAnimationFrame(drawMeter);
      };

      state.current.animationId = requestAnimationFrame(drawMeter);
    }
  }, [options.analyser, props.audioId, props.capColor, props.capHeight, props.gap, props.meterColor, props.meterCount, props.meterWidth]);

  return (
    <canvas
      id={`${props.audioId}-canvas`}
      width={props.width}
      height={props.height}
    />
  );
}
