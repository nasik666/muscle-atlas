// Просмотр тренировки по ссылке (#/share/<данные>) и сохранение себе.

import { bodySVG } from '../body/bodymap.js';
import { EX } from '../data/exercises.js';
import { store } from '../store.js';
import { esc, icon, footer, fmtCount, ringSVG, scoreColor, thumb, heatLegend } from '../ui.js';
import { navigate } from '../router.js';
import { evaluate, workoutHeat, estMinutes } from '../scoring.js';
import { decodeWorkout, groupNames } from './shared.js';

export function renderShare(view, { data }) {
  const w = decodeWorkout(data);
  if (!w || !w.items.length) {
    view.innerHTML = `<div class="empty glass"><div class="ico">${icon.alert}</div><h3>Ссылка повреждена</h3><p>Не получилось прочитать тренировку из ссылки.</p><a class="btn" href="#/workouts">Мои тренировки</a></div>`;
    return;
  }
  const r = evaluate(w);
  const heat = workoutHeat(w.items);
  const col = scoreColor(r.score);
  view.innerHTML = `
    <div class="section-head" style="margin-top:4px"><div class="grow"><span class="eyebrow">Тренировка по ссылке</span>
      <h1 class="mt-8" style="font-size:clamp(26px,3vw,38px)">${esc(w.name)}</h1>
      <p class="muted mt-8">${esc(groupNames(w.groups) || 'Цель не указана')} · ${fmtCount(w.items.length, 'упражнение', 'упражнения', 'упражнений')} · ~${estMinutes(w.items)} мин</p></div>
      <button class="btn primary" id="save">${icon.plus}Сохранить себе</button>
    </div>
    <div class="builder">
      <div class="item-list">${w.items
        .map((it, i) => {
          const e = EX[it.ex];
          return `<div class="item" style="grid-template-columns:auto 64px minmax(0,1fr) auto"><span class="num">${i + 1}</span>${thumb(e)}
            <div><div class="nm"><a href="#/exercise/${e.id}">${esc(e.name)}</a></div><div class="sub">${e.type === 'compound' ? 'Базовое' : 'Изолирующее'}</div></div>
            <b>${it.sets} × ${it.reps}</b></div>`;
        })
        .join('')}</div>
      <aside class="builder-side">
        <div class="score-card glass"><div class="score-top">
          <div class="ring">${ringSVG(r.score, 128, 11, col)}<div class="ring-val"><b style="color:${col}">${r.score}</b><span>из 100</span></div></div>
          <div><div class="grade" style="color:${col}">${r.grade?.label || ''}</div><p class="score-sub">${r.grade?.text || ''}</p></div>
        </div></div>
        <div class="heat-card glass"><div class="body-pair" style="max-width:340px;margin:0 auto">${bodySVG({ view: 'front', heat })}${bodySVG({ view: 'back', heat })}</div><div class="mt-12">${heatLegend('мало', 'много')}</div></div>
      </aside>
    </div>
    ${footer()}`;
  view.querySelector('#save').addEventListener('click', () => {
    const saved = store.createWorkout(w);
    navigate(`#/workout/${saved.id}`);
  });
}
