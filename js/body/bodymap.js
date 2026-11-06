// Рендер анатомической карты тела (спереди / сзади) с тепловой подсветкой.
// Все контуры собираются один раз в скрытый SVG-спрайт, а карты ссылаются
// на них через <use> — так даже сотня миниатюр остаётся лёгкой.

import { FRONT, BACK, VIEWBOX } from './shapes.js';
import { smoothClosed, mirror } from './geometry.js';

const VIEWS = { front: { p: 'f', V: FRONT }, back: { p: 'b', V: BACK } };

export const FRONT_IDS = Object.keys(FRONT.muscles);
export const BACK_IDS = Object.keys(BACK.muscles);

let spriteReady = false;

const sym = (polys) => polys.flatMap((poly) => [poly, mirror(poly)]).map((poly) => `<path d="${smoothClosed(poly)}"/>`).join('');

function buildView(p, V) {
  let out = `<g id="${p}-base">${V.base.map((poly) => `<path d="${smoothClosed(poly)}"/>`).join('')}</g>`;
  out += `<g id="${p}-fill">${sym(V.fillers)}</g>`;
  for (const [id, polys] of Object.entries(V.muscles)) out += `<g id="${p}-${id}">${sym(polys)}</g>`;
  const details = V.details.flatMap((d) => (d.mirror ? [d.pts, mirror(d.pts)] : [d.pts]));
  out += `<g id="${p}-details">${details.map((pts) => `<path d="${smoothClosed(pts)}"/>`).join('')}</g>`;
  return out;
}

export function ensureSprite() {
  if (spriteReady) return;
  spriteReady = true;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"
    style="position:absolute;width:0;height:0;overflow:hidden;pointer-events:none">
    <defs>
      ${buildView('f', FRONT)}
      ${buildView('b', BACK)}
      <linearGradient id="ma-body-shade" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#fff" stop-opacity=".22"/>
        <stop offset=".55" stop-color="#fff" stop-opacity="0"/>
        <stop offset="1" stop-color="#0b1020" stop-opacity=".22"/>
      </linearGradient>
      <filter id="ma-glow" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="2.4" result="b"/>
        <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <filter id="ma-focus" x="-40%" y="-40%" width="180%" height="180%">
        <feMorphology in="SourceAlpha" operator="dilate" radius="1.1" result="d"/>
        <feFlood flood-color="#ffffff"/>
        <feComposite in2="d" operator="in" result="o"/>
        <feGaussianBlur in="o" stdDeviation="1.6" result="g"/>
        <feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
  </svg>`;
  document.body.insertAdjacentHTML('afterbegin', svg);
}

// ------------------------------------------------------------------ цвета
// Чем слабее нагрузка — тем светлее (бледно-розовый), чем сильнее — тем краснее.
const STOPS = [
  [0.0, [255, 222, 210]],
  [0.3, [255, 178, 150]],
  [0.55, [255, 120, 95]],
  [0.8, [246, 58, 60]],
  [1.0, [214, 10, 38]],
];

export function heatRGB(v) {
  const t = Math.max(0, Math.min(1, v));
  for (let i = 1; i < STOPS.length; i++) {
    if (t <= STOPS[i][0]) {
      const [t0, c0] = STOPS[i - 1];
      const [t1, c1] = STOPS[i];
      const k = (t - t0) / (t1 - t0);
      return c0.map((c, j) => Math.round(c + (c1[j] - c) * k));
    }
  }
  return STOPS[STOPS.length - 1][1];
}

export const heatColor = (v) => `rgb(${heatRGB(v).join(' ')})`;

/** Градиент для легенды и полосок нагрузки. */
export const HEAT_GRADIENT = `linear-gradient(90deg, ${STOPS.map(([t, c]) => `rgb(${c.join(' ')}) ${t * 100}%`).join(', ')})`;

// ----------------------------------------------------------------- рендер
/**
 * @param {object} o
 * @param {'front'|'back'} o.view
 * @param {Record<string, number>} [o.heat]  нагрузка 0…1 по id мышц
 * @param {string|string[]} [o.focus]        выделенные мышцы (белая обводка)
 * @param {boolean} [o.interactive]          наведение / клик по мышцам
 * @param {string} [o.cls]
 */
export function bodySVG({ view = 'front', heat = {}, focus = null, interactive = false, cls = '', label = '' } = {}) {
  ensureSprite();
  const { p, V } = VIEWS[view];
  const focusSet = new Set(Array.isArray(focus) ? focus : focus ? [focus] : []);
  const ids = Object.keys(V.muscles);
  let s = `<svg class="body-svg ${interactive ? 'interactive ' : ''}${cls}" viewBox="${VIEWBOX}" data-view="${view}" role="img" aria-label="${label || (view === 'front' ? 'Вид спереди' : 'Вид сзади')}">`;
  s += `<use href="#${p}-base" class="b-base"/><use href="#${p}-fill" class="m filler"/>`;
  for (const id of ids) {
    const v = heat[id] || 0;
    const style = v > 0 ? ` style="fill:${heatColor(v)}"` : '';
    const c = `m${v > 0 ? ' hot' : ''}${v >= 0.75 ? ' max' : ''}${focusSet.has(id) ? ' focus' : ''}`;
    s += `<use href="#${p}-${id}"${interactive ? ` data-m="${id}"` : ''} class="${c}"${style}/>`;
  }
  s += `<use href="#${p}-details" class="b-details"/>`;
  s += `<use href="#${p}-base" class="b-shade"/>`;
  s += '</svg>';
  return s;
}

/** Пара фигур (спереди + сзади). */
export function bodyPair(opts = {}) {
  return `<div class="body-pair ${opts.pairCls || ''}">
    <figure class="body-fig">${bodySVG({ ...opts, view: 'front' })}${opts.captions ? '<figcaption>Спереди</figcaption>' : ''}</figure>
    <figure class="body-fig">${bodySVG({ ...opts, view: 'back' })}${opts.captions ? '<figcaption>Сзади</figcaption>' : ''}</figure>
  </div>`;
}

/** На каком виде мышца видна лучше всего. */
export function bestView(id) {
  const inFront = FRONT.muscles[id];
  const inBack = BACK.muscles[id];
  if (inFront && !inBack) return 'front';
  if (inBack && !inFront) return 'back';
  const area = (polys) => polys.reduce((s, poly) => s + Math.abs(polyArea(poly)), 0);
  return area(inFront) >= area(inBack) ? 'front' : 'back';
}

function polyArea(poly) {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i];
    const [x2, y2] = poly[(i + 1) % poly.length];
    a += x1 * y2 - x2 * y1;
  }
  return a / 2;
}
