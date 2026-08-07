// ============================================================================
//  useMediaSync — shared React hook for narration playback + cue-driven media
//  synchronization. Used by ListingNarration, TourNarration, DoogieTour.
//
//  Contract:
//    const { audioRef, onTimeUpdate, cueIdx, progress, start, stop } =
//      useMediaSync({ sourceId, cues, scriptText });
//
//  When audio is playing:
//    * mediaBus.claim(sourceId) is called on play(), release() on stop().
//    * onTimeUpdate broadcasts the current cue via mediaBus.tick(sourceId,{...})
//      so any subscribed media element (photo gallery, iframe, MP4 <video>)
//      can seek to the matching visual — driven by ordinal-indexed cue lookup
//      from ms-based `start_ms` (if present) OR even ordinal distribution
//      across audio duration (fallback for legacy scripts without cues).
//
//  Backward-compat: works exactly like the current inline logic in
//  ListingNarration.jsx if the cue array uses {sentence, photo_idx} — the
//  ms-based path activates only when cues carry `start_ms` (populated by the
//  vision-tour narration service via `seek_ms`).
// ============================================================================
import { useCallback, useRef, useState, useMemo } from "react";
import mediaBus from "./mediaBus";

export function useMediaSync({ sourceId, cues, scriptText }) {
  const audioRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const [cueIdx, setCueIdx] = useState(0);

  // Precompute per-cue "start_ratio" from either explicit `start_ms` (when
  // Sonnet tour narration provided seek timestamps) OR even distribution.
  const cueBounds = useMemo(() => {
    if (!cues || !cues.length) return [];
    // Prefer explicit ms timestamps if present on ALL cues.
    if (cues.every(c => typeof c.start_ms === "number")) {
      // We can't compute ratio until we know audio.duration — return
      // ms-based bounds and defer ratio calc to onTimeUpdate.
      return cues.map(c => ({ ms: c.start_ms }));
    }
    // Even distribution across the audio timeline.
    return cues.map((_, i) => ({ ratio: i / Math.max(1, cues.length - 1) }));
  }, [cues]);

  const _findCueByTime = useCallback((currentMs, durationMs) => {
    if (!cueBounds.length) return 0;
    if (cueBounds[0].ms !== undefined) {
      // ms-based
      let best = 0;
      for (let i = 0; i < cueBounds.length; i++) {
        if (cueBounds[i].ms <= currentMs) best = i;
        else break;
      }
      return best;
    }
    // ratio-based
    const ratio = durationMs > 0 ? currentMs / durationMs : 0;
    return Math.min(cueBounds.length - 1, Math.floor(ratio * cueBounds.length));
  }, [cueBounds]);

  const onTimeUpdate = useCallback(() => {
    const a = audioRef.current;
    if (!a || !isFinite(a.duration) || !a.duration) return;
    const cur = a.currentTime * 1000;
    const dur = a.duration * 1000;
    const ratio = Math.max(0, Math.min(1, cur / dur));
    setProgress(ratio);
    const idx = _findCueByTime(cur, dur);
    setCueIdx(idx);
    // Broadcast to any subscriber (gallery / iframe / video) so it can seek.
    try {
      mediaBus.tick && mediaBus.tick(sourceId, {
        t_ms: cur, duration_ms: dur, cue_idx: idx,
        cue: cues && cues[idx] ? cues[idx] : null,
      });
    } catch { /* ignore */ }
  }, [cues, sourceId, _findCueByTime]);

  const start = useCallback(async () => {
    const a = audioRef.current;
    if (!a) return;
    mediaBus.claim(sourceId, { pause: () => { try { a.pause(); } catch {} } });
    try { await a.play(); } catch {}
  }, [sourceId]);

  const stop = useCallback(() => {
    const a = audioRef.current;
    if (a) { try { a.pause(); a.currentTime = 0; } catch {} }
    setProgress(0); setCueIdx(0);
    mediaBus.release(sourceId);
  }, [sourceId]);

  return { audioRef, onTimeUpdate, cueIdx, progress, start, stop };
}

export default useMediaSync;
