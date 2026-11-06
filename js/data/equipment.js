// Оборудование. Упражнение доступно, если есть всё, что указано в его списке eq.

export const EQUIPMENT = {
  bodyweight: { name: 'Свой вес', short: 'Свой вес' },
  barbell: { name: 'Штанга', short: 'Штанга' },
  dumbbell: { name: 'Гантели', short: 'Гантели' },
  kettlebell: { name: 'Гиря', short: 'Гиря' },
  bench: { name: 'Скамья', short: 'Скамья' },
  bar: { name: 'Турник / брусья', short: 'Турник' },
  cable: { name: 'Блочный тренажёр', short: 'Блок' },
  machine: { name: 'Тренажёры', short: 'Тренажёр' },
  band: { name: 'Резинка', short: 'Резинка' },
};

export const EQUIPMENT_ORDER = ['bodyweight', 'dumbbell', 'barbell', 'kettlebell', 'bench', 'bar', 'cable', 'machine', 'band'];

export const EQUIPMENT_PRESETS = [
  { id: 'gym', name: 'Тренажёрный зал', eq: EQUIPMENT_ORDER },
  { id: 'home', name: 'Дом: гантели и турник', eq: ['bodyweight', 'dumbbell', 'bench', 'bar', 'band'] },
  { id: 'bw', name: 'Только свой вес', eq: ['bodyweight', 'bar'] },
];

export const LEVEL_NAMES = { 1: 'Новичок', 2: 'Средний', 3: 'Продвинутый' };
