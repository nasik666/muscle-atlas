// Конструктор тренировки: цель, упражнения, живая оценка и рекомендации.

import { bodySVG } from '../body/bodymap.js';
import { MUSCLES, GROUPS, GROUP_ORDER, PRESETS, LEVELS, GOALS } from '../data/muscles.js';
import { EQUIPMENT, EQUIPMENT_ORDER } from '../data/equipment.js';
import { EX, EXERCISES, norm, groupLoad, available, unitOf } from '../data/exercises.js';
import { store, defaultReps } from '../store.js';
import {
  esc, icon, toast, modal, popMenu, confirmDialog, ringSVG, scoreColor, fmtCount, bindBodyMap, heatLegend, thumb, plural,
} from '../ui.js';
import { navigate } from '../router.js';
import {
  evaluate, autoBuild, workoutHeat, insertSorted, sortItems, scoreOnly, estMinutes, targetsOf, effective, ranges, inferGroups,
} from '../scoring.js';
import { shareWorkout, groupNames } from './shared.js';

const fmt = (v) => (Math.round(v * 10) / 10).toString().replace('.', ',');

export function renderBuilder(view, { id }) {
  let w = store.getWorkout(id);
  if (!w) {
    navigate('#/workouts', { replace: true });
    return;
  }
  w = structuredClone(w);
  let lastScore = null;

  view.innerHTML = `
    <nav class="crumbs" aria-label="Навигация"><a href="#/workouts">Тренировки</a>${icon.right}<span id="crumb-name">${esc(w.name)}</span></nav>
    <div class="builder">
      <div class="builder-main">
        <div class="cfg glass">
          <div class="row">
            <input class="wk-name grow" id="name" value="${esc(w.name)}" maxlength="80" aria-label="Название тренировки">
            <button class="btn icon sm" id="share" aria-label="Поделиться" title="Поделиться ссылкой">${icon.share}</button>
            <button class="btn icon sm" id="more" aria-label="Ещё" title="Ещё">${icon.more}</button>
          </div>
          <details class="cfg-more" id="cfg-more"${w.items.length && matchMedia('(max-width: 760px)').matches ? '' : ' open'}>
          <summary>${icon.filter}<span class="grow">Группы мышц, уровень, оборудование</span>${icon.down}</summary>
          <div class="cfg-row mt-16"><span class="cfg-label">Что тренируем — от этого зависит оценка</span>
            <div class="chips" id="groups"></div>
            <div class="chips mt-12" id="presets">${PRESETS.map((p) => `<button class="chip sm" data-p="${p.id}">${icon.layers.replace('<svg', '<svg style="width:13px;height:13px"')}${esc(p.name)}</button>`).join('')}</div>
          </div>
          <div class="cfg-row cfg-2">
            <div><label for="level">Уровень</label><select class="select" id="level">${Object.entries(LEVELS).map(([k, v]) => `<option value="${k}">${v.name}</option>`).join('')}</select></div>
            <div><label for="goal">Цель</label><select class="select" id="goal">${Object.entries(GOALS).map(([k, v]) => `<option value="${k}">${v.name}</option>`).join('')}</select></div>
          </div>
          <div class="cfg-row"><span class="cfg-label">Доступное оборудование (для подсказок и автосборки)</span><div class="chips" id="eq"></div></div>
          </details>
        </div>

        <div class="row wrap">
          <h2>Упражнения</h2>
          <span class="spacer"></span>
          <span class="small muted" id="summary"></span>
        </div>
        <div class="row wrap">
          <button class="btn primary" id="add">${icon.plus}Добавить упражнение</button>
          <button class="btn" id="auto">${icon.magic}Собрать за меня</button>
          <button class="btn icon" id="reroll" title="Другой вариант автосборки" aria-label="Другой вариант автосборки">${icon.dice}</button>
        </div>
        <div class="item-list" id="items"></div>
      </div>

      <aside class="builder-side">
        <div class="score-card glass" id="score"></div>
        <div class="recs glass" id="recs"></div>
        <div class="heat-card glass" id="wheat"></div>
        <div class="vol-table glass" id="vol"></div>
      </aside>
    </div>
    <button class="score-fab" id="score-fab" hidden aria-label="Показать оценку тренировки"></button>`;

  const $ = (s) => view.querySelector(s);
  $('#level').value = w.level;
  $('#goal').value = w.goal;

  const eqSet = () => new Set(store.settings.equipment);

  // ---------------------------------------------------------------- рендер
  const drawGroups = () => {
    $('#groups').innerHTML = GROUP_ORDER.map((g) => `<button class="chip${w.groups.includes(g) ? ' on' : ''}" data-g="${g}" aria-pressed="${w.groups.includes(g)}">${GROUPS[g].name}</button>`).join('');
  };
  const drawEq = () => {
    const mine = store.settings.equipment;
    $('#eq').innerHTML = EQUIPMENT_ORDER.map((q) => `<button class="chip sm${mine.includes(q) ? ' on' : ''}" data-q="${q}">${EQUIPMENT[q].short}</button>`).join('');
  };

  const drawItems = () => {
    const el = $('#items');
    if (!w.items.length) {
      el.innerHTML = `<div class="empty panel"><div class="ico">${icon.dumbbell}</div><h3>Тренировка пуста</h3>
        <p>Добавьте упражнения вручную или нажмите «Собрать за меня» — алгоритм подберёт оптимальный набор под выбранные группы и ваше оборудование.</p></div>`;
      return;
    }
    el.innerHTML = w.items
      .map((it, i) => {
        const e = EX[it.ex];
        const unit = unitOf(e);
        const top = e.sorted.slice(0, 3).map(([m]) => MUSCLES[m].name).join(', ');
        return `<div class="item" data-i="${i}" draggable="true">
          <span class="num" title="Перетащите, чтобы изменить порядок">${i + 1}</span>
          ${thumb(e)}
          <div class="info"><div class="nm"><a href="#/exercise/${e.id}">${esc(e.name)}</a></div>
            <div class="sub">${e.type === 'compound' ? 'Базовое' : 'Изолирующее'} · ${esc(top)}</div></div>
          <div class="sets stepper-group">
            ${stepper('sets', i, it.sets, 1, 10)}<span class="x">×</span>${stepper('reps', i, it.reps, 1, 120)}<span>${unit || 'повт.'}</span>
          </div>
          <div class="ctrls">
            <button class="btn icon sm ghost" data-up="${i}" aria-label="Выше" ${i === 0 ? 'disabled' : ''}>${icon.up}</button>
            <button class="btn icon sm ghost" data-down="${i}" aria-label="Ниже" ${i === w.items.length - 1 ? 'disabled' : ''}>${icon.down}</button>
            <button class="btn icon sm ghost danger" data-del="${i}" aria-label="Удалить">${icon.trash}</button>
          </div>
        </div>`;
      })
      .join('');
  };

  const stepper = (field, i, v, min, max) =>
    `<span class="stepper" title="${field === 'sets' ? 'Подходы' : 'Повторения'}"><button data-step="${field}" data-i="${i}" data-d="-1" aria-label="Меньше">${icon.minus}</button><input data-field="${field}" data-i="${i}" type="number" inputmode="numeric" min="${min}" max="${max}" value="${v}" aria-label="${field === 'sets' ? 'Подходы' : 'Повторения'}"><button data-step="${field}" data-i="${i}" data-d="1" aria-label="Больше">${icon.plus}</button></span>`;

  const drawSide = () => {
    const r = evaluate(w, { eqSet: eqSet() });
    const sets = w.items.reduce((s, it) => s + it.sets, 0);
    $('#summary').textContent = w.items.length
      ? `${fmtCount(w.items.length, 'упражнение', 'упражнения', 'упражнений')} · ${fmtCount(sets, 'подход', 'подхода', 'подходов')} · ~${estMinutes(w.items)} мин`
      : '';

    // оценка
    const score = w.items.length && r.parts ? r.score : 0;
    const col = scoreColor(score);
    $('#score').innerHTML = `
      <div class="score-top">
        <div class="ring">${ringSVG(lastScore ?? 0, 128, 11, col)}<div class="ring-val"><b id="score-num" style="color:${col}">${lastScore ?? 0}</b><span>из 100</span></div></div>
        <div class="grow">
          ${r.grade ? `<div class="grade" style="color:${col}">${r.grade.label}</div><p class="score-sub">${r.grade.text}</p>` : `<div class="grade muted">Нет оценки</div><p class="score-sub">${w.items.length ? 'Выберите группы мышц.' : 'Добавьте упражнения.'}</p>`}
          ${r.groups?.length ? `<p class="xs faint mt-8">${r.inferred ? 'Определено автоматически: ' : 'Цель: '}${esc(groupNames(r.groups))}</p>` : ''}
        </div>
      </div>
      ${
        r.parts
          ? `<div class="breakdown">${r.parts
              .map((p) => {
                const pts = p.v * p.max;
                return `<div class="bd-row" title="${esc(p.hint)}"><span class="nm">${p.name}${icon.info.replace('<svg', '<svg class="info-i"')}</span><span class="track"><span class="fill" style="width:${p.v * 100}%;background:${scoreColor(p.v * 100)}"></span></span><span class="v">${Math.round(pts)}/${p.max}</span></div>`;
              })
              .join('')}</div>`
          : ''
      }`;
    animateScore(score, col);
    const fab = $('#score-fab');
    fab.hidden = !(w.items.length && r.parts);
    fab.innerHTML = `<span class="mini-ring">${ringSVG(score, 44, 5, col)}<b style="color:${col}">${score}</b></span><span>Оценка<small>${r.grade ? esc(r.grade.label) : ''}</small></span>${icon.down}`;

    // рекомендации
    $('#recs').innerHTML = `<h3 class="ico-inline" style="margin-bottom:10px">${icon.bulb}Рекомендации</h3>${r.recs
      .map(
        (rc) => `<div class="rec ${rc.kind}"><span class="ri">${{ bad: icon.alert, warn: icon.alert, info: icon.info, good: icon.check }[rc.kind]}</span>
        <div><p>${rc.text}</p>${
          rc.sugg?.length
            ? `<div class="sugg">${rc.sugg.map((s) => `<button class="sugg-btn" data-sugg="${s.e.id}" title="Добавить: ${esc(s.e.name)}">${icon.plus}${esc(s.e.name)}${s.gain > 0 ? ` <span class="faint">+${s.gain}</span>` : ''}</button>`).join('')}</div>`
            : ''
        }${rc.action === 'sort' ? `<div class="sugg"><button class="sugg-btn" data-sort>${icon.order}Упорядочить автоматически</button></div>` : ''}</div></div>`,
      )
      .join('') || '<p class="muted small">Нет замечаний.</p>'}`;

    // тепловая карта тренировки
    const eff = effective(w.items);
    const heat = workoutHeat(w.items);
    $('#wheat').innerHTML = `<h3 class="ico-inline" style="margin-bottom:12px">${icon.flame}Нагрузка всей тренировки</h3>
      <div class="body-pair" id="wmap" style="max-width:360px;margin:0 auto">${bodySVG({ view: 'front', heat, interactive: true })}${bodySVG({ view: 'back', heat, interactive: true })}</div>
      <div class="mt-12">${heatLegend('мало', 'много')}</div>`;
    unbindMap?.();
    unbindMap = bindBodyMap($('#wmap'), {
      tip: (m) => `<b>${esc(MUSCLES[m].name)}</b><span class="small muted">${eff[m] ? `${fmt(eff[m])} эфф. ${plural(Math.round(eff[m]), 'подход', 'подхода', 'подходов')}` : 'нет нагрузки'}</span>`,
      onClick: (m) => navigate(`#/muscle/${m}`),
    });

    // объём по целевым мышцам
    const groups = w.groups.length ? w.groups : inferGroups(w.items);
    if (!groups.length) {
      $('#vol').innerHTML = `<h3>Объём по мышцам</h3><p class="muted small mt-8">Появится, когда вы выберете группы мышц.</p>`;
      return;
    }
    const R = ranges(groups, w.level);
    const targets = [...targetsOf(groups)].filter(([, wt]) => wt >= 0.5);
    const scaleMax = R.maxEff * 1.45;
    $('#vol').innerHTML = `<h3 class="ico-inline">${icon.scale}Объём по частям мышц</h3>
      <p class="xs muted mt-8" style="margin-bottom:10px">Эффективные подходы за тренировку. Зелёная зона — оптимум.</p>
      ${targets
        .map(([m, wt]) => {
          const v = eff[m] || 0;
          const lo = R.minEff * wt;
          const col = v < lo * 0.5 ? '#ff5a5f' : v < lo ? '#ffc24b' : v > R.maxEff * 1.12 ? '#ff8a3d' : '#3ddc97';
          return `<div class="vol-row"><span class="nm" title="${esc(MUSCLES[m].name)}">${esc(MUSCLES[m].name)}</span>
            <span class="vol-track"><span class="zone" style="left:${(lo / scaleMax) * 100}%;width:${((R.maxEff - lo) / scaleMax) * 100}%"></span><span class="fill" style="width:${Math.min(100, (v / scaleMax) * 100)}%;background:${col}"></span></span>
            <span class="v" style="color:${col}">${fmt(v)}</span></div>`;
        })
        .join('')}`;
  };
  let unbindMap = null;

  let raf = 0;
  const animateScore = (to, col) => {
    const from = lastScore ?? 0;
    lastScore = to;
    const num = $('#score-num');
    const arc = view.querySelector('#score .ring-arc');
    const c = 2 * Math.PI * ((128 - 11) / 2);
    requestAnimationFrame(() => arc && (arc.style.strokeDashoffset = c * (1 - to / 100)));
    cancelAnimationFrame(raf);
    const t0 = performance.now();
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / 700);
      const v = Math.round(from + (to - from) * (1 - (1 - k) ** 3));
      if (num) {
        num.textContent = v;
        num.style.color = col;
      }
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  };

  const save = ({ items = false } = {}) => {
    w = structuredClone(store.saveWorkout(w));
    if (items) drawItems();
    drawSide();
  };

  drawGroups();
  drawEq();
  drawItems();
  drawSide();

  // ---------------------------------------------------------------- события
  let nameT;
  $('#name').addEventListener('input', (e) => {
    w.name = e.target.value;
    $('#crumb-name').textContent = w.name || 'Без названия';
    clearTimeout(nameT);
    nameT = setTimeout(() => store.saveWorkout(w), 300);
  });
  $('#name').addEventListener('blur', () => {
    if (!w.name.trim()) {
      w.name = 'Тренировка';
      $('#name').value = w.name;
    }
    store.saveWorkout(w);
  });
  $('#groups').addEventListener('click', (e) => {
    const b = e.target.closest('[data-g]');
    if (!b) return;
    const g = b.dataset.g;
    w.groups = w.groups.includes(g) ? w.groups.filter((x) => x !== g) : GROUP_ORDER.filter((x) => x === g || w.groups.includes(x));
    drawGroups();
    save();
  });
  $('#presets').addEventListener('click', (e) => {
    const b = e.target.closest('[data-p]');
    if (!b) return;
    w.groups = [...PRESETS.find((p) => p.id === b.dataset.p).groups];
    drawGroups();
    save();
  });
  $('#level').addEventListener('change', (e) => {
    w.level = e.target.value;
    store.setSettings({ level: w.level });
    save();
  });
  $('#goal').addEventListener('change', (e) => {
    w.goal = e.target.value;
    store.setSettings({ goal: w.goal });
    save();
  });
  $('#eq').addEventListener('click', (e) => {
    const b = e.target.closest('[data-q]');
    if (!b) return;
    const cur = new Set(store.settings.equipment);
    cur.has(b.dataset.q) ? cur.delete(b.dataset.q) : cur.add(b.dataset.q);
    store.setSettings({ equipment: EQUIPMENT_ORDER.filter((q) => cur.has(q)) });
    drawEq();
    drawSide();
  });

  const runAuto = async (random) => {
    const groups = w.groups.length ? w.groups : inferGroups(w.items);
    if (!groups.length) return toast('Сначала выберите группы мышц', icon.info);
    if (w.items.length && !random && !(await confirmDialog('Заменить текущие упражнения автоматически собранными?', 'Заменить'))) return;
    const items = autoBuild({ groups, level: w.level, goal: w.goal, eqSet: eqSet(), random });
    if (!items.length) return toast('Нет подходящих упражнений для выбранного оборудования', icon.alert);
    w.groups = groups;
    w.items = items;
    drawGroups();
    save({ items: true });
    toast(random ? 'Новый вариант собран' : 'Тренировка собрана');
  };
  $('#auto').addEventListener('click', () => runAuto(false));
  $('#reroll').addEventListener('click', () => runAuto(true));
  $('#add').addEventListener('click', () => openPicker());
  $('#share').addEventListener('click', () => shareWorkout(w));
  $('#more').addEventListener('click', (e) =>
    popMenu(e.currentTarget, [
      { label: 'Упорядочить: базовые → изолирующие', icon: icon.order, action: () => ((w.items = sortItems(w.items)), save({ items: true })) },
      { label: 'Дублировать', icon: icon.copy, action: () => navigate(`#/workout/${store.duplicateWorkout(w.id).id}`) },
      { label: 'Поделиться ссылкой', icon: icon.share, action: () => shareWorkout(w) },
      '-',
      {
        label: 'Удалить тренировку',
        icon: icon.trash,
        action: async () => {
          if (await confirmDialog(`Удалить тренировку «${w.name}»?`)) {
            store.deleteWorkout(w.id);
            navigate('#/workouts');
          }
        },
      },
    ]),
  );

  // список упражнений: шаги, перестановка, удаление
  const items = $('#items');
  items.addEventListener('click', (e) => {
    const st = e.target.closest('[data-step]');
    if (st) {
      const i = +st.dataset.i;
      const f = st.dataset.step;
      const max = f === 'sets' ? 10 : 120;
      w.items[i][f] = Math.max(1, Math.min(max, w.items[i][f] + +st.dataset.d));
      items.querySelector(`input[data-field="${f}"][data-i="${i}"]`).value = w.items[i][f];
      return save();
    }
    const up = e.target.closest('[data-up]');
    const down = e.target.closest('[data-down]');
    if (up || down) {
      const i = +(up || down).dataset[up ? 'up' : 'down'];
      const j = up ? i - 1 : i + 1;
      [w.items[i], w.items[j]] = [w.items[j], w.items[i]];
      return save({ items: true });
    }
    const del = e.target.closest('[data-del]');
    if (del) {
      const i = +del.dataset.del;
      const removed = w.items.splice(i, 1)[0];
      save({ items: true });
      toast(`Удалено: ${EX[removed.ex].name}`, icon.trash);
    }
  });
  items.addEventListener('change', (e) => {
    const inp = e.target.closest('input[data-field]');
    if (!inp) return;
    const i = +inp.dataset.i;
    const f = inp.dataset.field;
    const max = f === 'sets' ? 10 : 120;
    const v = Math.max(1, Math.min(max, Math.round(+inp.value || 1)));
    inp.value = v;
    w.items[i][f] = v;
    save();
  });
  // drag & drop
  let dragI = null;
  items.addEventListener('dragstart', (e) => {
    const it = e.target.closest('.item');
    if (!it || e.target.closest('input,button,a')) return e.preventDefault();
    dragI = +it.dataset.i;
    it.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(dragI));
  });
  items.addEventListener('dragover', (e) => {
    const it = e.target.closest('.item');
    if (dragI === null || !it) return;
    e.preventDefault();
    const r = it.getBoundingClientRect();
    const before = e.clientY < r.top + r.height / 2;
    items.querySelectorAll('.item').forEach((x) => x.classList.remove('drop-before', 'drop-after'));
    it.classList.add(before ? 'drop-before' : 'drop-after');
  });
  items.addEventListener('drop', (e) => {
    const it = e.target.closest('.item');
    if (dragI === null || !it) return;
    e.preventDefault();
    const r = it.getBoundingClientRect();
    let to = +it.dataset.i + (e.clientY >= r.top + r.height / 2 ? 1 : 0);
    const [moved] = w.items.splice(dragI, 1);
    if (to > dragI) to--;
    w.items.splice(to, 0, moved);
    dragI = null;
    save({ items: true });
  });
  items.addEventListener('dragend', () => {
    dragI = null;
    items.querySelectorAll('.item').forEach((x) => x.classList.remove('dragging', 'drop-before', 'drop-after'));
  });

  // рекомендации: добавить подсказанное / упорядочить
  $('#recs').addEventListener('click', (e) => {
    const s = e.target.closest('[data-sugg]');
    if (s) {
      addExercise(s.dataset.sugg);
      toast(`Добавлено: ${EX[s.dataset.sugg].name}`);
    }
    if (e.target.closest('[data-sort]')) {
      w.items = sortItems(w.items);
      save({ items: true });
      toast('Порядок исправлен');
    }
  });

  const addExercise = (exId) => {
    const e = EX[exId];
    w.items = insertSorted(w.items, { ex: exId, sets: e.type === 'compound' ? 4 : 3, reps: defaultReps(e, w.goal) });
    save({ items: true });
  };

  // ---------------------------------------------------------------- выбор упражнения
  const openPicker = () => {
    const st = { q: '', group: w.groups.length ? 'target' : '', mineOnly: true };
    modal({
      title: 'Добавить упражнение',
      wide: true,
      body: `
        <label class="search-box">${icon.search}<input class="input" id="pk-q" type="search" placeholder="Поиск упражнения…" autocomplete="off" autofocus></label>
        <div class="chips mt-12" id="pk-groups"></div>
        <div class="row mt-12 small muted"><label class="row" style="gap:8px;cursor:pointer"><input type="checkbox" id="pk-mine" checked> Только с моим оборудованием</label><span class="spacer"></span><span>Отсортировано по пользе для этой тренировки</span></div>
        <div class="pick-list" id="pk-list"></div>`,
      foot: `<button class="btn primary" data-close>Готово</button>`,
      onMount: (m) => {
        const drawChips = () => {
          const opts = [['', 'Все']].concat(w.groups.length ? [['target', 'Моя цель']] : []).concat(GROUP_ORDER.map((g) => [g, GROUPS[g].name]));
          m.querySelector('#pk-groups').innerHTML = opts.map(([v, l]) => `<button class="chip sm${st.group === v ? ' on' : ''}" data-pg="${v}">${l}</button>`).join('');
        };
        const drawList = () => {
          const base = scoreOnly(w);
          const words = norm(st.q).split(/\s+/).filter(Boolean);
          const mine = eqSet();
          const targets = targetsOf(w.groups);
          const have = new Set(w.items.map((it) => it.ex));
          let list = EXERCISES.filter((e) => {
            if (words.length && !words.every((x) => e.search.includes(x))) return false;
            if (st.mineOnly && !available(e, mine)) return false;
            if (st.group === 'target') return [...targets].some(([mm, wt]) => wt >= 0.5 && (e.m[mm] || 0) >= 55);
            if (st.group) return groupLoad(e, st.group) >= 55;
            return true;
          }).map((e) => {
            const gain = have.has(e.id) ? null : scoreOnly({ ...w, items: insertSorted(w.items, { ex: e.id, sets: e.type === 'compound' ? 4 : 3, reps: defaultReps(e, w.goal) }) }) - base;
            return { e, gain };
          });
          list.sort((a, b) => (b.gain ?? -999) - (a.gain ?? -999) || a.e.name.localeCompare(b.e.name, 'ru'));
          list = list.slice(0, 60);
          m.querySelector('#pk-list').innerHTML = list.length
            ? list
                .map(
                  ({ e, gain }) => `<button class="pick${gain === null ? ' added' : ''}" data-pick="${e.id}">
                  ${thumb(e)}
                  <span><span class="nm">${esc(e.name)}</span><br><span class="sub">${esc(e.sorted.slice(0, 3).map(([mm]) => MUSCLES[mm].name).join(', '))}</span></span>
                  <span class="gain" style="color:${gain === null ? 'var(--muted)' : gain > 0 ? '#7ff0bd' : gain < 0 ? '#ff8f93' : 'var(--muted)'}">${gain === null ? '✓ добавлено' : `${gain > 0 ? '+' : ''}${Math.round(gain)}`}</span>
                </button>`,
                )
                .join('')
            : `<p class="muted center mt-24">Ничего не найдено</p>`;
        };
        drawChips();
        drawList();
        let t;
        m.querySelector('#pk-q').addEventListener('input', (e) => {
          clearTimeout(t);
          t = setTimeout(() => {
            st.q = e.target.value;
            drawList();
          }, 120);
        });
        m.querySelector('#pk-mine').addEventListener('change', (e) => {
          st.mineOnly = e.target.checked;
          drawList();
        });
        m.querySelector('#pk-groups').addEventListener('click', (e) => {
          const b = e.target.closest('[data-pg]');
          if (!b) return;
          st.group = b.dataset.pg;
          drawChips();
          drawList();
        });
        m.querySelector('#pk-list').addEventListener('click', (e) => {
          const b = e.target.closest('[data-pick]');
          if (!b || b.classList.contains('added')) return;
          addExercise(b.dataset.pick);
          drawList();
        });
      },
    });
  };

  // плавающая оценка (телефон): видна, пока карточка оценки за экраном; нажатие — прокрутка к ней
  const fabEl = $('#score-fab');
  fabEl.addEventListener('click', () => $('#score').scrollIntoView({ behavior: 'smooth', block: 'start' }));
  const fabIO = new IntersectionObserver(([en]) => fabEl.classList.toggle('away', en.isIntersecting));
  fabIO.observe($('#score'));

  return () => {
    clearTimeout(nameT);
    cancelAnimationFrame(raf);
    unbindMap?.();
    fabIO.disconnect();
  };
}

