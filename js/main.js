// Точка входа: маршруты, глобальный поиск, счётчики.

import { route, startRouter, navigate, currentRoute } from './router.js';
import { ensureSprite } from './body/bodymap.js';
import { store } from './store.js';
import { renderHome } from './views/home.js';
import { renderMuscle, renderGroup } from './views/muscle.js';
import { renderLibrary } from './views/library.js';
import { renderExercise } from './views/exercise.js';
import { renderFavorites } from './views/favorites.js';
import { renderWorkouts } from './views/workouts.js';
import { renderBuilder } from './views/builder.js';
import { renderShare } from './views/share.js';

const TITLE = 'MuscleAtlas — атлас упражнений и мышц';
const titled = (fn, title) => (view, p, q) => {
  document.title = title ? `${title} — MuscleAtlas` : TITLE;
  return fn(view, p, q);
};

route('/', titled(renderHome), 'home');
route('/muscle/:id', titled(renderMuscle, 'Мышца'), 'home');
route('/group/:id', titled(renderGroup, 'Группа мышц'), 'home');
route('/exercises', titled(renderLibrary, 'Упражнения'), 'exercises');
route('/exercise/:id', titled(renderExercise), 'exercises');
route('/favorites', titled(renderFavorites, 'Избранное'), 'favorites');
route('/workouts', titled(renderWorkouts, 'Мои тренировки'), 'workouts');
route('/workout/:id', titled(renderBuilder, 'Конструктор'), 'workouts');
route('/share/:data', titled(renderShare, 'Тренировка'), 'workouts');

ensureSprite();

// счётчик избранного
const syncBadges = () => {
  const n = store.state.favorites.length;
  document.querySelectorAll('[data-fav-count]').forEach((b) => (b.textContent = n ? String(n) : ''));
};
store.subscribe(syncBadges);
syncBadges();

// глобальный поиск в шапке
const gs = document.getElementById('global-search');
let gsT;
gs.addEventListener('input', () => {
  clearTimeout(gsT);
  gsT = setTimeout(() => {
    const q = gs.value.trim();
    const target = `#/exercises${q ? `?q=${encodeURIComponent(q)}` : ''}`;
    if (currentRoute().path === '/exercises') {
      const input = document.getElementById('q');
      if (input) {
        input.value = q;
        input.dispatchEvent(new Event('input'));
        return;
      }
    }
    navigate(target);
    setTimeout(() => gs.focus(), 0);
  }, 250);
});
gs.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    gs.value = '';
    gs.blur();
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key === '/' && !/input|textarea|select/i.test(document.activeElement?.tagName || '')) {
    e.preventDefault();
    gs.focus();
  }
});

startRouter();
