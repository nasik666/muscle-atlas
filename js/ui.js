// Общие UI-помощники: иконки, карточки, тосты, модальные окна, подсказки.

import { bodySVG, heatColor, HEAT_GRADIENT } from './body/bodymap.js';
import { MUSCLES } from './data/muscles.js';
import { EQUIPMENT, LEVEL_NAMES } from './data/equipment.js';
import { heatOf } from './data/exercises.js';
import { store } from './store.js';
import { hasPhoto, photoSrc } from './data/photos.js';

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const I = (d, extra = '') =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${extra}>${d}</svg>`;

export const icon = {
  star: I('<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/>'),
  plus: I('<path d="M12 5v14M5 12h14"/>'),
  minus: I('<path d="M5 12h14"/>'),
  check: I('<path d="m5 12.5 4.5 4.5L19 7.5"/>'),
  x: I('<path d="M6 6l12 12M18 6 6 18"/>'),
  trash: I('<path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13"/>'),
  copy: I('<rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8"/>'),
  share: I('<path d="M12 15V3.5M7.5 8 12 3.5 16.5 8"/><path d="M5 12v6.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V12"/>'),
  play: I('<path d="M7 4.5v15l12-7.5z" fill="currentColor"/>'),
  pause: I('<path d="M8 5v14M16 5v14" stroke-width="3"/>'),
  search: I('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
  filter: I('<path d="M4 6h16M7 12h10M10 18h4"/>'),
  right: I('<path d="m9 6 6 6-6 6"/>'),
  left: I('<path d="m15 6-6 6 6 6"/>'),
  up: I('<path d="m6 15 6-6 6 6"/>'),
  down: I('<path d="m6 9 6 6 6-6"/>'),
  grip: I('<circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/>'),
  info: I('<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.5v.5"/>'),
  alert: I('<path d="M12 3.5 2.5 20h19z"/><path d="M12 10v4.5M12 17.5v.5"/>'),
  bulb: I('<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.4 1 1.1 1 1.9V16h5v-.2c0-.8.4-1.5 1-1.9A6 6 0 0 0 12 3z"/>'),
  magic: I('<path d="m4 20 11-11M14 4l1 2 2 1-2 1-1 2-1-2-2-1 2-1zM19 11l.7 1.3L21 13l-1.3.7L19 15l-.7-1.3L17 13l1.3-.7zM7 3l.7 1.3L9 5l-1.3.7L7 7l-.7-1.3L5 5l1.3-.7z"/>'),
  dumbbell: I('<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"/>'),
  target: I('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/>'),
  flame: I('<path d="M12 21c4 0 7-2.7 7-6.6 0-3.4-2.4-5.4-3.6-8.4-.5 2-1.5 3-2.6 3.5C13 6.5 11.5 4 9 3c.3 3-3 5.7-3 10 0 4.6 2.6 8 6 8z"/>'),
  list: I('<path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>'),
  download: I('<path d="M12 3.5V15M7.5 10.5 12 15l4.5-4.5M5 19.5h14"/>'),
  upload: I('<path d="M12 15V3.5M7.5 8 12 3.5 16.5 8M5 19.5h14"/>'),
  video: I('<rect x="3" y="6" width="13" height="12" rx="2.5"/><path d="m16 10.5 5-3v9l-5-3z"/>'),
  edit: I('<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/>'),
  clock: I('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  dice: I('<rect x="4" y="4" width="16" height="16" rx="4"/><circle cx="9" cy="9" r="1.2" fill="currentColor"/><circle cx="15" cy="15" r="1.2" fill="currentColor"/><circle cx="15" cy="9" r="1.2" fill="currentColor"/><circle cx="9" cy="15" r="1.2" fill="currentColor"/>'),
  layers: I('<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>'),
  more: I('<circle cx="5.5" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="18.5" cy="12" r="1.3" fill="currentColor"/>'),
  body: I('<circle cx="12" cy="4.5" r="2.5"/><path d="M12 7v6m0 0-3 8m3-8 3 8M6 10l6-1 6 1"/>'),
  sparkle: I('<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>'),
  scale: I('<path d="M12 4v16M5 20h14M5 8h14M7 8l-3 6a3 3 0 0 0 6 0zM17 8l-3 6a3 3 0 0 0 6 0z"/>'),
  order: I('<path d="M4 6h9M4 12h7M4 18h5M17 5v14M14 16l3 3 3-3"/>'),
  shuffle: I('<path d="M16 4h4v4M4 20 20 4M20 16v4h-4M15 15l5 5M4 4l5 5"/>'),
  repeat: I('<path d="M17 2.5 20.5 6 17 9.5"/><path d="M3.5 11V9a3 3 0 0 1 3-3h14M7 21.5 3.5 18 7 14.5"/><path d="M20.5 13v2a3 3 0 0 1-3 3h-14"/>'),
};

// ---------------------------------------------------------------- тосты
export function toast(text, ico = icon.check) {
  const root = document.getElementById('toast-root');
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `${ico}<span>${esc(text)}</span>`;
  root.appendChild(el);
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 300);
  }, 2400);
}

// ---------------------------------------------------------------- модалка
export function modal({ title, body, foot = '', onMount, onClose, wide = false }) {
  const back = document.createElement('div');
  back.className = 'modal-back';
  back.innerHTML = `<div class="modal glass" role="dialog" aria-modal="true" aria-label="${esc(title)}" style="${wide ? 'width:min(900px,100%)' : ''}">
    <div class="modal-head"><h3>${esc(title)}</h3><button class="btn icon sm ghost" data-close aria-label="Закрыть">${icon.x}</button></div>
    <div class="modal-body">${body}</div>
    ${foot ? `<div class="modal-foot">${foot}</div>` : ''}
  </div>`;
  const prevFocus = document.activeElement;
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    back.remove();
    document.removeEventListener('keydown', onKey);
    document.body.style.overflow = '';
    prevFocus?.focus?.();
    onClose?.();
  };
  const onKey = (e) => e.key === 'Escape' && close();
  back.addEventListener('click', (e) => {
    if (e.target === back || e.target.closest('[data-close]')) close();
  });
  document.addEventListener('keydown', onKey);
  document.body.appendChild(back);
  document.body.style.overflow = 'hidden';
  const m = back.querySelector('.modal');
  onMount?.(m, close);
  (m.querySelector('[autofocus]') || m.querySelector('button'))?.focus();
  return close;
}

export function confirmDialog(text, okText = 'Удалить') {
  return new Promise((resolve) => {
    let ok = false;
    modal({
      title: 'Подтвердите действие',
      body: `<p class="muted">${esc(text)}</p>`,
      foot: `<button class="btn" data-close>Отмена</button><button class="btn primary" data-ok>${esc(okText)}</button>`,
      onMount: (m, close) => {
        m.querySelector('[data-ok]').addEventListener('click', () => {
          ok = true;
          close();
        });
      },
      onClose: () => resolve(ok),
    });
  });
}

// ---------------------------------------------------------------- меню
export function popMenu(anchor, items) {
  document.querySelectorAll('.menu').forEach((m) => m.remove());
  const menu = document.createElement('div');
  menu.className = 'menu';
  menu.innerHTML = items
    .map((it, i) => (it === '-' ? '<hr>' : `<button data-i="${i}">${it.icon || ''}<span>${esc(it.label)}</span></button>`))
    .join('');
  document.body.appendChild(menu);
  const r = anchor.getBoundingClientRect();
  const mw = menu.offsetWidth;
  const left = Math.min(window.scrollX + r.right - mw, window.scrollX + document.documentElement.clientWidth - mw - 8);
  menu.style.left = Math.max(8, left) + 'px';
  menu.style.top = window.scrollY + r.bottom + 6 + 'px';
  const close = () => {
    menu.remove();
    document.removeEventListener('pointerdown', outside, true);
  };
  const outside = (e) => !menu.contains(e.target) && e.target !== anchor && close();
  setTimeout(() => document.addEventListener('pointerdown', outside, true));
  menu.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-i]');
    if (!b) return;
    close();
    items[+b.dataset.i].action();
  });
  return close;
}

// ---------------------------------------------------------------- подсказка
const tt = () => document.getElementById('tooltip');
export function showTip(html, x, y) {
  const el = tt();
  el.innerHTML = html;
  el.classList.add('show');
  const w = el.offsetWidth;
  const h = el.offsetHeight;
  const vw = document.documentElement.clientWidth;
  let left = x + 16;
  if (left + w > vw - 8) left = x - w - 16;
  let top = y + 16;
  if (top + h > window.innerHeight - 8) top = y - h - 12;
  el.style.left = Math.max(8, left) + 'px';
  el.style.top = Math.max(8, top) + 'px';
}
export const hideTip = () => tt().classList.remove('show');

/**
 * Интерактивность карты тела внутри контейнера: подсказки и клики по мышцам.
 * @param {HTMLElement} root
 * @param {object} o
 * @param {(id:string)=>string} [o.tip]   HTML подсказки
 * @param {(id:string, e:Event)=>void} [o.onClick]
 * @param {(id:string|null)=>void} [o.onHover]
 */
export function bindBodyMap(root, { tip, onClick, onHover } = {}) {
  let last = null;
  const over = (e) => {
    const el = e.target.closest?.('[data-m]');
    const id = el?.dataset.m || null;
    if (id !== last) {
      last = id;
      onHover?.(id);
      root.querySelectorAll('.m.hl').forEach((m) => m.classList.remove('hl'));
      if (id) root.querySelectorAll(`[data-m="${id}"]`).forEach((m) => m.classList.add('hl'));
    }
    if (id && tip && e.pointerType !== 'touch') showTip(tip(id), e.clientX, e.clientY);
    else if (!id) hideTip();
  };
  const leave = () => {
    last = null;
    onHover?.(null);
    hideTip();
    root.querySelectorAll('.m.hl').forEach((m) => m.classList.remove('hl'));
  };
  const click = (e) => {
    const el = e.target.closest?.('[data-m]');
    if (!el) return;
    hideTip();
    onClick?.(el.dataset.m, e);
  };
  root.addEventListener('pointermove', over);
  root.addEventListener('pointerleave', leave);
  root.addEventListener('click', click);
  return () => {
    root.removeEventListener('pointermove', over);
    root.removeEventListener('pointerleave', leave);
    root.removeEventListener('click', click);
    hideTip();
  };
}

/** Подсветить мышцы на всех картах контейнера (например, при наведении на строку списка). */
export function highlightMuscle(root, id) {
  root.querySelectorAll('.m.hl').forEach((m) => m.classList.remove('hl'));
  if (id) root.querySelectorAll(`[data-m="${id}"]`).forEach((m) => m.classList.add('hl'));
}

// ---------------------------------------------------------------- элементы
export const heatLegend = (from = 'слабая', to = 'максимальная') =>
  `<div class="heat-legend"><span>${from}</span><span class="bar" style="background:${HEAT_GRADIENT}"></span><span>${to}</span></div>`;

export function loadBar(v, label = '') {
  const pct = Math.round(v);
  return `<div class="loadbar">${label ? `<span>${esc(label)}</span>` : ''}<span class="track"><span class="fill" style="width:${pct}%;background:${heatColor(pct / 100)}"></span></span><span class="val">${pct}%</span></div>`;
}

export function thumb(e, { focus } = {}) {
  const heat = heatOf(e);
  return `<div class="body-pair">${bodySVG({ view: 'front', heat, focus })}${bodySVG({ view: 'back', heat, focus })}</div>`;
}

/** Маленькое фото упражнения (если фото нет — карта мышц). */
export function photoThumb(e) {
  return hasPhoto(e.id) ? `<span class="ph-thumb"><img src="${photoSrc(e.id, 'a')}" alt="" loading="lazy" decoding="async"></span>` : `<span class="ph-thumb map">${thumb(e)}</span>`;
}

export const eqNames = (e) => e.eq.filter((q) => q !== 'bench' || e.eq.length === 1).map((q) => EQUIPMENT[q].short);

/**
 * Карточка упражнения.
 * @param {object} e упражнение
 * @param {object} [o]
 * @param {string} [o.muscle] — показать нагрузку на эту мышцу
 * @param {boolean} [o.add] — кнопка «добавить в тренировку»
 */
export function exCard(e, { muscle, add = true } = {}) {
  const fav = store.isFav(e.id);
  const top = e.sorted.slice(0, 3).map(([m]) => MUSCLES[m].name).join(' · ');
  return `<article class="ex-card" data-ex="${e.id}">
    <a class="stretch" href="#/exercise/${e.id}" aria-label="${esc(e.name)}"></a>
    <button class="icon-toggle fav-btn${fav ? ' on' : ''}" data-fav="${e.id}" aria-pressed="${fav}" aria-label="${fav ? 'Убрать из избранного' : 'В избранное'}" title="${fav ? 'Убрать из избранного' : 'В избранное'}">${icon.star}</button>
    ${add ? `<button class="icon-toggle add-btn" data-add="${e.id}" aria-label="Добавить в тренировку" title="Добавить в тренировку">${icon.plus}</button>` : ''}
    <div class="thumb">${thumb(e, { focus: muscle })}</div>
    <h3>${esc(e.name)}</h3>
    <div class="primary-m">${esc(top)}</div>
    <div class="meta">${eqNames(e).map((n) => `<span class="tag">${esc(n)}</span>`).join('')}<span class="tag">${e.type === 'compound' ? 'Базовое' : 'Изолирующее'}</span></div>
    ${muscle ? `<div class="load">${loadBar(e.m[muscle] || 0, 'Нагрузка')}</div>` : ''}
  </article>`;
}

export const levelName = (n) => LEVEL_NAMES[n];

export function ringSVG(value, size = 120, stroke = 10, color = null) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const col = color || scoreColor(value);
  return `<svg viewBox="0 0 ${size} ${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="rgb(255 255 255 / .08)" stroke-width="${stroke}"/><circle class="ring-arc" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${col}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - Math.max(0, Math.min(100, value)) / 100)}" style="transition:stroke-dashoffset .8s cubic-bezier(.2,.8,.2,1), stroke .4s"/></svg>`;
}

export function scoreColor(v) {
  if (v >= 85) return '#3ddc97';
  if (v >= 70) return '#a6e05a';
  if (v >= 55) return '#ffc24b';
  if (v >= 35) return '#ff8a3d';
  return '#ff5a5f';
}

export function plural(n, one, few, many) {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b > 1 && b < 5) return few;
  if (b === 1) return one;
  return many;
}

export const fmtCount = (n, one, few, many) => `${n} ${plural(n, one, few, many)}`;

export function footer() {
  return `<footer class="footer"><span>MuscleAtlas · атлас упражнений. Данные о нагрузке — ориентировочные, по данным ЭМГ-исследований и биомеханики.</span><span>Проконсультируйтесь со специалистом при травмах.</span></footer>`;
}
