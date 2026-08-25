#!/usr/bin/env node
/**
 * Encode a video to the web-ready format used by this site: a single
 * 1080p H.264 MP4 with the index up front so it starts playing and seeks
 * without downloading the whole file.
 *
 * Accepts anything ffmpeg can read — an FCP master export, or a legacy
 * HLS prog_index.m3u8 from the pre-2026 exports.
 *
 *   node scripts/encode-video.mjs <input> <output.mp4> [--copy]
 *
 * --copy remuxes without re-encoding. Use it when the source is already
 * H.264 at or below 1080p, where re-encoding would only lose quality.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";

const [input, output, ...flags] = process.argv.slice(2);
const copyOnly = flags.includes("--copy");

if (!input || !output) {
  console.error(
    "usage: node scripts/encode-video.mjs <input> <output.mp4> [--copy]",
  );
  process.exit(1);
}
if (!fs.existsSync(input)) {
  console.error(`input not found: ${input}`);
  process.exit(1);
}

// Apple's HLS exports carry a ~10s presentation offset on the video track
// while audio starts at 0. A stream copy normalizes that automatically, but
// re-encoding preserves it and desyncs audio, so reset both explicitly.
const encodeArgs = copyOnly
  ? ["-c", "copy"]
  : [
      "-vf",
      "scale=-2:1080,setpts=PTS-STARTPTS",
      "-af",
      "asetpts=PTS-STARTPTS",
      "-c:v",
      "libx264",
      "-profile:v",
      "high",
      "-crf",
      "20",
      "-preset",
      "medium",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
    ];

const result = spawnSync(
  "ffmpeg",
  ["-y", "-loglevel", "error", "-i", input, ...encodeArgs, "-movflags", "+faststart", output],
  { stdio: "inherit" },
);

if (result.status !== 0) {
  console.error("ffmpeg failed");
  process.exit(result.status ?? 1);
}

function probeVideo(entries) {
  return spawnSync(
    "ffprobe",
    ["-v", "error", "-select_streams", "v:0", "-show_entries", entries, "-of", "csv=p=0", output],
    { encoding: "utf8" },
  ).stdout.trim();
}

console.log(`\nwrote ${output} (${(fs.statSync(output).size / 1e6).toFixed(1)} MB)`);
console.log(`video: ${probeVideo("stream=codec_name,width,height,duration")}`);

// A non-zero video start_time means the HLS offset survived the encode and
// audio will play ahead of picture.
const videoStart = Number(probeVideo("stream=start_time"));
if (videoStart > 0.5) {
  console.error(
    `\nERROR: video stream starts at ${videoStart}s, not 0 — audio would be out of sync.`,
  );
  process.exit(1);
}
