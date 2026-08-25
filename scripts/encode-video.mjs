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
// Apple's hardware decoders top out at H.264 level 4.2, and WebKit refuses a
// stream that declares anything higher outright — so an over-level file plays
// on desktop and fails on every iPhone and iPad. Under CRF with no VBV bound
// x264 cannot guarantee any level and signals 6.2, the spec maximum, so the
// level and the buffer that justifies it both have to be stated explicitly.
// The caps sit far above the ~3 Mbps these encodes actually use.
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
      "-level:v",
      "4.0",
      "-maxrate",
      "12M",
      "-bufsize",
      "24M",
      "-pix_fmt",
      "yuv420p",
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

// Anything above 4.2 is rejected outright by WebKit, so it would ship looking
// fine on a desktop browser and play on no Apple device at all.
const MAX_APPLE_LEVEL = 42;
const level = Number(probeVideo("stream=level"));
if (!Number.isFinite(level) || level > MAX_APPLE_LEVEL) {
  console.error(
    `\nERROR: H.264 level ${level / 10} exceeds the ${MAX_APPLE_LEVEL / 10} Apple devices support — ` +
      `this file would not play in Safari or on any iPhone or iPad.`,
  );
  process.exit(1);
}
console.log(`level: ${level / 10} (within Apple's ${MAX_APPLE_LEVEL / 10} limit)`);
