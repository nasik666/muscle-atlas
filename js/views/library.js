// Каталог упражнений: поиск и фильтры (состояние хранится в адресе).

import { GROUPS, GROUP_ORDER, MUSCLES } from '../data/muscles.js';
import { EQUIPMENT, EQUIPMENT_ORDER, LEVEL_NAMES } from '../data/equipment.js';
import { EXERCISES, norm, groupLoad, groupRank, available } from '../data/exercises.js';
import { esc, icon, exCard, footer, fmtCount } from '../ui.js';
import { store } from '../store.js';
import { bindCardActions } from './shared.js';

const SORTS = {
  load: 'По нагрузке на группу',
  name: 'По алфавиту',
  compound: 'Сначала базовые',
  level: 'Сначала простые',
};

export function renderLibrary(view, _params, query) {
  const st = {
    q: query.q || '',
    group: query.group && GROUPS[query.group] ? query.group : '',
    eq: query.eq || '',
    type: query.type || '',
    level: query.level || '',
    sort: SORTS[query.sort] ? query.sort : 'load',
  };

  view.innerHTML = `
    <div class="section-head" style="margin-top:4px"><div class="grow"><span class="eyebrow">Каталог</span><h1 class="mt-8" style="font-size:clamp(26px,3vw,38px)">Упражнения</h1></div></div>
    <div class="lib-layout">
      <aside class="lib-side panel" id="side"></aside>
      <div>
        <div class="lib-top">
          <label class="search-box">${icon.search}<input class="input" id="q" type="search" placeholder="Жим, присед, бицепс, гантели…" value="${esc(st.q)}" autocomplete="off" aria-label="Поиск"></label>
          <button class="btn filters-toggle" id="ftoggle">${icon.filter}Фильтры</button>
          <select class="select" id="sort" style="width:auto" aria-label="Сортировка">${Object.entries(SORTS)
            .map(([k, v]) => `<option value="${k}"${st.sort === k ? ' selected' : ''}>${v}</option>`)
            .join('')}</select>
        </div>
        <p class="result-count" id="count"></p>
        <div class="ex-grid" id="list"></div>
      </div>
    </div>
    ${footer()}`;

  const side = view.querySelector('#side');
  const chip = (key, val, label, on) => `<button class="chip sm${on ? ' on' : ''}" data-k="${key}" data-v="${val}">${label}</button>`;
  const drawSide = () => {
    side.innerHTML = `
      <h4>Группа мышц</h4>
      <div class="chips">${chip('group', '', 'Все', !st.group)}${GROUP_ORDER.map((g) => chip('group', g, GROUPS[g].name, st.group === g)).join('')}</div>
      <h4>Оборудование</h4>
      <div class="chips">${chip('eq', '', 'Любое', !st.eq)}${chip('eq', 'mine', 'Только моё', st.eq === 'mine')}${EQUIPMENT_ORDER.filter((q) => q !== 'bench')
        .map((q) => chip('eq', q, EQUIPMENT[q].short, st.eq === q))
        .join('')}</div>
      <h4>Тип</h4>
      <div class="chips">${chip('type', '', 'Любой', !st.type)}${chip('type', 'compound', 'Базовые', st.type === 'compound')}${chip('type', 'isolation', 'Изолирующие', st.type === 'isolation')}</div>
      <h4>Уровень</h4>
      <div class="chips">${chip('level', '', 'Любой', !st.level)}${[1, 2, 3].map((l) => chip('level', String(l), LEVEL_NAMES[l], st.level === String(l))).join('')}</div>
      ${st.eq === 'mine' ? `<p class="xs muted mt-12">«Моё» оборудование настраивается в конструкторе тренировок.</p>` : ''}
    `;
  };

  const filter = () => {
    const words = norm(st.q).split(/\s+/).filter(Boolean);
    const mine = new Set(store.settings.equipment);
    let list = EXERCISES.filter((e) => {
      if (words.length && !words.every((w) => e.search.includes(w) || musclesText(e).includes(w))) return false;
      if (st.group && groupLoad(e, st.group) < 60) return false;
      if (st.eq === 'mine' && !available(e, mine)) return false;
      if (st.eq && st.eq !== 'mine' && !e.eq.includes(st.eq)) return false;
      if (st.type && e.type !== st.type) return false;
      if (st.level && e.level !== +st.level) return false;
      return true;
    });
    const byName = (a, b) => a.name.localeCompare(b.name, 'ru');
    if (st.sort === 'name') list.sort(byName);
    else if (st.sort === 'compound') list.sort((a, b) => (a.type === b.type ? byName(a, b) : a.type === 'compound' ? -1 : 1));
    else if (st.sort === 'level') list.sort((a, b) => a.level - b.level || byName(a, b));
    else if (st.group) list.sort((a, b) => groupRank(b, st.group) - groupRank(a, st.group) || byName(a, b));
    else list.sort((a, b) => GROUP_ORDER.indexOf(a.primaryGroup) - GROUP_ORDER.indexOf(b.primaryGroup) || (a.type === b.type ? 0 : a.type === 'compound' ? -1 : 1));
    return list;
  };

  const drawList = () => {
    const list = filter();
    view.querySelector('#count').textContent = `${fmtCount(list.length, 'упражнение', 'упражнения', 'упражнений')}${st.q ? ` по запросу «${st.q}»` : ''}`;
    view.querySelector('#list').innerHTML = list.length
      ? list.map((e) => exCard(e)).join('')
      : `<div class="empty panel" style="grid-column:1/-1"><div class="ico">${icon.search}</div><h3>Ничего не найдено</h3><p>Измените запрос или сбросьте фильтры.</p><button class="btn" data-reset>Сбросить фильтры</button></div>`;
  };

  const syncUrl = () => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(st)) if (v && !(k === 'sort' && v === 'load')) p.set(k, v);
    const qs = p.toString();
    history.replaceState(null, '', `#/exercises${qs ? '?' + qs : ''}`);
  };

  drawSide();
  drawList();

  side.addEventListener('click', (e) => {
    const b = e.target.closest('[data-k]');
    if (!b) return;
    st[b.dataset.k] = b.dataset.v;
    drawSide();
    drawList();
    syncUrl();
  });
  view.addEventListener('click', (e) => {
    if (e.target.closest('[data-reset]')) {
      Object.assign(st, { q: '', group: '', eq: '', type: '', level: '' });
      view.querySelector('#q').value = '';
      drawSide();
      drawList();
      syncUrl();
    }
  });
  const q = view.querySelector('#q');
  let t;
  q.addEventListener('input', () => {
    clearTimeout(t);
    t = setTimeout(() => {
      st.q = q.value.trim();
      drawList();
      syncUrl();
    }, 120);
  });
  view.querySelector('#sort').addEventListener('change', (e) => {
    st.sort = e.target.value;
    drawList();
    syncUrl();
  });
  view.querySelector('#ftoggle').addEventListener('click', () => side.classList.toggle('open'));
  if (query.focus) setTimeout(() => q.focus(), 50);

  const unCards = bindCardActions(view);
  return () => unCards();
}

const mtCache = new Map();
function musclesText(e) {
  if (!mtCache.has(e.id))
    mtCache.set(e.id, norm(e.sorted.filter(([, v]) => v >= 50).map(([m]) => `${MUSCLES[m].name} ${GROUPS[MUSCLES[m].group].name}`).join(' ')));
  return mtCache.get(e.id);
}
