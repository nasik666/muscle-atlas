// Состояние приложения в localStorage: избранное, тренировки, настройки.

import { EQUIPMENT_ORDER } from './data/equipment.js';
import { EX, unitOf } from './data/exercises.js';
import { GROUPS } from './data/muscles.js';

const KEY = 'muscleatlas:v1';

const defaults = () => ({
  favorites: [],
  workouts: [],
  settings: { equipment: [...EQUIPMENT_ORDER], level: 'intermediate', goal: 'hypertrophy' },
});

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults();
    return sanitize(JSON.parse(raw));
  } catch {
    return defaults();
  }
}

function sanitize(s) {
  const d = defaults();
  const out = {
    favorites: Array.isArray(s?.favorites) ? s.favorites.filter((id) => EX[id]) : d.favorites,
    workouts: Array.isArray(s?.workouts) ? s.workouts.map(cleanWorkout).filter(Boolean) : d.workouts,
    settings: { ...d.settings, ...(s?.settings || {}) },
  };
  if (!Array.isArray(out.settings.equipment)) out.settings.equipment = d.settings.equipment;
  return out;
}

export function cleanWorkout(w) {
  if (!w || typeof w !== 'object') return null;
  const clampInt = (v, lo, hi, def) => {
    const n = Math.round(Number(v));
    return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : def;
  };
  return {
    id: typeof w.id === 'string' && w.id ? w.id : uid(),
    name: String(w.name || 'Тренировка').slice(0, 80),
    groups: Array.isArray(w.groups) ? w.groups.filter((g) => GROUPS[g]) : [],
    level: ['beginner', 'intermediate', 'advanced'].includes(w.level) ? w.level : 'intermediate',
    goal: ['hypertrophy', 'strength', 'endurance'].includes(w.goal) ? w.goal : 'hypertrophy',
    items: Array.isArray(w.items)
      ? w.items.filter((it) => it && EX[it.ex]).map((it) => ({ ex: it.ex, sets: clampInt(it.sets, 1, 10, 3), reps: clampInt(it.reps, 1, 120, 10) }))
      : [],
    created: Number(w.created) || Date.now(),
    updated: Number(w.updated) || Date.now(),
  };
}

let state = read();
const listeners = new Set();

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* приватный режим или переполнение — работаем в памяти */
  }
  listeners.forEach((fn) => fn(state));
}

window.addEventListener('storage', (e) => {
  if (e.key === KEY) {
    state = read();
    listeners.forEach((fn) => fn(state));
  }
});

export function uid() {
  return 'w' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export const store = {
  get state() {
    return state;
  },
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  // избранное
  isFav: (id) => state.favorites.includes(id),
  toggleFav(id) {
    const on = !state.favorites.includes(id);
    state.favorites = on ? [id, ...state.favorites] : state.favorites.filter((x) => x !== id);
    persist();
    return on;
  },

  // тренировки
  workouts: () => [...state.workouts].sort((a, b) => b.updated - a.updated),
  getWorkout: (id) => state.workouts.find((w) => w.id === id) || null,
  createWorkout(partial = {}) {
    const w = cleanWorkout({
      name: partial.name || nextName(partial.groups),
      groups: partial.groups || [],
      level: partial.level || state.settings.level,
      goal: partial.goal || state.settings.goal,
      items: partial.items || [],
    });
    w.id = uid();
    state.workouts.push(w);
    persist();
    return w;
  },
  saveWorkout(w) {
    const clean = cleanWorkout({ ...w, updated: Date.now() });
    const i = state.workouts.findIndex((x) => x.id === clean.id);
    if (i >= 0) state.workouts[i] = clean;
    else state.workouts.push(clean);
    persist();
    return clean;
  },
  deleteWorkout(id) {
    state.workouts = state.workouts.filter((w) => w.id !== id);
    persist();
  },
  duplicateWorkout(id) {
    const w = this.getWorkout(id);
    if (!w) return null;
    return this.createWorkout({ ...w, name: w.name + ' (копия)' });
  },
  addToWorkout(id, exId) {
    const w = this.getWorkout(id);
    if (!w) return null;
    const e = EX[exId];
    w.items.push({ ex: exId, sets: e.type === 'compound' ? 4 : 3, reps: defaultReps(e, w.goal) });
    return this.saveWorkout(w);
  },

  // настройки
  get settings() {
    return state.settings;
  },
  setSettings(patch) {
    state.settings = { ...state.settings, ...patch };
    persist();
  },

  // резервная копия
  exportJSON() {
    return JSON.stringify({ app: 'MuscleAtlas', version: 1, exported: new Date().toISOString(), ...state }, null, 2);
  },
  importJSON(text) {
    const data = JSON.parse(text);
    const clean = sanitize(data);
    const known = new Set(state.workouts.map((w) => w.id));
    for (const w of clean.workouts) {
      if (known.has(w.id)) w.id = uid();
      state.workouts.push(w);
    }
    state.favorites = [...new Set([...state.favorites, ...clean.favorites])];
    persist();
    return { workouts: clean.workouts.length, favorites: clean.favorites.length };
  },
};

function nextName(groups = []) {
  const n = state.workouts.length + 1;
  if (groups.length === 1) return `${GROUPS[groups[0]].name}: тренировка`;
  return `Тренировка ${n}`;
}

export function defaultReps(e, goal = 'hypertrophy') {
  const table = {
    hypertrophy: { compound: 8, isolation: 12 },
    strength: { compound: 5, isolation: 10 },
    endurance: { compound: 12, isolation: 15 },
  };
  const unit = unitOf(e);
  if (unit) return { 'с': 45, 'м': 40, 'шагов': 20 }[unit];
  return table[goal]?.[e.type] ?? 10;
}
