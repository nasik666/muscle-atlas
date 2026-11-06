// Проигрыватель анимации техники: цикл поз, автокадрирование, управление.

import { MOTIONS } from './motions.js';
import { solveSide, solveFront, drawSide, drawFront, lerpPose, ease, bodyHeat, setHeatFn, BB } from './engine.js';
import { heatRGB } from '../body/bodymap.js';

setHeatFn(heatRGB);

const SKIP = new Set(['u', 'v', 'u2', 'v2', 'far']);

export function buildMotion(e) {
  const [key, params] = e.anim || [];
  const make = MOTIONS[key];
  if (!make) return null;
  const M = make(params || {});
  if (!M.seq) M.seq = [[1, 1.1, 0.3], [0, 1.2, 0.45]];
  M.cycle = M.seq.reduce((s, [, d, h]) => s + d + h, 0);
  M.heat = bodyHeat(e.m);
  return M;
}

/** Поза и номер фазы в момент времени t (сек). */
export function frameAt(M, t) {
  let time = ((t % M.cycle) + M.cycle) % M.cycle;
  let from = M.seq[M.seq.length - 1][0];
  for (let i = 0; i < M.seq.length; i++) {
    const [to, d, h] = M.seq[i];
    if (time < d) return { pose: lerpPose(M.keys[from], M.keys[to], ease(time / d)), phase: i, moving: true };
    time -= d;
    if (time < h) return { pose: M.keys[to], phase: i, moving: false };
    time -= h;
    from = to;
  }
  return { pose: M.keys[0], phase: 0, moving: false };
}

const solve = (M, pose) => (M.view === 'front' ? solveFront(pose) : solveSide(pose));

export function renderFrame(M, pose) {
  const J = solve(M, pose);
  const layers = M.equip ? M.equip(J, pose) : {};
  return M.view === 'front' ? drawFront(J, M.heat, layers) : drawSide(J, M.heat, layers);
}

/** Рамка, вмещающая всё движение (с учётом инвентаря), с заданным соотношением сторон. */
export function fitBox(M, aspect = 1.25) {
  const pts = [];
  BB.on = true;
  BB.pts = [];
  const samples = [];
  for (let i = 0; i < M.keys.length; i++) {
    samples.push(M.keys[i]);
    const next = M.keys[(i + 1) % M.keys.length];
    samples.push(lerpPose(M.keys[i], next, 0.5));
  }
  for (const pose of samples) {
    const J = solve(M, pose);
    if (M.equip) M.equip(J, pose);
    for (const [k, v] of Object.entries(J)) if (Array.isArray(v) && typeof v[0] === 'number' && !SKIP.has(k)) pts.push(v);
  }
  BB.on = false;
  const all = pts.map(([x, y]) => [x, y, 11]).concat(BB.pts.map(([x, y]) => [x, y, 1]));
  let x0 = Math.min(...all.map((p) => p[0] - p[2]));
  let x1 = Math.max(...all.map((p) => p[0] + p[2]));
  let y0 = Math.min(...all.map((p) => p[1] - p[2]));
  let y1 = Math.max(0, ...all.map((p) => p[1] + p[2]));
  y1 = Math.max(y1, 4) + 6;
  const pad = 10;
  x0 -= pad;
  x1 += pad;
  y0 -= pad;
  let w = x1 - x0;
  let h = y1 - y0;
  if (w / h < aspect) {
    const nw = h * aspect;
    x0 -= (nw - w) / 2;
    w = nw;
  } else {
    const nh = w / aspect;
    y0 -= nh - h;
    h = nh;
  }
  return [x0, y0, w, h].map((v) => Math.round(v * 10) / 10);
}

const SVG_DEFS = `<defs>
  <radialGradient id="an-shadow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#000" stop-opacity=".45"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
  <linearGradient id="an-floor" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".16"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
</defs>`;

/** Статичный кадр (для превью). */
export function staticSVG(e, phase = 0.5) {
  const M = buildMotion(e);
  if (!M) return '';
  const vb = fitBox(M);
  const { pose } = frameAt(M, M.cycle * phase);
  return `<svg viewBox="${vb.join(' ')}" xmlns="http://www.w3.org/2000/svg">${SVG_DEFS}${floorSVG(vb)}${renderFrame(M, pose)}</svg>`;
}

function floorSVG(vb) {
  const [x, , w] = vb;
  return `<rect x="${x}" y="0" width="${w}" height="1.2" fill="url(#an-floor)"/>`;
}

export function mountAnimation(box, e) {
  const M = buildMotion(e);
  if (!M) {
    box.innerHTML = '<p class="muted small" style="padding:20px;text-align:center">Анимация для этого упражнения пока не готова — смотрите пошаговую технику.</p>';
    return () => {};
  }
  const vb = fitBox(M);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  box.innerHTML = `
    <svg viewBox="${vb.join(' ')}" role="img" aria-label="Анимация техники: ${e.name}">${SVG_DEFS}
      <ellipse class="an-shadow" cx="0" cy="0" rx="60" ry="5" fill="url(#an-shadow)"/>
      ${floorSVG(vb)}<g class="an-fig"></g>
    </svg>
    <div class="anim-ctrl">
      <button class="btn icon sm" data-play aria-label="Пауза"></button>
      <button class="btn sm" data-speed title="Скорость">1×</button>
    </div>
    <div class="anim-label" aria-live="off"></div>`;
  const fig = box.querySelector('.an-fig');
  const shadow = box.querySelector('.an-shadow');
  const label = box.querySelector('.anim-label');
  const playBtn = box.querySelector('[data-play]');
  const speedBtn = box.querySelector('[data-speed]');
  const ICON_PAUSE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M8 5v14M16 5v14"/></svg>';
  const ICON_PLAY = '<svg viewBox="0 0 24 24"><path d="M7 4.5v15l12-7.5z" fill="currentColor"/></svg>';

  let playing = !reduce;
  let visible = true;
  let speed = 1;
  let t = M.cycle * 0.15;
  let last = performance.now();
  let raf = 0;
  let lastPhase = -1;

  const draw = () => {
    const { pose, phase } = frameAt(M, t);
    fig.innerHTML = renderFrame(M, pose);
    if (phase !== lastPhase) {
      lastPhase = phase;
      label.textContent = M.phases?.[phase] || '';
    }
  };
  const cx = vb[0] + vb[2] / 2;
  shadow.setAttribute('cx', cx.toFixed(1));
  shadow.setAttribute('rx', (vb[2] * 0.32).toFixed(1));

  const loop = (now) => {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (playing && visible) {
      t += dt * speed;
      draw();
    }
    raf = requestAnimationFrame(loop);
  };
  const syncBtn = () => {
    playBtn.innerHTML = playing ? ICON_PAUSE : ICON_PLAY;
    playBtn.setAttribute('aria-label', playing ? 'Пауза' : 'Воспроизвести');
  };
  playBtn.addEventListener('click', () => {
    playing = !playing;
    last = performance.now();
    syncBtn();
  });
  speedBtn.addEventListener('click', () => {
    speed = speed === 1 ? 0.5 : speed === 0.5 ? 0.25 : 1;
    speedBtn.textContent = `${speed === 1 ? '1' : speed === 0.5 ? '0,5' : '0,25'}×`;
  });
  const io = new IntersectionObserver(([en]) => {
    visible = en.isIntersecting;
    last = performance.now();
  });
  io.observe(box);
  const onVis = () => {
    last = performance.now();
  };
  document.addEventListener('visibilitychange', onVis);

  syncBtn();
  draw();
  raf = requestAnimationFrame(loop);
  return () => {
    cancelAnimationFrame(raf);
    io.disconnect();
    document.removeEventListener('visibilitychange', onVis);
  };
}
