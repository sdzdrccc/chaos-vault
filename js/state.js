import { STORAGE_KEY, defaultState, SKILLS, MEDIA } from "./config.js";

function mergeState(partial) {
  const base = defaultState();
  return {
    ...base,
    ...partial,
    skills: { ...base.skills, ...(partial.skills || {}) },
    media: { ...base.media, ...(partial.media || {}) },
    home: { ...base.home, ...(partial.home || {}) },
  };
}

export function loadLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    return mergeState(JSON.parse(raw));
  } catch {
    return defaultState();
  }
}

export function saveLocal(state) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ ...state, updatedAt: new Date().toISOString() }),
  );
}

export function resetLocal() {
  localStorage.removeItem(STORAGE_KEY);
  return defaultState();
}

export function defaultLocalIfMissing() {
  return defaultState();
}

export function ensureDomains(state) {
  for (const s of SKILLS) {
    if (!state.skills[s]) {
      state.skills[s] = {
        phase: "",
        goals: [],
        note: "",
        materials: [],
        checklist: [],
        archive: [],
      };
    }
  }
  for (const m of MEDIA) {
    if (!state.media[m]) state.media[m] = { want: [], doing: [], done: [] };
  }
  if (!state.home) state.home = { continues: [] };
  if (!state.inbox) state.inbox = [];
  return state;
}
