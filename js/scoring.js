// Оценка тренировки, рекомендации и автоматическая сборка.
//
// Идея: каждое упражнение даёт «эффективные подходы» каждой мышце пропорционально
// её нагрузке (основная мышца — полный подход, вторичная — часть подхода).
// Дальше сравниваем, сколько получила каждая часть выбранных групп, с разумными
// диапазонами на одну тренировку (зависят от уровня и числа групп).

import { EX, EXERCISES, cosine, available, groupLoad, unitOf } from './data/exercises.js';
import { MUSCLES, GROUPS, LEVELS, GOALS, GROUP_ORDER } from './data/muscles.js';

/** Вклад одного подхода в мышцу при нагрузке a (0…100). */
export const setWeight = (a) => (a < 15 ? 0 : Math.min(1, a / 85));

export function effective(items) {
  const eff = {};
  for (const it of items) {
    const e = EX[it.ex];
    if (!e) continue;
    for (const [m, a] of Object.entries(e.m)) eff[m] = (eff[m] || 0) + it.sets * setWeight(a);
  }
  return eff;
}

export function targetsOf(groups) {
  const t = new Map();
  const multi = groups.length >= 3;
  for (const g of groups)
    for (const [m, wt, detail] of GROUPS[g].muscles) {
      const w = detail && multi ? wt * 0.5 : wt;
      t.set(m, Math.max(t.get(m) || 0, w));
    }
  return t;
}

/** Почти одинаковые упражнения (дают одну и ту же нагрузку). */
export function isDuplicate(a, b) {
  if (a.id === b.id) return true;
  const sim = cosine(a, b);
  if (a.primary === b.primary && a.move === b.move) return true; // одно и то же движение (штанга / гантели / вариант)
  return sim >= 0.97 || (sim >= 0.94 && a.primary === b.primary && a.type === b.type);
}

/** Если цель не выбрана — определяем группы по основным мышцам упражнений. */
export function inferGroups(items) {
  const count = {};
  for (const it of items) {
    const g = EX[it.ex]?.primaryGroup;
    if (g) count[g] = (count[g] || 0) + it.sets;
  }
  return GROUP_ORDER.filter((g) => count[g]).sort((a, b) => count[b] - count[a]).slice(0, 5);
}

export function ranges(groups, level = 'intermediate') {
  const n = Math.max(1, groups.length);
  const lvl = LEVELS[level]?.vol ?? 1;
  const scale = 1 / (1 + 0.35 * (n - 1));
  const lo = [8, 8, 12, 14, 16, 16][Math.min(n, 5)] * lvl;
  return {
    minEff: 5 * lvl * scale,
    maxEff: Math.max(4.5, 11 * lvl * scale),
    setsLo: Math.round(lo),
    setsHi: Math.round(lo + 8 + 2 * Math.min(n, 4)),
    exLo: n === 1 ? 3 : Math.min(5, n + 1),
    exHi: Math.min(9, 4 + 2 * n),
  };
}

const clamp01 = (v) => Math.max(0, Math.min(1, v));

/** Доля нагрузки упражнения, которая приходится на выбранные мышцы. */
function focusShare(e, targets) {
  let t = 0;
  let all = 0;
  for (const [m, a] of Object.entries(e.m)) {
    all += a;
    if (targets.has(m)) t += a;
  }
  return all ? t / all : 0;
}

export function targetLoad(e, targets) {
  let best = 0;
  for (const [m, wt] of targets) if (wt >= 0.5) best = Math.max(best, e.m[m] || 0);
  return best;
}

/** Оценка без рекомендаций (быстрая — используется для подбора). */
export function scoreOnly(w) {
  return analyze(w).score;
}

function analyze(w) {
  const items = w.items || [];
  const groups = w.groups?.length ? w.groups : inferGroups(items);
  const R = ranges(groups, w.level);
  const targets = targetsOf(groups);
  const eff = effective(items);
  const totalSets = items.reduce((s, it) => s + it.sets, 0);

  if (!items.length || !groups.length) return { score: 0, groups, R, targets, eff, totalSets, parts: null };

  // 1. Покрытие: средняя по всем частям + самая отстающая ключевая часть
  let covSum = 0;
  let wtSum = 0;
  let covMin = 1;
  const cov = {};
  for (const [m, wt] of targets) {
    cov[m] = clamp01((eff[m] || 0) / (R.minEff * wt));
    covSum += wt * cov[m];
    wtSum += wt;
    if (wt === 1) covMin = Math.min(covMin, cov[m]);
  }
  const coverage = 0.5 * (covSum / wtSum) + 0.5 * covMin;

  // 2. Объём сессии и «мусорный» объём
  const s1 =
    totalSets < R.setsLo
      ? (totalSets / R.setsLo) ** 2
      : totalSets <= R.setsHi
        ? 1
        : clamp01(1 - (totalSets - R.setsHi) / (R.setsHi * 0.6));
  let over = 0;
  for (const [m, wt] of targets) {
    const v = eff[m] || 0;
    if (v > R.maxEff) over += ((v - R.maxEff) / R.maxEff) * Math.max(0.5, wt);
  }
  const volume = 0.6 * s1 + 0.4 * clamp01(1 - over * 0.6);

  // Качество (баланс, разнообразие, фокус) имеет смысл только у достаточно полной тренировки
  const q = clamp01(totalSets / R.setsLo) ** 0.8;

  // 3. Баланс между ключевыми частями
  const core = [...targets].filter(([, wt]) => wt === 1).map(([m]) => Math.min(eff[m] || 0, R.maxEff));
  let balance = 1;
  if (core.length > 1) {
    const mean = core.reduce((s, v) => s + v, 0) / core.length;
    if (mean <= 0) balance = 0;
    else {
      const sd = Math.sqrt(core.reduce((s, v) => s + (v - mean) ** 2, 0) / core.length);
      balance = clamp01(1 - (sd / mean - 0.15) / 0.6);
    }
  }

  // 4. Структура: порядок, базовые упражнения, количество, повторения
  const exs = items.map((it) => EX[it.ex]);
  let inv = 0;
  for (let i = 0; i < exs.length; i++)
    for (let j = i + 1; j < exs.length; j++)
      if (exs[i].type === 'isolation' && exs[j].type === 'compound' && targetLoad(exs[j], targets) >= 50) inv++;
  const order = clamp01(1 - inv * 0.34);
  const bigGroups = groups.filter((g) => GROUPS[g].big);
  const withCompound = bigGroups.filter((g) => exs.some((e) => e.type === 'compound' && groupLoad(e, g) >= 60));
  const compound = bigGroups.length ? withCompound.length / bigGroups.length : 1;
  const n = items.length;
  const count = n < R.exLo ? n / R.exLo : n > R.exHi ? clamp01(1 - (n - R.exHi) * 0.2) : 1;
  const goal = GOALS[w.goal] || GOALS.hypertrophy;
  let repFit = 0;
  let repN = 0;
  for (const it of items) {
    const e = EX[it.ex];
    if (unitOf(e)) continue;
    const [lo, hi] = goal[e.type];
    const d = it.reps < lo ? lo - it.reps : it.reps > hi ? it.reps - hi : 0;
    repFit += clamp01(1 - d / (hi - lo + 4));
    repN++;
  }
  const reps = repN ? repFit / repN : 1;
  const offTarget = items.map((it, i) => [i, targetLoad(EX[it.ex], targets)]).filter(([, l]) => l < 40);
  const offShare = offTarget.length / n;
  const structure = (0.35 * order + 0.2 * compound + 0.25 * count + 0.2 * reps) * (1 - 0.5 * offShare);

  // 5. Разнообразие: дубли и почти одинаковые упражнения
  const dups = [];
  for (let i = 0; i < exs.length; i++)
    for (let j = i + 1; j < exs.length; j++) if (isDuplicate(exs[i], exs[j])) dups.push([i, j]);
  const variety = clamp01(1 - dups.length * 0.45);

  // 6. Фокус: какая доля всей работы приходится на выбранные мышцы
  let tSum = 0;
  let all = 0;
  for (const [m, v] of Object.entries(eff)) {
    all += v;
    if (targets.has(m)) tSum += v;
  }
  const focusRatio = all ? tSum / all : 0;
  const focus = clamp01((focusRatio - 0.3) / 0.3) * (1 - 0.6 * offShare);

  const parts = [
    { key: 'coverage', name: 'Покрытие', max: 35, v: coverage, hint: 'Все ли части выбранных мышц получили достаточно работы — особенно самая отстающая' },
    { key: 'volume', name: 'Объём', max: 20, v: volume, hint: 'Общее число подходов за тренировку и отсутствие «мусорного» объёма' },
    { key: 'balance', name: 'Баланс', max: 15, v: balance * q, hint: 'Равномерность нагрузки между ключевыми частями мышц' },
    { key: 'structure', name: 'Структура', max: 15, v: structure, hint: 'Базовые упражнения в начале, разумное число упражнений, повторения под цель' },
    { key: 'focus', name: 'Фокус', max: 10, v: focus * q, hint: 'Доля всей работы, которая приходится на выбранные мышцы' },
    { key: 'variety', name: 'Разнообразие', max: 5, v: variety * q, hint: 'Нет дублирующих друг друга упражнений' },
  ];
  const score = Math.round(parts.reduce((s, p) => s + p.v * p.max, 0));

  return {
    score, parts, groups, R, targets, eff, cov, totalSets, inv, bigGroups, withCompound,
    dups, offTarget, focusRatio, exs, goal, inferred: !w.groups?.length,
  };
}

export function gradeOf(score) {
  if (score >= 92) return { label: 'Идеально', letter: 'S', text: 'Сбалансированная, грамотно выстроенная тренировка.' };
  if (score >= 80) return { label: 'Отлично', letter: 'A', text: 'Сильная тренировка — осталась пара мелочей.' };
  if (score >= 65) return { label: 'Хорошо', letter: 'B', text: 'Хорошая основа, но есть что улучшить.' };
  if (score >= 50) return { label: 'Неплохо', letter: 'C', text: 'Есть заметные пробелы в нагрузке.' };
  if (score >= 32) return { label: 'Можно лучше', letter: 'D', text: 'Части мышц остаются почти без работы.' };
  return { label: 'Слабо', letter: 'E', text: 'Тренировку стоит пересобрать.' };
}

const mName = (m) => `«${MUSCLES[m].name}»`;
const fmt = (v) => (Math.round(v * 10) / 10).toString().replace('.', ',');
function plural(n, one, few, many) {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b > 1 && b < 5) return few;
  if (b === 1) return one;
  return many;
}

/** Вставка с сохранением правила «базовые → изолирующие». */
export function insertSorted(items, it) {
  const e = EX[it.ex];
  if (e.type === 'isolation') return [...items, it];
  const firstIso = items.findIndex((x) => EX[x.ex].type === 'isolation');
  if (firstIso < 0) return [...items, it];
  return [...items.slice(0, firstIso), it, ...items.slice(firstIso)];
}

const defaultSets = (e) => (e.type === 'compound' ? 4 : 3);
function repsFor(e, goal) {
  const [lo, hi] = (GOALS[goal] || GOALS.hypertrophy)[e.type];
  return Math.round((lo + hi) / 2);
}

/** Упражнения, которые лучше всего поднимут оценку (по реальному приросту). */
export function suggestFor(w, { muscle = null, compoundOnly = false, eqSet = null, limit = 3, group = null } = {}) {
  const groups = w.groups?.length ? w.groups : inferGroups(w.items);
  const targets = targetsOf(groups);
  const base = scoreOnly(w);
  const have = new Set(w.items.map((it) => it.ex));
  return EXERCISES.filter(
    (e) =>
      !have.has(e.id) &&
      (!eqSet || available(e, eqSet)) &&
      (!compoundOnly || e.type === 'compound') &&
      (!muscle || (e.m[muscle] || 0) >= 55) &&
      (!group || groupLoad(e, group) >= 60) &&
      focusShare(e, targets) >= 0.3,
  )
    .map((e) => {
      const items = insertSorted(w.items, { ex: e.id, sets: defaultSets(e), reps: repsFor(e, w.goal) });
      const gain = scoreOnly({ ...w, items }) - base;
      const dup = w.items.some((it) => isDuplicate(EX[it.ex], e)) ? 15 : 0;
      return { e, gain, rank: gain - dup + (muscle ? ((e.m[muscle] || 0) / 100) * 25 : 0) };
    })
    .sort((a, b) => b.rank - a.rank)
    .slice(0, limit)
    .map(({ e, gain }) => ({ e, gain: Math.round(gain) }));
}

/** Полный отчёт с рекомендациями. */
export function evaluate(w, { eqSet = null } = {}) {
  const A = analyze(w);
  const recs = [];
  if (!w.items.length) {
    recs.push({ kind: 'info', text: 'Добавьте упражнения — оценка появится сразу. Или нажмите <b>«Собрать за меня»</b>.' });
    return { ...A, grade: null, recs };
  }
  if (!A.groups.length) {
    recs.push({ kind: 'info', text: 'Выберите группы мышц, которые хотите тренировать, — тогда оценка будет точнее.' });
    return { ...A, grade: null, recs };
  }
  if (A.inferred) {
    recs.push({
      kind: 'info',
      text: `Цель не выбрана — оцениваю как тренировку на: <b>${A.groups.map((g) => GROUPS[g].name).join(', ')}</b>. Выберите группы выше, чтобы уточнить.`,
    });
  }
  const sugg = (o) => suggestFor(w, { eqSet, ...o });

  // пробелы в покрытии
  const gaps = [...A.targets]
    .map(([m, wt]) => ({ m, wt, c: A.cov[m], v: A.eff[m] || 0, need: A.R.minEff * wt }))
    .filter((x) => x.c < 0.85 && x.wt >= 0.5)
    .sort((a, b) => b.wt - a.wt || a.c - b.c);
  for (const g of gaps.slice(0, 3)) {
    const severe = g.c < 0.5 && g.wt === 1;
    recs.push({
      kind: severe ? 'bad' : 'warn',
      text: severe
        ? `<b>${mName(g.m)}</b> почти без нагрузки: ${fmt(g.v)} из ~${fmt(g.need)} эффективных подходов.`
        : `<b>${mName(g.m)}</b> — недобор: ${fmt(g.v)} из ~${fmt(g.need)} эффективных подходов. Добавьте подход или упражнение.`,
      sugg: sugg({ muscle: g.m }),
    });
  }

  // нет базового упражнения
  for (const g of A.bigGroups.filter((g) => !A.withCompound.includes(g))) {
    recs.push({
      kind: 'warn',
      text: `Нет базового (многосуставного) упражнения на группу <b>${GROUPS[g].name}</b> — именно такие упражнения дают основной стимул.`,
      sugg: sugg({ group: g, compoundOnly: true }),
    });
  }

  // перегруз
  for (const [m, wt] of A.targets) {
    const v = A.eff[m] || 0;
    if (v > A.R.maxEff * 1.12 && wt >= 0.5) {
      const cut = Math.max(1, Math.round(v - A.R.maxEff));
      recs.push({
        kind: 'warn',
        text: `<b>${mName(m)}</b> — перебор: ${fmt(v)} эффективных подходов при полезном максимуме ~${fmt(A.R.maxEff)} за тренировку. Уберите ${cut} ${plural(cut, 'подход', 'подхода', 'подходов')} или одно упражнение.`,
      });
    }
  }

  // объём сессии
  if (A.totalSets < A.R.setsLo)
    recs.push({ kind: 'warn', text: `Всего ${A.totalSets} ${plural(A.totalSets, 'подход', 'подхода', 'подходов')} — маловато. Для этой цели оптимально ${A.R.setsLo}–${A.R.setsHi}.` });
  else if (A.totalSets > A.R.setsHi * 1.1)
    recs.push({ kind: 'warn', text: `${A.totalSets} ${plural(A.totalSets, 'подход', 'подхода', 'подходов')} — тренировка затянется, а качество последних подходов упадёт. Оптимально ${A.R.setsLo}–${A.R.setsHi}.` });

  // порядок
  if (A.inv > 0) {
    const firstIso = A.exs.findIndex((e) => e.type === 'isolation');
    const lateCompound = A.exs.findIndex((e, i) => i > firstIso && e.type === 'compound' && targetLoad(e, A.targets) >= 50);
    if (firstIso >= 0 && lateCompound >= 0)
      recs.push({
        kind: 'warn',
        action: 'sort',
        text: `Поставьте базовое упражнение «${A.exs[lateCompound].name}» перед изолирующим «${A.exs[firstIso].name}»: тяжёлые многосуставные упражнения лучше делать первыми, пока есть силы.`,
      });
  }

  // дубли
  for (const [i, j] of A.dups.slice(0, 2)) {
    const a = A.exs[i];
    const b = A.exs[j];
    recs.push({
      kind: 'info',
      text:
        a.id === b.id
          ? `Упражнение «${a.name}» добавлено дважды — лучше объединить подходы или заменить одно из них.`
          : `Упражнения «${a.name}» и «${b.name}» почти дублируют друг друга. Замените одно на упражнение с другим углом нагрузки.`,
    });
  }

  // не по теме
  for (const [i] of A.offTarget.slice(0, 2)) {
    recs.push({
      kind: 'warn',
      text: `Упражнение «${A.exs[i].name}» почти не задействует выбранные группы и только отнимает силы. Перенесите его в другую тренировку или добавьте его группу в цель.`,
    });
  }

  // повторения под цель
  const badReps = w.items
    .map((it) => [it, EX[it.ex]])
    .filter(([it, e]) => !unitOf(e) && (it.reps < A.goal[e.type][0] - 1 || it.reps > A.goal[e.type][1] + 2));
  if (badReps.length) {
    const [it, e] = badReps[0];
    const [lo, hi] = A.goal[e.type];
    recs.push({
      kind: 'info',
      text: `Цель «${A.goal.name}»: в ${e.type === 'compound' ? 'базовых' : 'изолирующих'} упражнениях лучше ${lo}–${hi} повторений (сейчас в «${e.name}» — ${it.reps}).`,
    });
  }

  // сильная косвенная нагрузка вне цели
  const heavyOff = Object.entries(A.eff)
    .filter(([m, v]) => !A.targets.has(m) && v >= A.R.maxEff * 0.75 && v >= 5)
    .sort((a, b) => b[1] - a[1])[0];
  if (heavyOff)
    recs.push({
      kind: 'info',
      text: `Много косвенной работы на ${mName(heavyOff[0])} (${fmt(heavyOff[1])} эфф. подх.) — учтите это, планируя следующие тренировки.`,
    });

  const hasBad = recs.some((r) => r.kind === 'bad');
  const hasWarn = recs.some((r) => r.kind === 'warn');
  if (A.score >= 85 && !hasBad && !hasWarn)
    recs.unshift({ kind: 'good', text: 'Все ключевые части мышц проработаны, объём и порядок в норме. Отличная тренировка!' });
  else if (A.score >= 70 && gaps.length === 0)
    recs.unshift({ kind: 'good', text: 'Все части выбранных мышц получают достаточно нагрузки.' });

  // Оценка «Идеально» — только без замечаний; слишком короткая тренировка — не выше «Хорошо».
  let score = A.score;
  if (hasBad) score = Math.min(score, 79);
  else if (hasWarn) score = Math.min(score, 91);
  if (A.totalSets < A.R.setsLo) score = Math.min(score, Math.round(55 + (25 * A.totalSets) / A.R.setsLo));
  return { ...A, score, grade: gradeOf(score), recs };
}

/**
 * Автосборка тренировки:
 *  1) по одному лучшему базовому упражнению на каждую крупную группу;
 *  2) «жадно» добавляем упражнения, пока растёт оценка;
 *  3) подгоняем число подходов.
 */
export function autoBuild({ groups, level = 'intermediate', goal = 'hypertrophy', eqSet, random = false }) {
  const targets = targetsOf(groups);
  const R = ranges(groups, level);
  const w = { groups, level, goal };
  const pool = EXERCISES.filter(
    (e) =>
      available(e, eqSet) &&
      !unitOf(e) &&
      targetLoad(e, targets) >= 55 &&
      (groups.includes(e.primaryGroup) || focusShare(e, targets) >= 0.5),
  );
  const mk = (e) => ({ ex: e.id, sets: 3, reps: repsFor(e, goal) });
  const jitter = () => (random ? Math.random() * 5 : 0);
  let items = [];
  const has = (e) => items.some((it) => isDuplicate(EX[it.ex], e));

  // 1. базовые упражнения на крупные группы
  for (const g of groups.filter((g) => GROUPS[g].big)) {
    if (items.some((it) => EX[it.ex].type === 'compound' && groupLoad(EX[it.ex], g) >= 60)) continue;
    const ranked = pool
      .filter((e) => e.type === 'compound' && !has(e) && groupLoad(e, g) >= 70 && e.level <= (level === 'beginner' ? 2 : 3))
      .map((e) => [scoreOnly({ ...w, items: insertSorted(items, mk(e)) }) + jitter() + (e.primaryGroup === g ? 3 : 0), e])
      .sort((a, b) => b[0] - a[0]);
    if (ranked.length) items = insertSorted(items, mk(ranked[0][1]));
  }

  // 2. жадное добавление
  let cur = scoreOnly({ ...w, items });
  while (items.length < R.exHi) {
    const ranked = pool
      .filter((e) => !has(e))
      .map((e) => {
        const cand = insertSorted(items, mk(e));
        return [scoreOnly({ ...w, items: cand }), e, cand];
      })
      .map((x) => [x[0] + jitter(), ...x.slice(1), x[0]])
      .sort((a, b) => b[0] - a[0]);
    if (!ranked.length) break;
    const pick = random ? ranked[Math.floor(Math.random() * Math.min(3, ranked.length))] : ranked[0];
    const real = pick[3];
    if (real <= cur + (items.length >= R.exLo ? 1.5 : 0.2)) break;
    items = pick[2];
    cur = real;
  }

  // самые тяжёлые базовые — в начало
  const heavy = (e) => (e.eq.includes('barbell') ? 3 : 0) + Object.values(e.m).reduce((s, v) => s + v, 0) / 100;
  const compounds = items.filter((it) => EX[it.ex].type === 'compound').sort((a, b) => heavy(EX[b.ex]) - heavy(EX[a.ex]));
  items = [...compounds, ...items.filter((it) => EX[it.ex].type !== 'compound')];

  // 3. подгонка подходов (базовые 3–5, изолирующие 2–4)
  items = items.map((it) => ({ ...it, sets: defaultSets(EX[it.ex]) }));
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < items.length; i++) {
      let best = items[i].sets;
      let bestScore = scoreOnly({ ...w, items });
      for (const s of EX[items[i].ex].type === 'compound' ? [3, 4, 5] : [2, 3, 4]) {
        const trial = items.map((it, k) => (k === i ? { ...it, sets: s } : it));
        const sc = scoreOnly({ ...w, items: trial });
        if (sc > bestScore + 0.2) {
          bestScore = sc;
          best = s;
        }
      }
      items[i] = { ...items[i], sets: best };
    }
  }
  return items;
}

/** Упорядочить: базовые → изолирующие (порядок внутри типа сохраняется). */
export function sortItems(items) {
  const rank = (it) => (EX[it.ex].type === 'compound' ? 0 : 1);
  return [...items].sort((a, b) => rank(a) - rank(b));
}

/** Тепловая карта нагрузки всей тренировки. */
export function workoutHeat(items) {
  const eff = effective(items);
  const max = Math.max(3, ...Object.values(eff));
  return Object.fromEntries(Object.entries(eff).map(([m, v]) => [m, v / max]));
}

export const estMinutes = (items) =>
  Math.round(items.reduce((s, it) => s + it.sets * (EX[it.ex].type === 'compound' ? 3.2 : 2.4), 0) + items.length * 1.5);
