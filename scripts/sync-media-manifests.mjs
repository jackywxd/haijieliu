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

const bg = listFiles(path.join(mediaRoot, "images/bg"), (name) =>
  IMAGE_EXT.has(path.extname(name).toLowerCase()),
);
const gallery = listFiles(path.join(mediaRoot, "images/gallery"), (name) =>
  IMAGE_EXT.has(path.extname(name).toLowerCase()),
);

writeJson(path.join(contentDir, "bg-images.json"), bg);
writeJson(path.join(contentDir, "gallery-images.json"), gallery);

// Ensure videos.yaml references only m3u8 files that exist locally (or keep all YAML entries)
const videosYamlPath = path.join(contentDir, "videos.yaml");
const localM3u8 = new Set(
  listFiles(path.join(mediaRoot, "videos"), (name) =>
    name.toLowerCase().endsWith(".m3u8"),
  ),
);

if (fs.existsSync(videosYamlPath) && localM3u8.size) {
  const missing = [];
  const yaml = fs.readFileSync(videosYamlPath, "utf8");
  for (const match of yaml.matchAll(/link:\s*(\/videos\/[^\s]+)/g)) {
    const file = path.basename(match[1]);
    if (!localM3u8.has(file)) missing.push(file);
  }
  if (missing.length) {
    console.warn("videos.yaml references missing local playlists:");
    for (const m of missing) console.warn(`  - ${m}`);
  } else {
    console.log(`videos.yaml playlists OK (${localM3u8.size} local .m3u8)`);
  }
}

console.log("done");
