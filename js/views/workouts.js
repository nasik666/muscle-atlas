// Список тренировок + создание новой (пустой или автоматически собранной).

import { bodySVG } from '../body/bodymap.js';
import { GROUPS, GROUP_ORDER, PRESETS, LEVELS, GOALS } from '../data/muscles.js';
import { store } from '../store.js';
import { esc, icon, footer, fmtCount, modal, popMenu, toast, ringSVG, confirmDialog } from '../ui.js';
import { navigate } from '../router.js';
import { evaluate, workoutHeat, autoBuild, estMinutes } from '../scoring.js';
import { shareWorkout, groupNames } from './shared.js';

export function renderWorkouts(view, _p, query) {
  const draw = () => {
    const list = store.workouts();
    view.innerHTML = `
      <div class="section-head" style="margin-top:4px">
        <div class="grow"><span class="eyebrow">Конструктор</span><h1 class="mt-8" style="font-size:clamp(26px,3vw,38px)">Мои тренировки</h1>
        <p class="muted mt-8">Соберите тренировку — и получите оценку и подсказки, как её улучшить.</p></div>
        <button class="btn icon" id="more" aria-label="Импорт и экспорт" title="Импорт и экспорт">${icon.more}</button>
        <button class="btn primary" id="new">${icon.plus}Новая тренировка</button>
      </div>

      <div class="panel" style="padding:18px 20px">
        <div class="row wrap"><b class="ico-inline">${icon.magic}Быстрый старт</b><span class="muted small">— сайт сам соберёт оптимальную тренировку под ваше оборудование</span></div>
        <div class="chips mt-12">${PRESETS.map((p) => `<button class="chip" data-preset="${p.id}">${esc(p.name)}</button>`).join('')}</div>
      </div>

      ${
        list.length
          ? `<div class="wk-grid mt-24">${list.map(card).join('')}</div>`
          : `<div class="empty glass mt-24"><div class="ico">${icon.list}</div><h3>Тренировок пока нет</h3>
             <p>Создайте первую: выберите группы мышц, добавьте упражнения — и увидите оценку от 0 до 100 с подсказками.</p>
             <button class="btn primary" data-new>${icon.plus}Создать тренировку</button></div>`
      }
      ${footer()}`;
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

  draw();
  if (query.new) setTimeout(() => newWorkoutDialog({ groups: (query.groups || '').split(',').filter((g) => GROUPS[g]) }), 30);

  view.addEventListener('click', async (e) => {
    const t = e.target;
    if (t.closest('#new') || t.closest('[data-new]')) return newWorkoutDialog();
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

