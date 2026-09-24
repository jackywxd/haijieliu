// Declare that this page's sound is the point of it, so the category never
// falls back to "ambient", which the ring/silent switch mutes and other apps'
// audio talks over. Safari 16.4+ only; elsewhere the property is absent.
//
// It also decides whether sound survives a locked screen. iOS interrupts Web
// Audio when Safari goes into the background, unless the page holds a
// "playback" session (WebCore AudioContext::shouldOverrideBackgroundPlaybackRestriction
// → hasPlayBackAudioSession). The home page music reaches the speaker through
// an AudioContext for its spectrum, so without this it falls silent on lock.
//
// Call it inside the tap that starts the sound. The session belongs to the
// document, so it carries across client-side navigation.
export function claimPlaybackAudioSession(): void {
  const session = (navigator as Navigator & { audioSession?: { type: string } })
    .audioSession;
  // Re-asserting the same value is a no-op, but flipping types mid-session
  // upsets iOS, so only write when it is not already what we need.
  if (!session || session.type === "playback") return;
  try {
    session.type = "playback";
  } catch {
    // Older implementations reject unknown values; the default still plays.
  }
}
