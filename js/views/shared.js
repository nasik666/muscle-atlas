// Общие действия: избранное, «добавить в тренировку», ссылки для шаринга.

import { EX } from '../data/exercises.js';
import { GROUPS } from '../data/muscles.js';
import { store, cleanWorkout } from '../store.js';
import { icon, toast, popMenu, esc } from '../ui.js';
import { navigate } from '../router.js';

/** Делегированные обработчики кнопок на карточках упражнений. */
export function bindCardActions(root) {
  const onClick = (e) => {
    const fav = e.target.closest('[data-fav]');
    if (fav) {
      e.preventDefault();
      e.stopPropagation();
      const on = store.toggleFav(fav.dataset.fav);
      fav.classList.toggle('on', on);
      fav.setAttribute('aria-pressed', String(on));
      fav.title = on ? 'Убрать из избранного' : 'В избранное';
      fav.classList.remove('pop');
      void fav.offsetWidth;
      fav.classList.add('pop');
      toast(on ? 'Добавлено в избранное' : 'Убрано из избранного', on ? icon.star : icon.check);
      return;
    }
    const add = e.target.closest('[data-add]');
    if (add) {
      e.preventDefault();
      e.stopPropagation();
      addToWorkoutMenu(add, add.dataset.add);
    }
  };
  root.addEventListener('click', onClick);
  return () => root.removeEventListener('click', onClick);
}

export function addToWorkoutMenu(anchor, exId) {
  const e = EX[exId];
  const list = store.workouts().slice(0, 6);
  const items = list.map((w) => ({
    label: w.name,
    icon: icon.list,
    action: () => {
      store.addToWorkout(w.id, exId);
      toast(`«${e.name}» → ${w.name}`);
    },
  }));
  if (items.length) items.push('-');
  items.push({
    label: 'Новая тренировка',
    icon: icon.plus,
    action: () => {
      const w = store.createWorkout({ groups: [e.primaryGroup] });
      store.addToWorkout(w.id, exId);
      navigate(`#/workout/${w.id}`);
    },
  });
  popMenu(anchor, items);
}

// ------------------------------------------------------------ шаринг
const toB64 = (s) => btoa(String.fromCharCode(...new TextEncoder().encode(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64 = (s) => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)));

export function encodeWorkout(w) {
  return toB64(JSON.stringify({ n: w.name, g: w.groups, l: w.level, o: w.goal, i: w.items.map((it) => [it.ex, it.sets, it.reps]) }));
}

export function decodeWorkout(s) {
  try {
    const d = JSON.parse(fromB64(s));
    return cleanWorkout({
      name: d.n,
      groups: d.g,
      level: d.l,
      goal: d.o,
      items: (d.i || []).map(([ex, sets, reps]) => ({ ex, sets, reps })),
    });
  } catch {
    return null;
  }
}

export function shareLink(w) {
  const base = location.href.split('#')[0];
  return `${base}#/share/${encodeWorkout(w)}`;
}

export async function shareWorkout(w) {
  const url = shareLink(w);
  const text = `${w.name}: ${w.items.map((it) => EX[it.ex].name).join(', ')}`;
  if (navigator.share && matchMedia('(pointer: coarse)').matches) {
    try {
      await navigator.share({ title: w.name, text, url });
      return;
    } catch {
      /* отмена — копируем ссылку */
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    toast('Ссылка на тренировку скопирована');
  } catch {
    prompt('Скопируйте ссылку:', url);
  }
}

export const groupNames = (groups) => groups.map((g) => GROUPS[g]?.name).filter(Boolean).join(' · ');

export const escName = (w) => esc(w.name);
