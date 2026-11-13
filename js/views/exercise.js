// Страница упражнения: фото/схема техники, тепловая карта, нагрузка по мышцам, шаги, похожие.

import { bodySVG, heatColor } from '../body/bodymap.js';
import { MUSCLES, GROUPS } from '../data/muscles.js';
import { EQUIPMENT } from '../data/equipment.js';
import { EX, heatOf, similarExercises } from '../data/exercises.js';
import { bindBodyMap, esc, icon, exCard, footer, heatLegend, levelName, highlightMuscle } from '../ui.js';
import { navigate } from '../router.js';
import { store } from '../store.js';
import { bindCardActions, addToWorkoutMenu } from './shared.js';
import { mountTechnique } from '../anim/player.js';

const BREATH = {
  compound: 'Вдох — перед опусканием веса (уступающая фаза), выдох — на усилии, после прохождения самой тяжёлой точки. Пресс напряжён всё движение.',
  isolation: 'Вдох — в лёгкой фазе (возвращение в исходное положение), выдох — на усилии. Не задерживайте дыхание надолго.',
};

export function renderExercise(view, { id }) {
  const e = EX[id];
  if (!e) return navigate('#/exercises', { replace: true });
  const heat = heatOf(e);
  const G = GROUPS[e.primaryGroup];
  const fav = store.isFav(e.id);
  const groupsRows = [
    ['Основная нагрузка', e.sorted.filter(([, v]) => v >= 70)],
    ['Вторичная', e.sorted.filter(([, v]) => v >= 35 && v < 70)],
    ['Стабилизаторы', e.sorted.filter(([, v]) => v < 35)],
  ].filter(([, list]) => list.length);
  const yt = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${e.name} техника выполнения`)}`;

  view.innerHTML = `
    <nav class="crumbs" aria-label="Навигация"><a href="#/exercises">Упражнения</a>${icon.right}<a href="#/group/${e.primaryGroup}">${esc(G.name)}</a>${icon.right}<span>${esc(e.name)}</span></nav>
    <section class="ex-layout">
      <div class="ex-col">
        <div class="tech-media glass">
          <div class="tm-head"><h2>Техника</h2><div class="seg" id="tech-mode" role="group" aria-label="Вид техники"></div></div>
          <div class="anim-box" id="anim"></div>
          <div class="facts">
            <div class="fact"><span>Повторения</span><b>${esc(e.reps)}</b></div>
            <div class="fact"><span>Подходы</span><b>${e.type === 'compound' ? '3–5' : '2–4'}</b></div>
            <div class="fact"><span>Отдых</span><b>${e.type === 'compound' ? '2–3 мин' : '60–90 с'}</b></div>
          </div>
        </div>
        <div class="heat-card glass">
          <div class="tm-head"><h2>Какие мышцы работают</h2></div>
          <div class="body-pair" id="heatmap">
            <figure class="body-fig">${bodySVG({ view: 'front', heat, interactive: true })}<figcaption>Спереди</figcaption></figure>
            <figure class="body-fig">${bodySVG({ view: 'back', heat, interactive: true })}<figcaption>Сзади</figcaption></figure>
          </div>
          <div class="mt-12">${heatLegend('слабая нагрузка', 'максимальная')}</div>
        </div>
      </div>
      <div class="ex-col">
        <div class="ex-head glass">
          <span class="eyebrow">${esc(G.name)} · ${e.type === 'compound' ? 'базовое' : 'изолирующее'}</span>
          <h1 class="mt-8">${esc(e.name)}</h1>
          <p class="en">${esc(e.en)}</p>
          <div class="tags">
            ${e.eq.map((q) => `<span class="tag">${icon.dumbbell}${esc(EQUIPMENT[q].name)}</span>`).join('')}
            <span class="tag">${icon.layers}${esc(levelName(e.level))}</span>
            <span class="tag accent">${icon.repeat}${esc(e.reps)}${/[смв]$/.test(e.reps) ? '' : ' повт.'}</span>
          </div>
          <div class="ex-actions">
            <button class="btn primary" id="add">${icon.plus}В тренировку</button>
            <button class="btn fav${fav ? ' on' : ''}" id="fav">${icon.star}<span>${fav ? 'В избранном' : 'В избранное'}</span></button>
            <a class="btn ghost" href="${yt}" target="_blank" rel="noopener">${icon.video}Видео</a>
          </div>
        </div>
        <div class="load-list glass" id="loads">
          ${groupsRows
            .map(
              ([title, list]) => `<div class="load-group"><h4>${title}</h4>${list
                .map(
                  ([m, v]) => `<div class="load-row" data-row="${m}" role="link" tabindex="0" aria-label="${esc(MUSCLES[m].name)}: ${v}%">
                    <span class="nm">${esc(MUSCLES[m].name)}</span>
                    <span class="track"><span class="fill" style="width:${v}%;background:${heatColor(v / 100)}"></span></span>
                    <span class="pct" style="color:${heatColor(Math.max(0.35, v / 100))}">${v}%</span>
                  </div>`,
                )
                .join('')}</div>`,
            )
            .join('')}
        </div>
      </div>
    </section>

    <section class="tech glass" aria-labelledby="tech-h">
      <h2 id="tech-h">Как выполнять</h2>
      <div class="tech-grid mt-16">
        <ol class="steps">${e.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
        <div class="stack">
          <div class="info-box"><h4>${icon.repeat}Дыхание</h4><p>${esc(e.breath || BREATH[e.type])}</p></div>
          <div class="info-box"><h4>${icon.alert}Частые ошибки</h4><ul class="note-list bad">${e.mistakes.map((s) => `<li>${icon.x}${esc(s)}</li>`).join('')}</ul></div>
          <div class="info-box"><h4>${icon.bulb}Советы</h4><ul class="note-list good">${e.tips.map((s) => `<li>${icon.sparkle}${esc(s)}</li>`).join('')}</ul></div>
        </div>
      </div>
    </section>

    <div class="section-head"><h2>Похожие упражнения</h2><a class="btn sm ghost" href="#/muscle/${e.primary}">Все на «${esc(MUSCLES[e.primary].name)}» ${icon.right}</a></div>
    <div class="ex-grid">${similarExercises(e, 4).map((x) => exCard(x)).join('')}</div>
    ${footer()}`;

  // избранное / тренировка
  const favBtn = view.querySelector('#fav');
  favBtn.addEventListener('click', () => {
    const on = store.toggleFav(e.id);
    favBtn.classList.toggle('on', on);
    favBtn.querySelector('span').textContent = on ? 'В избранном' : 'В избранное';
  });
  view.querySelector('#add').addEventListener('click', (ev) => addToWorkoutMenu(ev.currentTarget, e.id));

  // карта ↔ список
  const map = view.querySelector('#heatmap');
  const loads = view.querySelector('#loads');
  const unbind = bindBodyMap(map, {
    tip: (m) => {
      const v = e.m[m] || 0;
      return `<b>${esc(MUSCLES[m].name)}</b>${
        v
          ? `<div class="tt-load"><span style="color:${heatColor(Math.max(0.35, v / 100))};font-weight:800">${v}%</span><span class="muted small">${v >= 70 ? 'основная' : v >= 35 ? 'вторичная' : 'стабилизатор'}</span></div>`
          : '<span class="muted small">не задействована</span>'
      }`;
    },
    onHover: (m) => loads.querySelectorAll('.load-row').forEach((r) => r.classList.toggle('hl', r.dataset.row === m)),
    onClick: (m) => navigate(`#/muscle/${m}`),
  });
  loads.addEventListener('pointerover', (ev) => {
    const r = ev.target.closest('[data-row]');
    highlightMuscle(map, r?.dataset.row || null);
  });
  loads.addEventListener('pointerleave', () => highlightMuscle(map, null));
  loads.addEventListener('click', (ev) => {
    const r = ev.target.closest('[data-row]');
    if (r) navigate(`#/muscle/${r.dataset.row}`);
  });
  loads.addEventListener('keydown', (ev) => {
    const r = ev.target.closest('[data-row]');
    if (r && (ev.key === 'Enter' || ev.key === ' ')) {
      ev.preventDefault();
      navigate(`#/muscle/${r.dataset.row}`);
    }
  });

  const stopAnim = mountTechnique(view.querySelector('#anim'), view.querySelector('#tech-mode'), e);
  const unCards = bindCardActions(view);
  document.title = `${e.name} — MuscleAtlas`;
  return () => {
    unbind();
    unCards();
    stopAnim?.();
  };
}
