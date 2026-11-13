// Тренировки: свои (конструктор) и готовые программы; создание новой (пустой или собранной автоматически).

import { bodySVG } from '../body/bodymap.js';
import { GROUPS, GROUP_ORDER, PRESETS, LEVELS, GOALS, MUSCLES } from '../data/muscles.js';
import { store } from '../store.js';
import { esc, icon, footer, fmtCount, modal, popMenu, toast, ringSVG, confirmDialog } from '../ui.js';
import { navigate } from '../router.js';
import { evaluate, workoutHeat, autoBuild, estMinutes } from '../scoring.js';
import { shareWorkout, groupNames } from './shared.js';
import { EX, unitOf } from '../data/exercises.js';
import { LEVEL_NAMES } from '../data/equipment.js';
import { PROGRAMS, PROGRAM, PLANS, PROGRAM_FILTERS, PLACE_NAMES } from '../data/programs.js';
import { photoThumb } from '../ui.js';

const LEVEL_NUM = { beginner: 1, intermediate: 2, advanced: 3 };
const toWorkout = (p) => ({ name: p.name, groups: p.groups, level: p.level, goal: p.goal, items: p.items.map(([ex, sets, reps]) => ({ ex, sets, reps })) });
const setsOf = (p) => p.items.reduce((n, [, sets]) => n + sets, 0);
const matches = (p, f) => f === 'all' || (f === 'beginner' ? p.level === 'beginner' : p.place === f);

export function renderWorkouts(view, _p, query) {
  let tab = query.tab === 'programs' || (!query.new && query.tab !== 'mine' && !store.workouts().length) ? 'programs' : 'mine';
  let filter = 'all';

  const head = (n) => `
      <div class="section-head page-head" style="margin-top:4px">
        <div class="grow"><span class="eyebrow">Конструктор и программы</span><h1 class="mt-8" style="font-size:clamp(26px,3vw,38px)">Тренировки</h1></div>
        <button class="btn icon" id="more" aria-label="Импорт и экспорт" title="Импорт и экспорт">${icon.more}</button>
        <button class="btn primary" id="new">${icon.plus}<span>Новая</span></button>
      </div>
      <div class="seg tabs" role="tablist">
        <button role="tab" data-tab="mine" class="${tab === 'mine' ? 'on' : ''}" aria-selected="${tab === 'mine'}">Мои${n ? ` · ${n}` : ''}</button>
        <button role="tab" data-tab="programs" class="${tab === 'programs' ? 'on' : ''}" aria-selected="${tab === 'programs'}">Готовые программы</button>
      </div>`;

  const mine = (list) => `
      <div class="panel quick" style="padding:18px 20px">
        <div class="row wrap"><b class="ico-inline">${icon.magic}Быстрый старт</b><span class="muted small">— сайт сам соберёт оптимальную тренировку под ваше оборудование</span></div>
        <div class="chips scroll-x mt-12">${PRESETS.map((p) => `<button class="chip" data-preset="${p.id}">${esc(p.name)}</button>`).join('')}</div>
      </div>
      ${
        list.length
          ? `<div class="wk-grid mt-24">${list.map(card).join('')}</div>`
          : `<div class="empty glass mt-24"><div class="ico">${icon.list}</div><h3>Своих тренировок пока нет</h3>
             <p>Возьмите готовую программу или соберите свою: выберите группы мышц, добавьте упражнения — и увидите оценку от 0 до 100 с подсказками.</p>
             <div class="row wrap" style="justify-content:center"><button class="btn primary" data-tab="programs">${icon.layers}Готовые программы</button><button class="btn" data-new>${icon.plus}Создать свою</button></div></div>`
      }`;

  const programs = () => {
    const plans = PLANS.filter((p) => matches(p, filter));
    const list = PROGRAMS.filter((p) => matches(p, filter));
    return `
      <div class="chips scroll-x" id="pg-filter">${PROGRAM_FILTERS.map((f) => `<button class="chip${filter === f.id ? ' on' : ''}" data-filter="${f.id}">${f.name}</button>`).join('')}</div>
      ${
        plans.length
          ? `<div class="section-head"><h2>Сплиты на неделю</h2></div>
             <div class="plan-row">${plans.map(planCard).join('')}</div>`
          : ''
      }
      <div class="section-head"><h2>Отдельные тренировки</h2><span class="muted small">${fmtCount(list.length, 'программа', 'программы', 'программ')}</span></div>
      <div class="wk-grid">${list.map(programCard).join('')}</div>`;
  };

  const draw = () => {
    const list = store.workouts();
    view.innerHTML = `${head(list.length)}<div class="tab-body">${tab === 'mine' ? mine(list) : programs()}</div>${footer()}`;
  };

  const card = (w) => {
    const r = evaluate(w);
    const heat = workoutHeat(w.items);
    const sets = w.items.reduce((s, it) => s + it.sets, 0);
    return `<article class="wk-card panel" data-w="${w.id}">
      <div class="top">
        <div class="body-pair">${bodySVG({ view: 'front', heat })}${bodySVG({ view: 'back', heat })}</div>
        <div class="grow">
          <h3><a href="#/workout/${w.id}">${esc(w.name)}</a></h3>
          <p class="small muted mt-8">${esc(groupNames(w.groups) || 'Цель не выбрана')}</p>
          <p class="xs faint mt-8">${fmtCount(w.items.length, 'упражнение', 'упражнения', 'упражнений')} · ${fmtCount(sets, 'подход', 'подхода', 'подходов')} · ~${estMinutes(w.items)} мин</p>
        </div>
        <div class="mini-ring" title="Оценка">${ringSVG(r.score, 58, 6)}<b>${w.items.length ? r.score : '—'}</b></div>
      </div>
      <div class="row">
        <a class="btn sm primary grow" href="#/workout/${w.id}">${icon.edit}Открыть</a>
        <button class="btn sm icon" data-share="${w.id}" aria-label="Поделиться" title="Поделиться">${icon.share}</button>
        <button class="btn sm icon" data-menu="${w.id}" aria-label="Ещё" title="Ещё">${icon.more}</button>
      </div>
    </article>`;
  };

  const programCard = (p) => {
    const w = toWorkout(p);
    const heat = workoutHeat(w.items);
    const r = evaluate(w);
    return `<article class="wk-card pg-card panel" data-pg="${p.id}">
      <div class="top">
        <div class="body-pair">${bodySVG({ view: 'front', heat })}${bodySVG({ view: 'back', heat })}</div>
        <div class="grow">
          <h3>${esc(p.name)}</h3>
          <div class="meta mt-8"><span class="tag accent">${PLACE_NAMES[p.place]}</span><span class="tag">${LEVEL_NAMES[LEVEL_NUM[p.level]]}</span></div>
        </div>
        ${p.noScore ? '' : `<div class="mini-ring" title="Оценка конструктора">${ringSVG(r.score, 58, 6)}<b>${r.score}</b></div>`}
      </div>
      <p class="small muted">${esc(p.desc)}</p>
      <p class="xs faint">${fmtCount(p.items.length, 'упражнение', 'упражнения', 'упражнений')} · ${fmtCount(setsOf(p), 'подход', 'подхода', 'подходов')} · ~${estMinutes(w.items)} мин${p.eqNote ? ` · ${esc(p.eqNote)}` : ''}</p>
      <div class="row">
        <button class="btn sm primary grow" data-pg-add="${p.id}">${icon.plus}Добавить себе</button>
        <button class="btn sm" data-pg-view="${p.id}">${icon.list}Состав</button>
      </div>
    </article>`;
  };

  const planCard = (pl) => `<article class="plan-card glass" data-plan="${pl.id}">
      <div class="meta"><span class="tag accent">${icon.clock}${esc(pl.freq)}</span><span class="tag">${PLACE_NAMES[pl.place]}</span><span class="tag">${LEVEL_NAMES[LEVEL_NUM[pl.level]]}</span></div>
      <h3>${esc(pl.name)}</h3>
      <p class="small muted">${esc(pl.desc)}</p>
      <ol class="plan-days">${pl.days.map((d, i) => `<li><button data-pg-view="${d}"><span class="num">${String.fromCharCode(65 + i)}</span><span class="grow">${esc(PROGRAM[d].name)}</span>${icon.right}</button></li>`).join('')}</ol>
      <button class="btn sm primary" data-plan-add="${pl.id}">${icon.plus}Добавить все ${pl.days.length} тренировки</button>
    </article>`;

  const addProgram = (p, { open = true } = {}) => {
    const w = store.createWorkout(toWorkout(p));
    if (open) {
      navigate(`#/workout/${w.id}`);
      toast(`«${p.name}» добавлена — меняйте под себя`);
    }
    return w;
  };

  const viewProgram = (p) => {
    const w = toWorkout(p);
    modal({
      title: p.name,
      body: `<p class="muted small">${esc(p.desc)}</p>
        <p class="xs faint mt-8">${PLACE_NAMES[p.place]} · ${LEVEL_NAMES[LEVEL_NUM[p.level]]} · ${fmtCount(setsOf(p), 'подход', 'подхода', 'подходов')} · ~${estMinutes(w.items)} мин</p>
        <div class="pick-list">${p.items
          .map(([id, sets, reps], i) => {
            const e = EX[id];
            const u = unitOf(e);
            return `<a class="pick pg-item" href="#/exercise/${id}" data-close>
              ${photoThumb(e)}
              <span class="grow"><span class="nm">${i + 1}. ${esc(e.name)}</span><span class="sub">${esc(e.sorted.slice(0, 2).map(([m]) => MUSCLES[m].name).join(' · '))}</span></span>
              <b class="sr">${sets} × ${reps}${u ? ` ${u}` : ''}</b>
            </a>`;
          })
          .join('')}</div>`,
      foot: `<button class="btn" data-close>Закрыть</button><button class="btn primary" id="pg-add">${icon.plus}Добавить себе</button>`,
      onMount: (m, close) => {
        m.querySelector('#pg-add').addEventListener('click', () => {
          close();
          addProgram(p);
        });
      },
    });
  };

  draw();
  if (query.new) setTimeout(() => newWorkoutDialog({ groups: (query.groups || '').split(',').filter((g) => GROUPS[g]) }), 30);

  view.addEventListener('click', async (e) => {
    const t = e.target;
    if (t.closest('#new') || t.closest('[data-new]')) return newWorkoutDialog();
    const tb = t.closest('[data-tab]');
    if (tb) {
      if (tb.dataset.tab === tab) return;
      tab = tb.dataset.tab;
      history.replaceState(null, '', `#/workouts${tab === 'programs' ? '?tab=programs' : ''}`);
      draw();
      return;
    }
    const f = t.closest('[data-filter]');
    if (f) {
      filter = f.dataset.filter;
      const x = view.querySelector('#pg-filter')?.scrollLeft || 0;
      view.querySelector('.tab-body').innerHTML = programs();
      view.querySelector('#pg-filter').scrollLeft = x;
      return;
    }
    const pv = t.closest('[data-pg-view]');
    if (pv) return viewProgram(PROGRAM[pv.dataset.pgView]);
    const pa = t.closest('[data-pg-add]');
    if (pa) return addProgram(PROGRAM[pa.dataset.pgAdd]);
    const pla = t.closest('[data-plan-add]');
    if (pla) {
      const pl = PLANS.find((x) => x.id === pla.dataset.planAdd);
      pl.days.forEach((d, i) => {
        const p = PROGRAM[d];
        addProgram({ ...p, name: `${pl.name} · ${String.fromCharCode(65 + i)}: ${p.name}`.slice(0, 80) }, { open: false });
      });
      tab = 'mine';
      history.replaceState(null, '', '#/workouts');
      draw();
      window.scrollTo({ top: 0 });
      toast(`Добавлено: ${fmtCount(pl.days.length, 'тренировка', 'тренировки', 'тренировок')}`);
      return;
    }
    const p = t.closest('[data-preset]');
    if (p) {
      const preset = PRESETS.find((x) => x.id === p.dataset.preset);
      return createAuto({ name: preset.name, groups: preset.groups });
    }
    const sh = t.closest('[data-share]');
    if (sh) return shareWorkout(store.getWorkout(sh.dataset.share));
    const m = t.closest('[data-menu]');
    if (m) {
      const w = store.getWorkout(m.dataset.menu);
      popMenu(m, [
        { label: 'Открыть', icon: icon.edit, action: () => navigate(`#/workout/${w.id}`) },
        { label: 'Дублировать', icon: icon.copy, action: () => (store.duplicateWorkout(w.id), draw(), toast('Копия создана')) },
        { label: 'Поделиться ссылкой', icon: icon.share, action: () => shareWorkout(w) },
        '-',
        {
          label: 'Удалить',
          icon: icon.trash,
          action: async () => {
            if (await confirmDialog(`Удалить тренировку «${w.name}»?`)) {
              store.deleteWorkout(w.id);
              draw();
            }
          },
        },
      ]);
    }
    if (t.closest('#more')) {
      popMenu(t.closest('#more'), [
        { label: 'Экспорт в файл (.json)', icon: icon.download, action: exportFile },
        { label: 'Импорт из файла', icon: icon.upload, action: () => importFile(draw) },
      ]);
    }
  });
}

export function createAuto({ name, groups, level, goal }) {
  const s = store.settings;
  const items = autoBuild({ groups, level: level || s.level, goal: goal || s.goal, eqSet: new Set(s.equipment) });
  const w = store.createWorkout({ name, groups, level: level || s.level, goal: goal || s.goal, items });
  navigate(`#/workout/${w.id}`);
  toast(items.length ? 'Тренировка собрана — посмотрите оценку' : 'Не нашлось подходящих упражнений для вашего оборудования');
}

export function newWorkoutDialog({ groups = [] } = {}) {
  const s = store.settings;
  const sel = new Set(groups);
  modal({
    title: 'Новая тренировка',
    body: `
      <div class="cfg-row"><label for="nw-name">Название</label><input class="input" id="nw-name" placeholder="Например: Грудь и трицепс" maxlength="80"></div>
      <div class="cfg-row"><span class="cfg-label">Что тренируем</span>
        <div class="chips" id="nw-presets">${PRESETS.map((p) => `<button class="chip sm" data-p="${p.id}">${esc(p.name)}</button>`).join('')}</div>
        <div class="chips mt-12" id="nw-groups">${GROUP_ORDER.map((g) => `<button class="chip${sel.has(g) ? ' on' : ''}" data-g="${g}">${GROUPS[g].name}</button>`).join('')}</div>
      </div>
      <div class="cfg-row cfg-2">
        <div><label for="nw-level">Уровень</label><select class="select" id="nw-level">${Object.entries(LEVELS).map(([k, v]) => `<option value="${k}"${s.level === k ? ' selected' : ''}>${v.name}</option>`).join('')}</select></div>
        <div><label for="nw-goal">Цель</label><select class="select" id="nw-goal">${Object.entries(GOALS).map(([k, v]) => `<option value="${k}"${s.goal === k ? ' selected' : ''}>${v.name}</option>`).join('')}</select></div>
      </div>`,
    foot: `<button class="btn" id="nw-empty">Пустая</button><button class="btn primary" id="nw-auto">${icon.magic}Собрать за меня</button>`,
    onMount: (m, close) => {
      const sync = () => m.querySelectorAll('[data-g]').forEach((b) => b.classList.toggle('on', sel.has(b.dataset.g)));
      m.querySelector('#nw-groups').addEventListener('click', (e) => {
        const b = e.target.closest('[data-g]');
        if (!b) return;
        sel.has(b.dataset.g) ? sel.delete(b.dataset.g) : sel.add(b.dataset.g);
        sync();
      });
      m.querySelector('#nw-presets').addEventListener('click', (e) => {
        const b = e.target.closest('[data-p]');
        if (!b) return;
        const p = PRESETS.find((x) => x.id === b.dataset.p);
        sel.clear();
        p.groups.forEach((g) => sel.add(g));
        const name = m.querySelector('#nw-name');
        if (!name.value) name.placeholder = p.name;
        sync();
      });
      const read = () => {
        const level = m.querySelector('#nw-level').value;
        const goal = m.querySelector('#nw-goal').value;
        store.setSettings({ level, goal });
        const gs = GROUP_ORDER.filter((g) => sel.has(g));
        const name = m.querySelector('#nw-name').value.trim() || (gs.length ? gs.map((g) => GROUPS[g].name).join(' + ') : '');
        return { name, groups: gs, level, goal };
      };
      m.querySelector('#nw-empty').addEventListener('click', () => {
        const o = read();
        const w = store.createWorkout(o);
        close();
        navigate(`#/workout/${w.id}`);
      });
      m.querySelector('#nw-auto').addEventListener('click', () => {
        const o = read();
        if (!o.groups.length) return toast('Выберите хотя бы одну группу мышц', icon.info);
        close();
        createAuto(o);
      });
    },
  });
}

function exportFile() {
  const blob = new Blob([store.exportJSON()], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `muscleatlas-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function importFile(done) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json,.json';
  input.onchange = async () => {
    const f = input.files[0];
    if (!f) return;
    try {
      const r = store.importJSON(await f.text());
      toast(`Импортировано: ${fmtCount(r.workouts, 'тренировка', 'тренировки', 'тренировок')}, избранное обновлено`);
      done();
    } catch {
      toast('Не удалось прочитать файл', icon.alert);
    }
  };
  input.click();
}

