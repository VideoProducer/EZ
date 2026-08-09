// Attempt to open the browser's native cast / AirPlay device picker with
// a single tap. Uses the Web `Remote Playback API`
// (HTMLMediaElement.remote.prompt) on Chromium/Edge and, as a fallback,
// Safari's older `webkitShowPlaybackTargetPicker()`. Both require:
//
//   1. A media element (`<audio>` or `<video>`) with a loaded source, AND
//   2. To be called inside a user-gesture handler (click, tap).
//
// The `mediaEl` argument is REQUIRED — we can't create one on the fly
// because both APIs need the element to have been in the DOM long enough
// to have loaded metadata. Present Mode + Cast modal each own a hidden
// silent-audio element expressly for this.
//
// Returns:
//   { supported: bool, opened: bool, reason?: string }
//
// `supported` = true when the browser exposes ONE of the two APIs.
// `opened`    = true when we actually called it (the OS picker is now
//                on screen). It doesn't mean the user picked a device.
// `reason`    = a short debug string when we returned `false/false`.

export async function openNativeCastPicker(mediaEl) {
  if (!mediaEl) return { supported: false, opened: false, reason: "no_media_el" };

  // Ensure the element has a source. Some browsers refuse to open the
  // picker on a fresh element with no `src`. We use a 1-second silent
  // audio blob so nothing plays.
  if (!mediaEl.src && !mediaEl.querySelector("source")) {
    try {
      mediaEl.src = _silentAudioDataUri();
      // Kick the media pipeline so `remote` gets initialised.
      try { await mediaEl.play(); mediaEl.pause(); } catch { /* autoplay-blocked; still works for remote */ }
    } catch { /* not fatal */ }
  }

  // Path 1: Remote Playback API (Chromium/Edge, iOS 15.4+ Safari).
  try {
    if (mediaEl.remote && typeof mediaEl.remote.prompt === "function") {
      await mediaEl.remote.prompt();
      return { supported: true, opened: true };
    }
  } catch (e) {
    // NotAllowedError = user cancelled, still counts as "opened".
    if (e && (e.name === "NotAllowedError" || e.name === "AbortError")) {
      return { supported: true, opened: true };
    }
    // Other errors → fall through to Safari path
  }

  // Path 2: Safari's older AirPlay picker.
  try {
    if (typeof mediaEl.webkitShowPlaybackTargetPicker === "function") {
      mediaEl.webkitShowPlaybackTargetPicker();
      return { supported: true, opened: true };
    }
  } catch { /* fall through */ }

  return { supported: false, opened: false, reason: "no_api" };
}

// 1-second silent WAV data URI (44 bytes header + 44100 bytes of silence
// → but we shorten to keep the URI compact). Used only to give the
// remote-playback API something to attach to; audio never audibly plays.
function _silentAudioDataUri() {
  // Minimal MP3 frame (silent, ~2 KB) — small enough to inline as data URI.
  return "data:audio/mpeg;base64," +
    "//uQxAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAAG6QCAgICAgICAgICAgICAgICA" +
    "gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA" +
    "gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgP8AAAAAA//uQxAADwAABpAAAAC" +
    "AAADSAAAAETEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV" +
    "VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV" +
    "VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV";
}

// Detect which cast pathway the current browser is most likely to succeed
// with — used to pick the icon + label shown next to the 1-tap button.
export function detectCastCapability() {
  if (typeof window === "undefined") return { kind: "unknown" };
  const ua = navigator.userAgent || "";
  const isIOS = /iPhone|iPad|iPod/.test(ua);
  const isSafari = /Safari/.test(ua) && !/Chrome|Chromium|Edg\//.test(ua);
  const isChromium = /Chrome|Chromium|Edg\//.test(ua) && !/Firefox/.test(ua);

  // Chromium exposes chrome.cast; Safari exposes webkitPlaybackTargetAvailabilityEvent
  const hasRemote = typeof window !== "undefined" &&
    typeof window.HTMLMediaElement !== "undefined" &&
    "remote" in window.HTMLMediaElement.prototype;

  if (isIOS || isSafari) return { kind: "airplay", hasRemote };
  if (isChromium)        return { kind: "chromecast", hasRemote };
  return { kind: "generic", hasRemote };
}
