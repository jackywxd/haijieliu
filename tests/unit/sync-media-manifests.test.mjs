// Protects: a build that succeeds with no error while the home page backdrop
// and the gallery ship empty. scripts/sync-media-manifests.mjs rewrites the
// manifests from public/media on every build; when that directory is absent
// (LFS not pulled, directory moved, a CI checkout that skipped it) it must
// refuse rather than overwrite good manifests with [].
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT = fileURLToPath(
  new URL("../../scripts/sync-media-manifests.mjs", import.meta.url),
);

test("refuses to empty an existing manifest when the media is missing", (t) => {
  // The script works relative to its working directory, so it runs inside a
  // throwaway tree — never against the repository's own manifests.
  const root = mkdtempSync(path.join(tmpdir(), "manifest-guard-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));

  const content = path.join(root, "src/content");
  mkdirSync(content, { recursive: true });
  mkdirSync(path.join(root, "public/media"), { recursive: true }); // present, but empty
  const existing = ["a.jpg", "b.jpg"];
  const manifest = path.join(content, "bg-images.json");
  writeFileSync(manifest, JSON.stringify(existing));
  writeFileSync(path.join(content, "gallery-images.json"), JSON.stringify(existing));

  const run = spawnSync(process.execPath, [SCRIPT], { cwd: root, encoding: "utf8" });

  assert.notEqual(run.status, 0, "exited 0, so the build would have carried on");
  assert.match(run.stderr, /Refusing to overwrite/);
  assert.deepEqual(JSON.parse(readFileSync(manifest, "utf8")), existing);
});
