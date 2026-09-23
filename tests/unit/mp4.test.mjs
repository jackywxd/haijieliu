// Protects: a video that plays on desktop and on no Apple device, because its
// H.264 level is above what WebKit accepts. The production smoke test reads
// the level off the deployed files with these functions; if they misread it,
// that check passes over exactly the file it exists to catch.
//
// Fixtures are tiny encodes whose level and box order were confirmed with
// ffprobe rather than with this code.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  MAX_APPLE_H264_LEVEL,
  moovExtent,
  videoCodec,
} from "../../scripts/lib/mp4.mjs";

const fixture = (name) =>
  readFileSync(new URL(`../fixtures/${name}`, import.meta.url));

test("reads a compliant H.264 level", () => {
  const codec = videoCodec(fixture("h264-level40.mp4"));
  assert.equal(codec.codec, "avc1");
  assert.equal(codec.level, 40);
  assert.ok(codec.level <= MAX_APPLE_H264_LEVEL);
});

test("reads the level 6.2 that broke playback on every iPhone", () => {
  const codec = videoCodec(fixture("h264-level62.mp4"));
  assert.equal(codec.codec, "avc1");
  assert.equal(codec.level, 62);
  assert.ok(codec.level > MAX_APPLE_H264_LEVEL);
});

test("identifies HEVC rather than reporting it as H.264", () => {
  assert.equal(videoCodec(fixture("hevc.mp4")).codec, "hvc1");
});

test("locates the whole moov at the front of a faststart file", () => {
  const buf = fixture("h264-level40.mp4");
  const { end, error } = moovExtent(buf);
  assert.equal(error, undefined);
  assert.ok(end > 0 && end <= buf.length);
});

test("reports a file whose index sits after the media", () => {
  const { error } = moovExtent(fixture("h264-not-faststart.mp4"));
  assert.match(error, /not faststart/);
});

// The smoke test reads only the head of each deployed file. A read window that
// stops inside moov must fail loudly, never quietly read as "no problem".
test("refuses a moov that the read cut short", () => {
  const buf = fixture("h264-level40.mp4");
  const { end } = moovExtent(buf);
  const truncated = buf.subarray(0, end - 1);
  assert.match(videoCodec(truncated).error, /truncated/);
});
