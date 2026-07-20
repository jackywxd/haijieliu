#!/usr/bin/env node
/**
 * Upload media from the Gatsby project into R2 bucket haijie-media.
 *
 * Usage:
 *   node scripts/upload-r2.mjs                # music + images + icons
 *   node scripts/upload-r2.mjs --videos       # also upload videos (~5GB)
 *   node scripts/upload-r2.mjs --only videos
 *   node scripts/upload-r2.mjs --dry-run
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const BUCKET = "haijie-media";
const SOURCE = path.resolve(process.cwd(), "../haijie");
const CONCURRENCY = Number(process.env.UPLOAD_CONCURRENCY || 4);
const dryRun = process.argv.includes("--dry-run");
const only = (() => {
  const i = process.argv.indexOf("--only");
  return i >= 0 ? process.argv[i + 1] : null;
})();
const includeVideos =
  process.argv.includes("--videos") || only === "videos";

const jobs = [];

function walk(dir, filter) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === ".wrangler" || entry.name === "node_modules" || entry.name === ".DS_Store") {
      continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, filter));
    else if (!filter || filter(full)) out.push(full);
  }
  return out;
}

function addJob(localPath, key) {
  jobs.push({ localPath, key });
}

function plan() {
  const groups = {
    music: () => {
      for (const f of walk(path.join(SOURCE, "src/assets/music"), (p) =>
        /\.(mp3|m4a)$/i.test(p)
      )) {
        addJob(f, `music/${path.basename(f)}`);
      }
    },
    images: () => {
      for (const f of walk(path.join(SOURCE, "src/assets/gallery"))) {
        addJob(f, `images/gallery/${path.basename(f)}`);
      }
      for (const f of walk(path.join(SOURCE, "src/assets/bg"))) {
        addJob(f, `images/bg/${path.basename(f)}`);
      }
      for (const f of walk(path.join(SOURCE, "src/assets/images"), (p) =>
        /\.(jpe?g|png|gif|webp|svg)$/i.test(p)
      )) {
        addJob(f, `images/${path.basename(f)}`);
      }
      for (const f of walk(path.join(SOURCE, "src/assets/img"))) {
        addJob(f, `images/icons/${path.basename(f)}`);
      }
    },
    videos: () => {
      const root = path.join(SOURCE, "static/videos");
      for (const f of walk(root, (p) =>
        /\.(m3u8|m4s|mp4|ts)$/i.test(p)
      )) {
        const rel = path.relative(root, f).split(path.sep).join("/");
        addJob(f, `videos/${rel}`);
      }
    },
  };

  if (only) {
    if (!groups[only]) throw new Error(`Unknown --only ${only}`);
    groups[only]();
  } else {
    groups.music();
    groups.images();
    if (includeVideos) groups.videos();
  }
}

function putObject({ localPath, key }) {
  return new Promise((resolve, reject) => {
    if (dryRun) {
      console.log(`[dry-run] ${key}`);
      resolve();
      return;
    }
    const child = spawn(
      "wrangler",
      ["r2", "object", "put", `${BUCKET}/${key}`, "--file", localPath, "--remote"],
      { stdio: ["ignore", "pipe", "pipe"] }
    );
    let err = "";
    child.stderr.on("data", (d) => {
      err += d.toString();
    });
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${key}: ${err || `exit ${code}`}`));
    });
  });
}

async function runPool() {
  plan();
  console.log(`Uploading ${jobs.length} objects (concurrency=${CONCURRENCY})`);
  let done = 0;
  let failed = 0;
  let idx = 0;

  async function worker() {
    while (idx < jobs.length) {
      const job = jobs[idx++];
      try {
        await putObject(job);
        done++;
        if (done % 25 === 0 || done === jobs.length) {
          console.log(`progress ${done}/${jobs.length} (failed=${failed})`);
        }
      } catch (e) {
        failed++;
        console.error(String(e.message || e));
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, jobs.length) }, () => worker())
  );
  console.log(`Done. uploaded=${done} failed=${failed} total=${jobs.length}`);
  if (failed) process.exitCode = 1;
}

runPool().catch((e) => {
  console.error(e);
  process.exit(1);
});
