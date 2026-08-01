// Interactive Real Estate Journey Platform — client-side progress tracking.
// Anonymous users: localStorage. Authenticated users: syncs to CRM on change.
// Non-blocking — a network hiccup NEVER prevents the local UI from updating.

import { useState, useEffect, useCallback } from "react";
import axios from "axios";

const STORAGE_KEY = "ez_journey_progress";
const API = (process.env.REACT_APP_BACKEND_URL || "") + "/api";

const readLocal = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
  catch { return {}; }
};
const writeLocal = (data) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
};

// Optional CRM sync — fires only for authenticated users. Best-effort;
// never blocks UI. Errors are swallowed (offline / lapsed token / etc.).
const syncToCrm = async (progress) => {
  const token = localStorage.getItem("eztoken");
  if (!token) return;
  try {
    await axios.post(`${API}/journey/progress`, { progress }, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 4000,
    });
  } catch {}
};

// Merge remote → local (server-of-truth for authenticated users).
// On login, pull server progress once and merge with any anonymous work
// the visitor did before signing in.
export const hydrateFromCrm = async () => {
  const token = localStorage.getItem("eztoken");
  if (!token) return;
  try {
    const r = await axios.get(`${API}/journey/progress`, {
      headers: { Authorization: `Bearer ${token}` }, timeout: 4000,
    });
    const remote = r.data?.progress || {};
    const local = readLocal();
    // Deep-merge — server modules_completed OR client modules_completed.
    const merged = { ...remote };
    Object.keys(local).forEach(slug => {
      const l = local[slug]; const rr = remote[slug];
      if (!rr) { merged[slug] = l; return; }
      merged[slug] = {
        started_at: rr.started_at || l.started_at,
        last_visited_at: l.last_visited_at > rr.last_visited_at ? l.last_visited_at : rr.last_visited_at,
        current_stage: l.last_visited_at > rr.last_visited_at ? l.current_stage : rr.current_stage,
        modules_completed: Array.from(new Set([...(rr.modules_completed || []), ...(l.modules_completed || [])])),
      };
    });
    writeLocal(merged);
    // Push merged back so the server has the union too.
    syncToCrm(merged);
  } catch {}
};

// Journey progress hook — reads localStorage, exposes read/toggle helpers,
// syncs to CRM (if logged in) on any change.
export const useJourneyProgress = (journeySlug) => {
  const [allProgress, setAllProgress] = useState(() => readLocal());

  useEffect(() => {
    // Storage-event sync between tabs
    const onStorage = (e) => { if (e.key === STORAGE_KEY) setAllProgress(readLocal()); };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const persist = useCallback((next) => {
    writeLocal(next);
    setAllProgress(next);
    // Fire-and-forget CRM sync
    syncToCrm(next);
  }, []);

  const journey = allProgress[journeySlug] || null;

  const touchStage = useCallback((stageId) => {
    if (!journeySlug) return;
    const now = new Date().toISOString();
    const next = { ...allProgress };
    next[journeySlug] = {
      started_at: next[journeySlug]?.started_at || now,
      last_visited_at: now,
      current_stage: stageId,
      modules_completed: next[journeySlug]?.modules_completed || [],
    };
    persist(next);
  }, [journeySlug, allProgress, persist]);

  const toggleModule = useCallback((stageId, moduleId) => {
    if (!journeySlug) return;
    const key = `${stageId}__${moduleId}`;
    const now = new Date().toISOString();
    const next = { ...allProgress };
    const j = next[journeySlug] || { started_at: now, last_visited_at: now, current_stage: stageId, modules_completed: [] };
    const set = new Set(j.modules_completed);
    if (set.has(key)) set.delete(key); else set.add(key);
    next[journeySlug] = { ...j, last_visited_at: now, current_stage: stageId, modules_completed: [...set] };
    persist(next);
  }, [journeySlug, allProgress, persist]);

  return { journey, allProgress, touchStage, toggleModule };
};

// Returns the most-recent journey (for the Journey Dashboard "Continue" CTA).
export const getResumeJourney = () => {
  const all = readLocal();
  const entries = Object.entries(all);
  if (!entries.length) return null;
  entries.sort((a, b) => (b[1].last_visited_at || "").localeCompare(a[1].last_visited_at || ""));
  return { slug: entries[0][0], ...entries[0][1] };
};
