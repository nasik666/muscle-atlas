// Главная: интерактивная карта мышц + группы + быстрый старт.

import { bodySVG } from '../body/bodymap.js';
import { MUSCLES, GROUPS, GROUP_ORDER } from '../data/muscles.js';
import { EXERCISES, EX, exercisesForMuscle, exercisesForGroup } from '../data/exercises.js';
import { bindBodyMap, esc, icon, exCard, footer, fmtCount } from '../ui.js';
import { navigate } from '../router.js';
import { bindCardActions } from './shared.js';

const STARTERS = ['bench-press', 'back-squat', 'pull-up', 'rdl', 'ohp', 'hip-thrust', 'lateral-raise', 'cable-crossover-high'];

export function groupHeat(g) {
  return Object.fromEntries(GROUPS[g].muscles.map(([m, wt]) => [m, wt === 1 ? 0.85 : 0.4]));
}

export function renderHome(view) {
  const nMuscles = Object.keys(MUSCLES).length;
  view.innerHTML = `
    <section class="hero">
      <div class="hero-copy glass">
        <span class="eyebrow">Интерактивный атлас</span>
        <h1>Узнай, что <em>на самом деле</em> качает каждое упражнение</h1>
        <p class="lead">Нажмите на мышцу — увидите все упражнения, которые её нагружают, и насколько сильно. Красный — основная нагрузка, светлый — второстепенная.</p>
        <div class="hero-stats">
          <div><b>${EXERCISES.length}</b><span>упражнений</span></div>
          <div><b>${nMuscles}</b><span>мышц и их частей</span></div>
          <div><b>6</b><span>критериев оценки</span></div>
        </div>
        <div class="hero-actions">
          <a class="btn primary" href="#/workouts?new=1">${icon.magic}Собрать тренировку</a>
          <a class="btn" href="#/exercises">${icon.list}Все упражнения</a>
        </div>
        <div class="hero-groups">
          <div class="chips">${GROUP_ORDER.map((g) => `<a class="chip" href="#/group/${g}" data-group="${g}">${GROUPS[g].name}</a>`).join('')}</div>
        </div>
      </div>
      <div class="map-card glass">
        <div class="map-head">
          <span class="map-hint" id="map-hint">Наведите или нажмите на мышцу</span>
        </div>
        <div class="body-pair" id="home-map">
          <figure class="body-fig">${bodySVG({ view: 'front', interactive: true })}<figcaption>Спереди</figcaption></figure>
          <figure class="body-fig">${bodySVG({ view: 'back', interactive: true })}<figcaption>Сзади</figcaption></figure>
        </div>
      </div>
    </section>

    <div class="section-head"><h2>Группы мышц</h2><a class="btn sm ghost" href="#/exercises">Каталог ${icon.right}</a></div>
    <div class="group-grid">
      ${GROUP_ORDER.map((g) => {
        const heat = groupHeat(g);
        const n = exercisesForGroup(g, 60).length;
        return `<a class="group-card panel" href="#/group/${g}" data-group="${g}">
          <div class="body-pair">${bodySVG({ view: 'front', heat })}${bodySVG({ view: 'back', heat })}</div>
          <b>${GROUPS[g].name}</b><span>${fmtCount(n, 'упражнение', 'упражнения', 'упражнений')}</span>
        </a>`;
      }).join('')}
    </div>

    <div class="section-head"><h2>Как это работает</h2></div>
    <div class="feature-grid">
      <div class="feature panel"><div class="ico">${icon.flame}</div><h3>Тепловая карта нагрузки</h3><p>У каждого упражнения — карта всех задействованных мышц: от основной (красный) до стабилизаторов (светлый), с процентами.</p></div>
      <div class="feature panel"><div class="ico">${icon.play}</div><h3>Техника в движении</h3><p>Анимация выполнения, пошаговая инструкция, частые ошибки и советы — чтобы делать правильно и без травм.</p></div>
      <div class="feature panel"><div class="ico">${icon.target}</div><h3>Умная оценка тренировки</h3><p>Соберите тренировку на нужные группы — сайт оценит покрытие всех частей мышц, объём, баланс и порядок и подскажет, что добавить.</p></div>
    </div>

    <div class="section-head"><h2>С чего начать</h2><a class="btn sm ghost" href="#/exercises">Все ${EXERCISES.length} ${icon.right}</a></div>
    <div class="ex-grid" id="starters">${STARTERS.map((id) => exCard(EX[id])).join('')}</div>
    ${footer()}
  `;

  const map = view.querySelector('#home-map');
  const hint = view.querySelector('#map-hint');
  const unbind = bindBodyMap(map, {
    tip: (id) => {
      const n = exercisesForMuscle(id, 60).length;
      return `<b>${esc(MUSCLES[id].name)}</b><span class="muted small">${esc(GROUPS[MUSCLES[id].group].name)} · ${fmtCount(n, 'упражнение', 'упражнения', 'упражнений')}</span>`;
    },
    onHover: (id) => {
      hint.textContent = id ? `${MUSCLES[id].name} — нажмите, чтобы открыть` : 'Наведите или нажмите на мышцу';
    },
    onClick: (id) => navigate(`#/muscle/${id}`),
  });

  // подсветка группы при наведении на чип
  const chips = view.querySelectorAll('.hero-groups [data-group]');
  chips.forEach((c) => {
    c.addEventListener('pointerenter', () => {
      map.querySelectorAll('.m.hl').forEach((m) => m.classList.remove('hl'));
      for (const [m] of GROUPS[c.dataset.group].muscles) map.querySelectorAll(`[data-m="${m}"]`).forEach((el) => el.classList.add('hl'));
    });
    c.addEventListener('pointerleave', () => map.querySelectorAll('.m.hl').forEach((m) => m.classList.remove('hl')));
  });

  const unCards = bindCardActions(view);
  return () => {
    unbind();
    unCards();
  };
}
