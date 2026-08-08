#!/usr/bin/env node
/**
 * Generate small grid thumbnails for the gallery so the /gallery page
 * doesn't have to load 55 full-resolution originals (~28MB) up front.
 * Full-resolution images are still used for the lightbox.
 *
 * Idempotent: skips a thumbnail if it's already newer than its source.
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const galleryDir = path.join(root, "public/media/images/gallery");
const thumbDir = path.join(root, "public/media/images/gallery-thumb");
const THUMB_WIDTH = 480;

const SUPPORTED_EXT = new Set([".jpg", ".jpeg", ".png", ".webp"]);

function applyFormat(pipeline, ext) {
  switch (ext) {
    case ".png":
      return pipeline.png({ quality: 78 });
    case ".webp":
      return pipeline.webp({ quality: 78 });
    default:
      return pipeline.jpeg({ quality: 78 });
  }
}

async function main() {
  if (!fs.existsSync(galleryDir)) {
    console.log("no gallery directory, skipping thumbnails");
    return;
  }
  fs.mkdirSync(thumbDir, { recursive: true });

  const files = fs
    .readdirSync(galleryDir, { withFileTypes: true })
    .filter((e) => e.isFile() && SUPPORTED_EXT.has(path.extname(e.name).toLowerCase()))
    .map((e) => e.name);

  let generated = 0;
  let skipped = 0;

  for (const name of files) {
    const srcPath = path.join(galleryDir, name);
    const destPath = path.join(thumbDir, name);
    const ext = path.extname(name).toLowerCase();

    if (fs.existsSync(destPath)) {
      const srcStat = fs.statSync(srcPath);
      const destStat = fs.statSync(destPath);
      if (destStat.mtimeMs >= srcStat.mtimeMs) {
        skipped++;
        continue;
      }
    }

    const pipeline = sharp(srcPath).resize({
      width: THUMB_WIDTH,
      withoutEnlargement: true,
    });
    await applyFormat(pipeline, ext).toFile(destPath);
    generated++;
  }

  console.log(
    `thumbnails: generated=${generated} skipped=${skipped} total=${files.length}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
