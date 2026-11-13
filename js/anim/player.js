// Проигрыватель техники: фото реального выполнения (два кадра с плавной сменой)
// и схема-манекен (цикл поз, автокадрирование). Общие кнопки: пауза и скорость.

import { MOTIONS } from './motions.js';
import { solveSide, solveFront, drawSide, drawFront, lerpPose, ease, bodyHeat, setHeatFn, BB } from './engine.js';
import { heatRGB } from '../body/bodymap.js';
import { PHOTOS, hasPhoto, photoSrc } from '../data/photos.js';
import { store } from '../store.js';

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

// ------------------------------------------------------------------ фото
const ICON_PAUSE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M8 5v14M16 5v14"/></svg>';
const ICON_PLAY = '<svg viewBox="0 0 24 24"><path d="M7 4.5v15l12-7.5z" fill="currentColor"/></svg>';
const HOLD = 0.95; // сек: кадр стоит
const FADE = 0.55; // сек: плавная смена

/**
 * Фото-анимация: два кадра (начало и конец движения) плавно сменяют друг друга.
 * Нажатие на фото — пауза. onFail вызывается, если кадры не загрузились.
 */
export function mountPhoto(box, e, onFail) {
  const a = photoSrc(e.id, 'a');
  const b = photoSrc(e.id, 'b');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  box.classList.add('photo');
  box.style.setProperty('--ar', PHOTOS[e.id]);
  box.innerHTML = `
    <div class="ph-bg" style="background-image:url('${a}')"></div>
    <div class="ph-stage" role="img" aria-label="Фото техники: ${e.name.replace(/"/g, '&quot;')}">
      <img class="ph" src="${a}" alt="" decoding="async" draggable="false">
      <img class="ph ph-b" src="${b}" alt="" decoding="async" draggable="false">
    </div>
    <div class="anim-ctrl">
      <button class="btn icon sm" data-play aria-label="Пауза"></button>
      <button class="btn sm" data-speed title="Скорость">1×</button>
    </div>
    <div class="anim-label"><span class="ph-dots" aria-hidden="true"><i class="on"></i><i></i></span><span data-txt>Положение 1</span></div>`;
  const stage = box.querySelector('.ph-stage');
  const playBtn = box.querySelector('[data-play]');
  const speedBtn = box.querySelector('[data-speed]');
  const dots = box.querySelectorAll('.ph-dots i');
  const txt = box.querySelector('[data-txt]');

  let playing = !reduce;
  let visible = true;
  let speed = 1;
  let flip = false;
  let timer = 0;
  let dead = false;

  const setFrame = (f) => {
    flip = f;
    stage.classList.toggle('flip', flip);
    dots[0].classList.toggle('on', !flip);
    dots[1].classList.toggle('on', flip);
    txt.textContent = flip ? 'Положение 2' : 'Положение 1';
  };
  const schedule = () => {
    clearTimeout(timer);
    if (dead || !playing || !visible || document.hidden) return;
    timer = setTimeout(() => {
      setFrame(!flip);
      schedule();
    }, ((HOLD + FADE) / speed) * 1000);
  };
  const sync = () => {
    playBtn.innerHTML = playing ? ICON_PAUSE : ICON_PLAY;
    playBtn.setAttribute('aria-label', playing ? 'Пауза' : 'Воспроизвести');
    box.classList.toggle('paused', !playing);
    stage.style.setProperty('--fade', `${FADE / speed}s`);
    schedule();
  };
  const toggle = () => {
    playing = !playing;
    sync();
  };
  playBtn.addEventListener('click', toggle);
  stage.addEventListener('click', () => {
    // на паузе нажатие листает кадры, при воспроизведении — ставит на паузу
    if (playing) toggle();
    else setFrame(!flip);
  });
  speedBtn.addEventListener('click', () => {
    speed = speed === 1 ? 0.5 : 1;
    speedBtn.textContent = speed === 1 ? '1×' : '0,5×';
    sync();
  });
  for (const img of box.querySelectorAll('.ph')) {
    img.addEventListener('error', () => {
      if (!dead) onFail?.();
    });
  }
  const io = new IntersectionObserver(([en]) => {
    visible = en.isIntersecting;
    schedule();
  });
  io.observe(box);
  document.addEventListener('visibilitychange', schedule);

  sync();
  return () => {
    dead = true;
    clearTimeout(timer);
    io.disconnect();
    document.removeEventListener('visibilitychange', schedule);
  };
}

/** Какие режимы показа техники доступны для упражнения. */
export function techModes(e) {
  const modes = [];
  if (hasPhoto(e.id)) modes.push('photo');
  if (MOTIONS[e.anim?.[0]]) modes.push('scheme');
  return modes;
}

/**
 * Блок техники с переключателем «Фото / Схема».
 * @param {HTMLElement} box  контейнер .anim-box
 * @param {HTMLElement} seg  контейнер переключателя (скрывается, если режим один)
 */
export function mountTechnique(box, seg, e) {
  const modes = techModes(e);
  const NAMES = { photo: 'Фото', scheme: 'Схема' };
  let stop = () => {};
  const show = (mode) => {
    stop();
    box.className = 'anim-box';
    box.removeAttribute('style');
    stop =
      mode === 'photo'
        ? mountPhoto(box, e, () => {
            const i = modes.indexOf('photo');
            if (i >= 0) modes.splice(i, 1);
            drawSeg();
            show('scheme');
          })
        : mountAnimation(box, e);
    seg?.querySelectorAll('button').forEach((b) => {
      b.classList.toggle('on', b.dataset.mode === mode);
      b.setAttribute('aria-pressed', String(b.dataset.mode === mode));
    });
  };
  const drawSeg = () => {
    if (!seg) return;
    seg.hidden = modes.length < 2;
    seg.innerHTML = modes.map((m) => `<button type="button" data-mode="${m}">${NAMES[m]}</button>`).join('');
  };
  drawSeg();
  seg?.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-mode]');
    if (!b || b.classList.contains('on')) return;
    store.setSettings({ techMode: b.dataset.mode });
    show(b.dataset.mode);
  });
  const pref = store.settings.techMode;
  show(modes.includes(pref) ? pref : modes[0] || 'scheme');
  return () => stop();
}
