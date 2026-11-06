// Сборка базы упражнений и производные индексы.

import chest from './ex/chest.js';
import back from './ex/back.js';
import shoulders from './ex/shoulders.js';
import arms from './ex/arms.js';
import core from './ex/core.js';
import legs from './ex/legs.js';
import { MUSCLES, GROUPS } from './muscles.js';
import { EQUIPMENT } from './equipment.js';

export const EXERCISES = [...chest, ...back, ...shoulders, ...arms, ...core, ...legs];

export const EX = Object.fromEntries(EXERCISES.map((e) => [e.id, e]));

export const norm = (s) => String(s || '').toLowerCase().replace(/ё/g, 'е').trim();

const MUSCLE_IDS = Object.keys(MUSCLES);

for (const e of EXERCISES) {
  const entries = Object.entries(e.m).sort((a, b) => b[1] - a[1]);
  e.primary = entries[0][0];
  e.primaryGroup = MUSCLES[e.primary].group;
  e.groups = [...new Set(entries.filter(([, v]) => v >= 60).map(([m]) => MUSCLES[m].group))];
  e.sorted = entries;
  const len = Math.hypot(...entries.map(([, v]) => v));
  e.vec = Object.fromEntries(entries.map(([m, v]) => [m, v / len]));
  e.search = norm([e.name, e.en, e.alt, ...e.eq.map((q) => EQUIPMENT[q]?.name)].join(' '));
  for (const m of Object.keys(e.m)) {
    if (!MUSCLES[m]) console.warn(`Неизвестная мышца «${m}» в упражнении ${e.id}`);
  }
}

export function cosine(a, b) {
  let s = 0;
  for (const m in a.vec) if (b.vec[m]) s += a.vec[m] * b.vec[m];
  return s;
}

/** Упражнения, нагружающие мышцу, по убыванию нагрузки. */
export function exercisesForMuscle(id, min = 1) {
  return EXERCISES.filter((e) => (e.m[id] || 0) >= min).sort((a, b) => b.m[id] - a.m[id] || a.name.localeCompare(b.name, 'ru'));
}

/** Нагрузка упражнения на группу: максимум по её мышцам. */
export function groupLoad(e, groupId) {
  return Math.max(0, ...GROUPS[groupId].muscles.map(([m]) => e.m[m] || 0));
}

/** Для сортировки: ключевые части группы важнее второстепенных. */
export function groupRank(e, groupId) {
  return Math.max(0, ...GROUPS[groupId].muscles.map(([m, wt]) => (e.m[m] || 0) * (0.6 + 0.4 * wt)));
}

export function exercisesForGroup(groupId, min = 50) {
  return EXERCISES.filter((e) => groupLoad(e, groupId) >= min).sort(
    (a, b) => groupRank(b, groupId) - groupRank(a, groupId) || a.name.localeCompare(b.name, 'ru'),
  );
}

export function similarExercises(e, n = 4) {
  return EXERCISES.filter((x) => x.id !== e.id)
    .map((x) => [x, cosine(e, x) + (x.primary === e.primary ? 0.08 : 0)])
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([x]) => x);
}

/** Тепловая карта упражнения: нагрузка 0…1. */
export function heatOf(e) {
  return Object.fromEntries(Object.entries(e.m).map(([m, v]) => [m, v / 100]));
}

/** Единица «повторений»: '' — повторы, 'с' — секунды, 'м' — метры, 'шагов'. */
export function unitOf(e) {
  const m = /(с|м|шагов)$/.exec(e.reps || '');
  return m ? m[1] : '';
}

export const muscleCount = (id) => EXERCISES.filter((e) => (e.m[id] || 0) >= 50).length;

export function available(e, eqSet) {
  return e.eq.every((q) => eqSet.has(q));
}

export { MUSCLE_IDS };
