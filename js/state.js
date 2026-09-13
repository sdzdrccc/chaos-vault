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

export function hasUserData(state) {
  if (!state) return false;
  if (state.inbox?.length) return true;
  if (state.home?.continues?.length) return true;
  for (const s of Object.values(state.skills || {})) {
    if (s.phase || s.note) return true;
    if (s.goals?.length || s.materials?.length || s.checklist?.length || s.archive?.length) return true;
    if (s.llmPlatforms?.length) return true;
  }
  for (const m of Object.values(state.media || {})) {
    if (m.want?.length || m.doing?.length || m.done?.length) return true;
  }
  return false;
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
        llmPlatforms: [],
      };
    }
    if (s === "大模型" && !state.skills[s].llmPlatforms) {
      state.skills[s].llmPlatforms = [];
    }
  }
  for (const m of MEDIA) {
    if (!state.media[m]) state.media[m] = { want: [], doing: [], done: [] };
  }
  if (!state.home) state.home = { continues: [] };
  if (!state.inbox) state.inbox = [];
  return state;
}
