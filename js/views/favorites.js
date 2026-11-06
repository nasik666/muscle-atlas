// Избранные упражнения.

import { EX } from '../data/exercises.js';
import { store, defaultReps } from '../store.js';
import { icon, exCard, footer, fmtCount, confirmDialog } from '../ui.js';
import { navigate } from '../router.js';
import { bindCardActions } from './shared.js';
import { inferGroups, sortItems } from '../scoring.js';

export function renderFavorites(view) {
  const draw = () => {
    const ids = store.state.favorites.filter((id) => EX[id]);
    view.innerHTML = `
      <div class="section-head" style="margin-top:4px">
        <div class="grow"><span class="eyebrow">Ваша подборка</span><h1 class="mt-8" style="font-size:clamp(26px,3vw,38px)">Избранное</h1>
        <p class="muted mt-8">${ids.length ? fmtCount(ids.length, 'упражнение', 'упражнения', 'упражнений') : 'Пока пусто'}</p></div>
        ${
          ids.length
            ? `<button class="btn primary" id="to-workout">${icon.magic}Тренировка из избранного</button>
               <button class="btn ghost" id="clear">${icon.trash}Очистить</button>`
            : ''
        }
      </div>
      ${
        ids.length
          ? `<div class="ex-grid">${ids.map((id) => exCard(EX[id])).join('')}</div>`
          : `<div class="empty glass"><div class="ico">${icon.star}</div><h3>Добавляйте упражнения в избранное</h3>
             <p>Нажмите на звёздочку на карточке или странице упражнения — оно появится здесь. Из избранного можно сразу собрать тренировку.</p>
             <a class="btn primary" href="#/exercises">${icon.list}Открыть каталог</a></div>`
      }
      ${footer()}`;
  };
  draw();
  const unsub = store.subscribe(() => {
    // карточка исчезает, когда снимаем звёздочку
    const ids = store.state.favorites;
    view.querySelectorAll('.ex-card').forEach((c) => {
      if (!ids.includes(c.dataset.ex)) c.remove();
    });
    if (!ids.length) draw();
  });
  view.addEventListener('click', async (e) => {
    if (e.target.closest('#to-workout')) {
      const items = store.state.favorites.slice(0, 9).map((id) => ({ ex: id, sets: EX[id].type === 'compound' ? 4 : 3, reps: defaultReps(EX[id]) }));
      const w = store.createWorkout({ name: 'Из избранного', groups: inferGroups(items), items: sortItems(items) });
      navigate(`#/workout/${w.id}`);
    }
    if (e.target.closest('#clear') && (await confirmDialog('Убрать все упражнения из избранного?', 'Очистить'))) {
      for (const id of [...store.state.favorites]) store.toggleFav(id);
      draw();
    }
  });
  const unCards = bindCardActions(view);
  return () => {
    unsub();
    unCards();
  };
}

