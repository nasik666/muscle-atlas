// Страница мышцы (#/muscle/:id) и группы мышц (#/group/:id).

import { bodySVG } from '../body/bodymap.js';
import { MUSCLES, GROUPS, GROUP_ORDER } from '../data/muscles.js';
import { EQUIPMENT, EQUIPMENT_ORDER } from '../data/equipment.js';
import { exercisesForMuscle, exercisesForGroup, groupLoad, available } from '../data/exercises.js';
import { bindBodyMap, esc, icon, exCard, footer, fmtCount, heatLegend } from '../ui.js';
import { navigate } from '../router.js';
import { store } from '../store.js';
import { bindCardActions } from './shared.js';
import { groupHeat } from './home.js';

const crumbs = (parts) =>
  `<nav class="crumbs" aria-label="Навигация">${parts
    .map(([label, href], i) => (href ? `<a href="${href}">${esc(label)}</a>` : `<span>${esc(label)}</span>`) + (i < parts.length - 1 ? icon.right : ''))
    .join('')}</nav>`;

function filtersHTML(state, { subs = null } = {}) {
  const eqUsed = EQUIPMENT_ORDER.filter((q) => q !== 'bench');
  return `<div class="filter-bar">
    ${subs ? `<span class="label">Часть</span><div class="chips">${subs}</div><span class="spacer"></span>` : ''}
    <div class="seg" role="group" aria-label="Сила нагрузки">
      <button data-min="70" class="${state.min === 70 ? 'on' : ''}">Основная</button>
      <button data-min="40" class="${state.min === 40 ? 'on' : ''}">Заметная</button>
      <button data-min="15" class="${state.min === 15 ? 'on' : ''}">Любая</button>
    </div>
  </div>
  <div class="filter-bar">
    <span class="label">Оборудование</span>
    <div class="chips">
      <button class="chip sm${!state.eq ? ' on' : ''}" data-eq="">Любое</button>
      <button class="chip sm${state.eq === 'mine' ? ' on' : ''}" data-eq="mine">Моё</button>
      ${eqUsed.map((q) => `<button class="chip sm${state.eq === q ? ' on' : ''}" data-eq="${q}">${EQUIPMENT[q].short}</button>`).join('')}
    </div>
  </div>`;
}

function applyEq(list, eq) {
  if (!eq) return list;
  if (eq === 'mine') {
    const mine = new Set(store.settings.equipment);
    return list.filter((e) => available(e, mine));
  }
  return list.filter((e) => e.eq.includes(eq));
}

// ------------------------------------------------------------------ мышца
export function renderMuscle(view, { id }) {
  const M = MUSCLES[id];
  if (!M) return navigate('#/', { replace: true });
  const G = GROUPS[M.group];
  const state = { min: 40, eq: '' };
  const heat = { [id]: 1 };

  view.innerHTML = `
    ${crumbs([['Карта мышц', '#/'], [G.name, `#/group/${M.group}`], [M.name]])}
    <section class="muscle-hero">
      <aside class="muscle-map glass">
        <div class="body-pair" id="mmap">
          <figure class="body-fig">${bodySVG({ view: 'front', heat, interactive: true, focus: id })}<figcaption>Спереди</figcaption></figure>
          <figure class="body-fig">${bodySVG({ view: 'back', heat, interactive: true, focus: id })}<figcaption>Сзади</figcaption></figure>
        </div>
      </aside>
      <div class="muscle-info glass">
        <span class="eyebrow">${esc(G.name)}</span>
        <h1 class="mt-8">${esc(M.name)}</h1>
        <p class="latin">${esc(M.full)} · ${esc(M.latin)}</p>
        <div class="info-grid">
          <div class="info-box"><h4>${icon.info}Функция</h4><p>${esc(M.fn)}</p></div>
          <div class="info-box"><h4>${icon.target}Как нагрузить</h4><p>${esc(M.howto)}</p></div>
        </div>
        <div class="sub-muscles">
          <div class="cfg-label">Другие части группы «${esc(G.name)}»</div>
          <div class="chips">${G.muscles
            .map(([m]) => `<a class="chip${m === id ? ' on' : ''}" href="#/muscle/${m}">${esc(MUSCLES[m].name)}</a>`)
            .join('')}<a class="chip" href="#/group/${M.group}">Вся группа ${icon.right}</a></div>
        </div>
      </div>
    </section>
    <div class="section-head"><h2>Упражнения на «${esc(M.name)}»</h2></div>
    <div id="filters"></div>
    <p class="result-count" id="count"></p>
    <div class="ex-grid" id="list"></div>
    ${footer()}`;

  const draw = () => {
    view.querySelector('#filters').innerHTML = filtersHTML(state);
    const list = applyEq(exercisesForMuscle(id, state.min), state.eq);
    view.querySelector('#count').textContent = list.length
      ? `${fmtCount(list.length, 'упражнение', 'упражнения', 'упражнений')}, отсортированы по нагрузке на эту мышцу`
      : '';
    view.querySelector('#list').innerHTML = list.length
      ? list.map((e) => exCard(e, { muscle: id })).join('')
      : `<div class="empty panel" style="grid-column:1/-1"><div class="ico">${icon.search}</div><h3>Ничего не найдено</h3><p>Попробуйте ослабить фильтры.</p></div>`;
  };
  draw();
  view.addEventListener('click', (e) => {
    const min = e.target.closest('[data-min]');
    if (min) {
      state.min = +min.dataset.min;
      draw();
    }
    const eq = e.target.closest('[data-eq]');
    if (eq) {
      state.eq = eq.dataset.eq;
      draw();
    }
  });

  const unbind = bindBodyMap(view.querySelector('#mmap'), {
    tip: (m) => `<b>${esc(MUSCLES[m].name)}</b><span class="muted small">${esc(GROUPS[MUSCLES[m].group].name)}</span>`,
    onClick: (m) => m !== id && navigate(`#/muscle/${m}`),
  });
  const unCards = bindCardActions(view);
  return () => {
    unbind();
    unCards();
  };
}

// ------------------------------------------------------------------ группа
export function renderGroup(view, { id }, query) {
  const G = GROUPS[id];
  if (!G) return navigate('#/', { replace: true });
  const state = { min: 70, eq: '', part: query.part && G.muscles.some(([m]) => m === query.part) ? query.part : '' };
  const heat = groupHeat(id);
  const idx = GROUP_ORDER.indexOf(id);
  const prev = GROUP_ORDER[(idx - 1 + GROUP_ORDER.length) % GROUP_ORDER.length];
  const next = GROUP_ORDER[(idx + 1) % GROUP_ORDER.length];

  view.innerHTML = `
    ${crumbs([['Карта мышц', '#/'], [G.name]])}
    <section class="muscle-hero">
      <aside class="muscle-map glass">
        <div class="body-pair" id="mmap">
          <figure class="body-fig">${bodySVG({ view: 'front', heat, interactive: true })}<figcaption>Спереди</figcaption></figure>
          <figure class="body-fig">${bodySVG({ view: 'back', heat, interactive: true })}<figcaption>Сзади</figcaption></figure>
        </div>
      </aside>
      <div class="muscle-info glass">
        <div class="row"><span class="eyebrow">Группа мышц</span><span class="spacer"></span>
          <a class="btn icon sm ghost" href="#/group/${prev}" aria-label="Предыдущая группа" title="${esc(GROUPS[prev].name)}">${icon.left}</a>
          <a class="btn icon sm ghost" href="#/group/${next}" aria-label="Следующая группа" title="${esc(GROUPS[next].name)}">${icon.right}</a>
        </div>
        <h1 class="mt-8">${esc(G.name)}</h1>
        <p class="muted mt-8">Выберите часть, чтобы увидеть упражнения именно на неё, или откройте страницу мышцы.</p>
        <div class="info-grid">
          ${G.muscles
            .map(
              ([m, wt]) => `<a class="info-box" href="#/muscle/${m}" data-hover="${m}">
              <h4>${wt === 1 ? icon.target : icon.info}${esc(MUSCLES[m].name)}</h4><p>${esc(MUSCLES[m].fn)}</p></a>`,
            )
            .join('')}
        </div>
        <div class="row wrap mt-24">
          <a class="btn primary" href="#/workouts?new=1&groups=${id}">${icon.magic}Собрать тренировку на «${esc(G.name)}»</a>
        </div>
      </div>
    </section>
    <div class="section-head"><h2>Упражнения</h2>${heatLegend('слабая нагрузка', 'сильная')}</div>
    <div id="filters"></div>
    <p class="result-count" id="count"></p>
    <div class="ex-grid" id="list"></div>
    ${footer()}`;

  const draw = () => {
    const subs = [`<button class="chip sm${!state.part ? ' on' : ''}" data-part="">Вся группа</button>`]
      .concat(G.muscles.map(([m]) => `<button class="chip sm${state.part === m ? ' on' : ''}" data-part="${m}">${esc(MUSCLES[m].name)}</button>`))
      .join('');
    view.querySelector('#filters').innerHTML = filtersHTML(state, { subs });
    let list = state.part ? exercisesForMuscle(state.part, state.min) : exercisesForGroup(id, state.min);
    list = applyEq(list, state.eq);
    view.querySelector('#count').textContent = list.length
      ? `${fmtCount(list.length, 'упражнение', 'упражнения', 'упражнений')} · по убыванию нагрузки${state.part ? ` на «${MUSCLES[state.part].name}»` : ''}`
      : '';
    view.querySelector('#list').innerHTML = list.length
      ? list.map((e) => exCard(e, { muscle: state.part || bestMuscle(e, id) })).join('')
      : `<div class="empty panel" style="grid-column:1/-1"><div class="ico">${icon.search}</div><h3>Ничего не найдено</h3><p>Попробуйте ослабить фильтры.</p></div>`;
  };
  draw();

  view.addEventListener('click', (e) => {
    const b = e.target.closest('[data-min],[data-eq],[data-part]');
    if (!b) return;
    if (b.dataset.min) state.min = +b.dataset.min;
    if ('eq' in b.dataset) state.eq = b.dataset.eq;
    if ('part' in b.dataset) {
      state.part = b.dataset.part;
      history.replaceState(null, '', `#/group/${id}${state.part ? `?part=${state.part}` : ''}`);
    }
    draw();
  });

  const map = view.querySelector('#mmap');
  view.querySelectorAll('[data-hover]').forEach((el) => {
    el.addEventListener('pointerenter', () => map.querySelectorAll(`[data-m="${el.dataset.hover}"]`).forEach((m) => m.classList.add('hl')));
    el.addEventListener('pointerleave', () => map.querySelectorAll('.m.hl').forEach((m) => m.classList.remove('hl')));
  });
  const unbind = bindBodyMap(map, {
    tip: (m) => `<b>${esc(MUSCLES[m].name)}</b><span class="muted small">${esc(GROUPS[MUSCLES[m].group].name)}</span>`,
    onClick: (m) => navigate(`#/muscle/${m}`),
  });
  const unCards = bindCardActions(view);
  return () => {
    unbind();
    unCards();
  };
}

function bestMuscle(e, groupId) {
  let best = null;
  for (const [m] of GROUPS[groupId].muscles) if (!best || (e.m[m] || 0) > (e.m[best] || 0)) best = m;
  return groupLoad(e, groupId) ? best : null;
}
