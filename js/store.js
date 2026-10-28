import { initSkills } from './engine.js';

const KEY = 'numi-math-v1';

export function defaultState() {
  const s = {
    version: 1,
    profile: null, // { name, avatar }
    settings: { sound: true, voice: true, voiceURI: '', dailyGoal: 20, unlockAll: false, pencil: true },
    stars: 0,
    xp: 0,
    skills: {},
    facts: {},
    daily: {},
    streak: { current: 0, best: 0, lastDay: null },
    badges: {},
    stickers: {},
    records: {},
    totals: { problems: 0, correct: 0, lessons: 0, perfect: 0, bestCombo: 0, packs: 0 },
    placementDone: false,
    ink: [],
    owned: {},
    outfit: {},
    lastChest: null,
    bosses: {},
    createdAt: Date.now(),
  };
  initSkills(s);
  return s;
}

function merge(base, saved) {
  for (const k of Object.keys(saved)) {
    if (saved[k] && typeof saved[k] === 'object' && !Array.isArray(saved[k]) && base[k] && typeof base[k] === 'object') {
      base[k] = merge(base[k], saved[k]);
    } else {
      base[k] = saved[k];
    }
  }
  return base;
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = merge(defaultState(), JSON.parse(raw));
      if (s.profile?.name === 'Isabela') s.profile.name = 'Isabella';
      return s;
    }
  } catch (e) {
    console.warn('No se pudo leer el progreso', e);
  }
  return defaultState();
}

export function save(state) {
  try {
    const { _lastPair, ...rest } = state;
    localStorage.setItem(KEY, JSON.stringify(rest));
  } catch (e) {
    console.warn('No se pudo guardar el progreso', e);
  }
}

export function reset() {
  try { localStorage.removeItem(KEY); } catch (e) { /* nada */ }
  return defaultState();
}

export function exportJson(state) {
  return JSON.stringify(state, null, 2);
}

export function importJson(text) {
  return merge(defaultState(), JSON.parse(text));
}
