// ============================================================================
//  mediaBus — a lightweight singleton event bus that lets ALL audio/video
//  players on a page coordinate. Prevents Doogie's TTS voice-over playing
//  on top of a realtor-narrated MLS® video (Doug reported this Feb 2026).
//
//  API:
//   • claim(sourceId, controls?) — announce that `sourceId` just started
//     playing. Any previously-claimed source's `pause` callback is invoked.
//   • release(sourceId) — announce this source has stopped (idempotent).
//   • subscribe(callback) — receive every claim() so components that render
//     their own <audio>/iframe can react (e.g. iframe reload to stop video).
//
//  This bus lives ONLY in memory — nothing persists.
// ============================================================================

const _controls = new Map();   // sourceId -> { pause?: () => void }
const _listeners = new Set();  // callback(event)

let _current = null;           // the sourceId currently claiming the audio floor

export const claim = (sourceId, controls = {}) => {
  if (!sourceId) return;
  if (_current && _current !== sourceId) {
    // Pause the previous holder first so we never overlap.
    const prev = _controls.get(_current);
    try { prev?.pause?.(); } catch { /* ignore */ }
  }
  _current = sourceId;
  _controls.set(sourceId, controls || {});
  _listeners.forEach(fn => {
    try { fn({ type: "claim", sourceId }); } catch { /* ignore */ }
  });
};

export const release = (sourceId) => {
  if (_current === sourceId) _current = null;
  _controls.delete(sourceId);
  _listeners.forEach(fn => {
    try { fn({ type: "release", sourceId }); } catch { /* ignore */ }
  });
};

export const subscribe = (fn) => {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
};

export const current = () => _current;

export default { claim, release, subscribe, current };
