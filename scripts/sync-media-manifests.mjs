#!/usr/bin/env node
/**
 * Regenerate content manifests from public/media so newly added
 * images / videos are picked up at build time.
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const mediaRoot = path.join(root, "public/media");
const contentDir = path.join(root, "src/content");

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"]);

function listFiles(dir, filter) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && (!filter || filter(e.name)))
    .map((e) => e.name)
    .sort((a, b) => a.localeCompare(b));
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`wrote ${path.relative(root, filePath)} (${data.length} items)`);
}

// Refuse to overwrite a non-empty manifest with an empty one — that pattern
// means public/media wasn't found (missing Git LFS pull, moved directory,
// etc.), not that the media genuinely disappeared.
function writeJsonGuarded(filePath, data, label) {
  if (data.length === 0) {
    const existing = fs.existsSync(filePath)
      ? JSON.parse(fs.readFileSync(filePath, "utf8"))
      : [];
    if (existing.length > 0) {
      console.error(
        `ERROR: found 0 ${label} files, but ${path.relative(root, filePath)} already lists ${existing.length}.\n` +
          `Refusing to overwrite with an empty manifest — this usually means public/media is missing ` +
          `(e.g. Git LFS content wasn't pulled). Run 'git lfs pull' and check the directory exists, then retry.`,
      );
      process.exit(1);
    }
  }
  writeJson(filePath, data);
}

const bg = listFiles(path.join(mediaRoot, "images/bg"), (name) =>
  IMAGE_EXT.has(path.extname(name).toLowerCase()),
);
const gallery = listFiles(path.join(mediaRoot, "images/gallery"), (name) =>
  IMAGE_EXT.has(path.extname(name).toLowerCase()),
);

writeJsonGuarded(path.join(contentDir, "bg-images.json"), bg, "bg image");
writeJsonGuarded(path.join(contentDir, "gallery-images.json"), gallery, "gallery image");

// Ensure videos.json references only MP4 files that exist locally
const videosJsonPath = path.join(contentDir, "videos.json");
const localMp4 = new Set(
  listFiles(path.join(mediaRoot, "videos-mp4"), (name) =>
    name.toLowerCase().endsWith(".mp4"),
  ),
);

if (fs.existsSync(videosJsonPath) && localMp4.size) {
  const videos = JSON.parse(fs.readFileSync(videosJsonPath, "utf8"));
  const missing = videos
    .map((v) => path.basename(v.link))
    .filter((file) => !localMp4.has(file));
  if (missing.length) {
    console.warn("videos.json references missing local files:");
    for (const m of missing) console.warn(`  - ${m}`);
  } else {
    console.log(`videos.json OK (${localMp4.size} local .mp4)`);
  }
}

console.log("done");
