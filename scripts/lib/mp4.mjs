/**
 * Reads just enough of an MP4 to answer the two questions that decide whether
 * it plays on Apple devices: is the index (moov) ahead of the media (mdat),
 * and what H.264 profile/level does the video track declare?
 *
 * Apple's decoders stop at level 4.2 and WebKit refuses anything above it
 * outright, so an over-level file plays on a desktop browser and on no iPhone
 * at all. That exact failure shipped once already (every 1080p encode carried
 * level 6.2), so the smoke test reads the level off the deployed bytes.
 */

// Top-level boxes, in file order, as far as `buf` reaches. `end` may exceed
// buf.length when a box is only partly present — callers use it to decide how
// much more to read.
export function topLevelBoxes(buf) {
  const boxes = [];
  let off = 0;
  while (off + 8 <= buf.length) {
    let size = buf.readUInt32BE(off);
    const type = buf.toString("latin1", off + 4, off + 8);
    if (size === 1) {
      if (off + 16 > buf.length) break;
      size = Number(buf.readBigUInt64BE(off + 8));
    } else if (size === 0) {
      size = Infinity; // box runs to end of file
    }
    if (size < 8) break; // malformed; stop rather than loop forever
    boxes.push({ type, start: off, end: off + size });
    if (!Number.isFinite(size)) break;
    off += size;
  }
  return boxes;
}

// Byte range [0, end) that must be read to hold the complete moov, or a reason
// it cannot be found from the head of the file.
export function moovExtent(head) {
  for (const box of topLevelBoxes(head)) {
    if (box.type === "moov") return { end: box.end };
    if (box.type === "mdat") {
      return { error: "mdat precedes moov: the file is not faststart" };
    }
  }
  return { error: "no moov or mdat box in the bytes read" };
}

// `buf` must contain the whole moov (see moovExtent).
export function videoCodec(buf) {
  const moov = topLevelBoxes(buf).find((b) => b.type === "moov");
  if (!moov || moov.end > buf.length) {
    return { error: "moov box is missing or truncated" };
  }
  const body = buf.subarray(moov.start, moov.end);

  const avcc = body.indexOf("avcC", 0, "latin1");
  if (avcc !== -1 && avcc + 8 <= body.length) {
    // avcC payload: configurationVersion, AVCProfileIndication,
    // profile_compatibility, AVCLevelIndication.
    return { codec: "avc1", profile: body[avcc + 5], level: body[avcc + 7] };
  }
  if (body.indexOf("hvcC", 0, "latin1") !== -1) return { codec: "hvc1" };
  return { error: "no avcC or hvcC configuration in moov" };
}

export const MAX_APPLE_H264_LEVEL = 42;
