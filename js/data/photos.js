// Фотографии техники: два кадра на упражнение (assets/ex/<id>-a.webp и <id>-b.webp).
// Значение — соотношение сторон кадра (ширина / высота).
// Источник: Free Exercise DB (https://github.com/yuhonas/free-exercise-db), общественное достояние (Unlicense).

export const PHOTOS = {
  'bench-press': 1.5, 'incline-bench-press': 1.5, 'decline-bench-press': 1.5, 'db-bench-press': 1.5, 'incline-db-press': 1.5,
  'db-fly': 1.5, 'incline-db-fly': 1.5, 'cable-crossover-high': 1.5, 'cable-crossover-low': 1.5, 'pec-deck': 1.5,
  'chest-dips': 1.5, 'push-up': 1.5, 'decline-push-up': 1.5, 'incline-push-up': 1.5, 'machine-chest-press': 1.5,
  'db-pullover': 1.5, 'pull-up': 1.5, 'chin-up': 1.5, 'lat-pulldown': 1.5, 'close-grip-pulldown': 1.5,
  'bent-over-row': 1.5, 'db-row': 1.5, 'seated-cable-row': 1.5, 't-bar-row': 1.5, 'chest-supported-row': 1.5,
  'inverted-row': 1.5, 'straight-arm-pulldown': 1.5, 'deadlift': 1.5, 'good-morning': 1.5, 'back-extension': 1.5,
  'superman': 1.5, 'shrugs': 1.5, 'ohp': 1.5, 'seated-db-press': 1.5, 'arnold-press': 1.5,
  'machine-shoulder-press': 1.5, 'lateral-raise': 1.5, 'cable-lateral-raise': 1.5, 'front-raise': 1.5, 'rear-delt-fly': 1.5,
  'reverse-pec-deck': 1.5, 'face-pull': 1.5, 'upright-row': 1.5, 'external-rotation': 1.5, 'barbell-curl': 1.5,
  'db-curl': 1.5, 'hammer-curl': 1.5, 'preacher-curl': 1.5, 'incline-db-curl': 1.5, 'concentration-curl': 1.5,
  'cable-curl': 1.5, 'reverse-curl': 1.5, 'close-grip-bench': 1.5, 'skull-crusher': 1.5, 'pushdown': 1.5,
  'overhead-extension': 1.5, 'bench-dips': 1.5, 'triceps-dips': 1.5, 'kickback': 1.5, 'diamond-push-up': 1.5,
  'wrist-curl': 1.5, 'reverse-wrist-curl': 1.5, 'farmers-walk': 1.5, 'crunch': 1.5, 'reverse-crunch': 1.5,
  'hanging-leg-raise': 1.5, 'leg-raise': 1.5, 'plank': 1.5, 'side-plank': 1.5, 'russian-twist': 1.5,
  'woodchop': 0.67, 'ab-wheel': 1.5, 'cable-crunch': 1.5, 'bicycle-crunch': 1.5, 'dead-bug': 1.78,
  'mountain-climber': 1.5, 'back-squat': 1.5, 'front-squat': 1.5, 'goblet-squat': 1.49, 'bodyweight-squat': 1.5,
  'sumo-squat': 1.5, 'leg-press': 1.5, 'hack-squat': 1.0, 'bulgarian-split-squat': 0.67, 'lunge': 1.5,
  'step-up': 1.5, 'leg-extension': 1.5, 'rdl': 1.5, 'lying-leg-curl': 1.5, 'seated-leg-curl': 1.5,
  'nordic-curl': 1.5, 'adductor-machine': 1.5, 'sumo-deadlift': 1.5, 'hip-thrust': 1.5, 'glute-bridge': 1.5,
  'cable-kickback': 1.5, 'donkey-kick': 1.5, 'hip-abduction': 1.5, 'band-walk': 1.5, 'kettlebell-swing': 1.49,
  'standing-calf-raise': 1.5, 'seated-calf-raise': 1.5, 'leg-press-calf-raise': 1.5, 'decline-db-press': 1.5, 'wide-push-up': 0.67,
  'db-floor-press': 1.5, 'neutral-grip-pull-up': 1.5, 'db-bent-over-row': 1.5, 'rack-pull': 1.5, 'barbell-shrug': 1.5,
  'underhand-pulldown': 1.5, 'scapular-pull-up': 1.5, 'renegade-row': 1.49, 'seated-barbell-press': 1.5, 'push-press': 1.5,
  'cable-rear-delt-fly': 1.5, 'front-plate-raise': 1.5, 'band-pull-apart': 1.5, 'handstand-push-up': 1.5, 'ez-bar-curl': 1.5,
  'spider-curl': 1.5, 'zottman-curl': 1.5, 'rope-hammer-curl': 1.5, 'rope-pushdown': 1.5, 'cable-overhead-extension': 1.5,
  'lying-db-extension': 1.5, 'sit-up': 1.5, 'decline-crunch': 1.5, 'v-up': 1.5, 'flutter-kicks': 1.5,
  'captain-chair-knee-raise': 1.5, 'pallof-press': 1.78, 'db-side-bend': 1.5, 'walking-lunge': 1.5, 'reverse-lunge': 1.5,
  'jump-squat': 1.5, 'stiff-leg-db-deadlift': 1.5, 'single-leg-glute-bridge': 1.5, 'glute-ham-raise': 1.5, 'db-calf-raise': 1.5,
  'single-leg-deadlift': 1.49, 'box-jump': 1.5, 'pull-through': 1.5, 'kettlebell-thruster': 1.49, 'trap-bar-deadlift': 0.67,
};

export const hasPhoto = (id) => id in PHOTOS;
export const photoSrc = (id, frame = 'a') => `assets/ex/${id}-${frame}.webp`;
