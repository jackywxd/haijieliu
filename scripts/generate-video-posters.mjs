#!/usr/bin/env node
/**
 * Extract a poster frame and probe the dimensions/duration of every memorial
 * MP4, so each /videos/<year> page can carry a thumbnail.
 *
 * Google refuses to index a video it cannot show a still for — Search Console
 * reports it as "No thumbnail URL provided". The poster serves both purposes:
 * it is the <video poster> a visitor sees before pressing play, and the
 * VideoObject thumbnailUrl Google indexes.
 *
 * Posters land in public/media/images/video-thumb/, so the existing
 * `npm run upload:media` picks them up and R2 serves them alongside the MP4s.
 * The MP4s themselves are gitignored (rebuilt by encode-video.mjs), so the
 * probed metadata is written to src/content/video-media.json and committed —
 * a build machine without the source videos still renders correct markup.
 *
 * Idempotent: skips a poster that is already newer than its source video.
 *
 * Usage:
 *   node scripts/generate-video-posters.mjs
 *   node scripts/generate-video-posters.mjs --force
 */
import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);

const root = process.cwd();
const videoDir = path.join(root, "public/media/videos-mp4");
const posterDir = path.join(root, "public/media/images/video-thumb");
const manifestPath = path.join(root, "src/content/video-media.json");
const force = process.argv.includes("--force");

// Wide enough for Google's video thumbnail guidance (>= 1200px preferred) while
// staying a fraction of a frame of the source.
const POSTER_WIDTH = 1280;
// Skip the fade-in: the opening second of every one of these videos is black,
// and a black poster is worse than none. `thumbnail` then picks the most
// representative frame out of the window that follows.
const SEEK_SECONDS = 8;
const THUMBNAIL_WINDOW_FRAMES = 200;

// Where the default seek lands on a title or text card rather than a
// photograph. `thumbnail` picks the most *representative* frame in its window,
// which is the wrong thing when the whole window is a card of text — 2020
// opens with a two-minute written message. Checked by eye; re-check any entry
// added here by viewing the generated poster.
const POSTER_TIME_OVERRIDES = {
  "Haijie-2020.mp4": 130,
};

async function requireFfmpeg() {
  for (const bin of ["ffmpeg", "ffprobe"]) {
    try {
      await run(bin, ["-version"]);
    } catch {
      console.error(
        `ERROR: ${bin} not found on PATH. Install it (brew install ffmpeg) and re-run.`,
      );
      process.exit(1);
    }
  }
}

async function probe(file) {
  const { stdout } = await run("ffprobe", [
    "-v", "error",
    "-select_streams", "v:0",
    "-show_entries", "stream=width,height",
    "-show_entries", "format=duration",
    "-of", "json",
    file,
  ]);
  const data = JSON.parse(stdout);
  const stream = data.streams?.[0] ?? {};
  return {
    width: stream.width ?? null,
    height: stream.height ?? null,
    durationSeconds: data.format?.duration
      ? Math.round(Number(data.format.duration))
      : null,
  };
}

async function extractPoster(src, dest, name) {
  const override = POSTER_TIME_OVERRIDES[name];
  // An override names one exact frame, so picking "the representative frame
  // near it" would defeat the point of overriding.
  const filters = override
    ? `scale=${POSTER_WIDTH}:-2`
    : `thumbnail=${THUMBNAIL_WINDOW_FRAMES},scale=${POSTER_WIDTH}:-2`;
  await run("ffmpeg", [
    "-y",
    "-ss", String(override ?? SEEK_SECONDS),
    "-i", src,
    "-vf", filters,
    "-frames:v", "1",
    "-q:v", "3",
    dest,
  ]);
}

function isFresh(src, dest) {
  if (force || !fs.existsSync(dest)) return false;
  return fs.statSync(dest).mtimeMs >= fs.statSync(src).mtimeMs;
}

async function main() {
  if (!fs.existsSync(videoDir)) {
    console.error(
      `ERROR: ${path.relative(root, videoDir)} not found. Run 'git lfs pull' and ` +
        `'node scripts/encode-video.mjs' first.`,
    );
    process.exit(1);
  }
  await requireFfmpeg();
  fs.mkdirSync(posterDir, { recursive: true });

  const videos = fs
    .readdirSync(videoDir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".mp4"))
    .map((e) => e.name)
    .sort((a, b) => a.localeCompare(b));

  if (videos.length === 0) {
    console.error(`ERROR: no .mp4 files in ${path.relative(root, videoDir)}.`);
    process.exit(1);
  }

  const entries = [];
  let generated = 0;
  let skipped = 0;

  for (const name of videos) {
    const src = path.join(videoDir, name);
    const posterName = `${path.basename(name, path.extname(name))}.jpg`;
    const dest = path.join(posterDir, posterName);

    if (isFresh(src, dest)) skipped++;
    else {
      await extractPoster(src, dest, name);
      generated++;
    }

    const { width, height, durationSeconds } = await probe(src);
    entries.push({
      file: name,
      poster: `images/video-thumb/${posterName}`,
      width,
      height,
      durationSeconds,
    });
  }

  // Written unconditionally: the manifest is derived entirely from files that
  // exist right now, so a stale entry here would outlive a deleted video.
  fs.writeFileSync(manifestPath, `${JSON.stringify(entries, null, 2)}\n`);
  console.log(`wrote ${path.relative(root, manifestPath)} (${entries.length} items)`);
  console.log(
    `posters: generated=${generated} skipped=${skipped} total=${videos.length}`,
  );
  console.log("Next: npm run upload:media   # push the posters to R2");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
