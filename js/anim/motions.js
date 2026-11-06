// Шаблоны движений. Каждый возвращает { view, keys, seq?, equip?, phases?, floor? }.
// keys — ключевые позы, seq — [[ключ, длительность, пауза], ...] (цикл).

import {
  solveSide, add, sub, mul, dir, len, plate, dumbbell, kettlebell, rect, line, circle, padSeg, bench, cableTo,
  tower, handle, EQ, L,
} from './engine.js';

const STAND = { root: ['ankle', 0, -6.5], t: -90, l: [90, 90, 0], a: [92, 88] };
const st = (o = {}) => ({ ...STAND, ...o });
const FSTAND = { root: ['anR', 9.5, -7], t: -90, lR: [4, 0, 2, 0], aR: [8, 0, 5, 0] };
const fst = (o = {}) => ({ ...FSTAND, ...o });

/** Подбор параметра бисекцией: f монотонна, ищем f(x) = target. */
function bisect(f, lo, hi, target, n = 40) {
  const flo = f(lo) - target;
  for (let i = 0; i < n; i++) {
    const mid = (lo + hi) / 2;
    const fm = f(mid) - target;
    if (Math.sign(fm) === Math.sign(flo)) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

const LOWER = ['Опускание · вдох', 'Подъём · выдох'];
const PULL = ['Тяга · выдох', 'Возврат · вдох'];
const PRESS = ['Жим · выдох', 'Возврат · вдох'];
const SQUEEZE = ['Сокращение · выдох', 'Возврат · вдох'];

const dbPair = (J) => ({ mid: dumbbell(J.gripF), front: dumbbell(J.grip) });
const bbPlate = (J, r = 13) => ({ back: plate(J.grip, r), front: circle(J.grip, 2.2, '#c9d2de', '#8592a6', 0.8) });

// ======================================================================= ГРУДЬ
function pressLying(o = {}) {
  const inc = o.incline || 0;
  const t = 180 + inc;
  const P = inc < 0 ? [26, -60] : [22, -48];
  const legs = inc < 0 ? { lik: [52, -38, 'up'] } : { lik: [P[0] + 30, -6.5, 'up'] };
  const base = { P, t, ...legs };
  const J0 = solveSide({ ...base, a: [-90, -90] });
  const S = J0.shoulder;
  const along = inc > 0 ? 40 : inc < 0 ? 31 : 35;
  const chest = add(add(J0.pelvis, mul(J0.u, along)), mul(J0.v, 14));
  const db = o.tool === 'dumbbell';
  const top = [S[0] + (inc > 0 ? 6 : 0), S[1] - 50];
  const bottom = db ? [S[0] + 4, S[1] - 9] : chest;
  const back = sub(J0.pelvis, mul(J0.v, 13));
  return {
    view: 'side',
    keys: [
      { ...base, aik: [...top, 'down'] },
      { ...base, aik: [...bottom, 'down'] },
    ],
    seq: [[1, 1.3, 0.25], [0, 1.0, 0.5]],
    phases: ['Опускание · вдох', 'Жим · выдох'],
    equip: (J) => {
      let b = '';
      if (inc === 0) b += bench(-62, 44, 41);
      else {
        b += rect(-6, -41, 50, 6.5) + line([10, -36], [10, 0], EQ.metal, 3.4) + line([36, -36], [36, 0], EQ.metal, 3.4);
        const a1 = add(back, mul(J0.u, -6));
        const a2 = add(back, mul(J0.u, 66));
        b += line(add(a2, [0, 4]), [a2[0], 0], EQ.metal, 3.2) + padSeg(a1, a2, 7) + (inc < 0 ? circle([54, -40], 5.5, EQ.pad, EQ.padLine) : '');
      }
      if (!db) b += line([top[0] - 13, 0], [top[0] - 13, top[1] + 8], EQ.metal, 3) + line([top[0] - 13, top[1] + 8], [top[0] - 6, top[1] + 8], EQ.metalLine, 3);
      if (db) return { back: b, ...dbPair(J) };
      return { back: b + plate(J.grip), front: circle(J.grip, 2.2, '#c9d2de', '#8592a6', 0.8) };
    },
  };
}

function machinePress() {
  const base = { P: [0, -50], t: -96, l: [-2, 92, 0] };
  const J0 = solveSide({ ...base, a: [90, 90] });
  const S = J0.shoulder;
  return {
    view: 'side',
    keys: [
      { ...base, aik: [S[0] + 14, S[1] + 6, 'down'] },
      { ...base, aik: [S[0] + 51, S[1] + 4, 'down'] },
    ],
    phases: PRESS,
    equip: (J) => ({
      back:
        rect(-14, -46, 40, 7) + line([4, -40], [4, 0], EQ.metal, 3.4) + line([-6, 0], [16, 0], EQ.metalLine, 3) +
        padSeg(add(J0.pelvis, add(mul(J0.v, -12), mul(J0.u, 4))), add(J0.pelvis, add(mul(J0.v, -12), mul(J0.u, 62))), 8) +
        rect(-30, -190, 9, 190, '#1d2430', '#3a475a', 2) + line([-26, -178], [S[0] + 30, -178], '#3a475a', 4),
      front: line(J.grip, [S[0] + 30, -178], EQ.metalLine, 3) + handle(J.grip),
    }),
  };
}

function pushup(o = {}) {
  const footY = o.feet === 'high' ? -42 : 0;
  const handY = o.hands === 'high' ? -43 : 0;
  const toe = [-80, footY];
  const pose = (t) => ({ root: ['toe', ...toe], t, l: [t + 180, t + 180, 52], a: [90, 90, 0] });
  const sh = (t) => solveSide(pose(t)).shoulder[1];
  const tTop = bisect(sh, -60, 40, handY - 3 - 50);
  const tBot = bisect(sh, -60, 40, handY - 3 - 13);
  const S = solveSide(pose(tTop)).shoulder;
  const W = [S[0] + 1, handY - 3];
  return {
    view: 'side',
    keys: [
      { ...pose(tTop), aik: [...W, 'up'], a: [0, 0, 0] },
      { ...pose(tBot), aik: [...W, 'up'], a: [0, 0, 0] },
    ],
    seq: [[1, 1.1, 0.2], [0, 0.9, 0.45]],
    phases: LOWER,
    equip: () => {
      let b = '';
      if (o.feet === 'high') b += bench(-104, -46, 42);
      if (o.hands === 'high') b += bench(W[0] - 30, W[0] + 30, 43);
      return { back: b };
    },
  };
}

function pikePushup() {
  const toe = [-34, 0];
  const pose = (t, lg) => ({ root: ['toe', ...toe], t, l: [lg, lg, 35], a: [0, 0, 0] });
  const S = solveSide(pose(58, 116)).shoulder;
  const W = [S[0] + 14, -3];
  return {
    view: 'side',
    keys: [
      { ...pose(58, 116), aik: [...W, 'up'] },
      { ...pose(74, 112), aik: [...W, 'up'], h: -14 },
    ],
    seq: [[1, 1.1, 0.2], [0, 0.9, 0.45]],
    phases: LOWER,
  };
}

function scapPushup() {
  const W = [44, -3];
  const k = (t, so) => ({ root: ['wrist', ...W], t, sOff: [0, so], l: [t + 180, t + 180, 52], a: [94, 93, 0] });
  return {
    view: 'side',
    keys: [k(-15, 3.5), k(-12.5, -2.5)],
    seq: [[1, 0.8, 0.25], [0, 0.8, 0.35]],
    phases: ['Сведение лопаток', 'Выталкивание · выдох'],
  };
}

function dips(o = {}) {
  const chest = o.lean !== 'triceps';
  const k0 = { t: chest ? -68 : -87, a: [90, 90, 90], l: [100, 140, 115], l2: [104, 150, 125], h: chest ? 8 : 0 };
  const k1 = { t: chest ? -56 : -80, a: [222, 99, 90], l: [102, 145, 118], l2: [106, 152, 128], h: chest ? 10 : 2 };
  const low = Math.max(...[k0, k1].map((p) => Math.max(solveSide({ ...p, root: ['wrist', 0, 0] }).toeF[1], solveSide({ ...p, root: ['wrist', 0, 0] }).toe[1])));
  const W = [0, -(low + 14)];
  return {
    view: 'side',
    keys: [{ ...k0, root: ['wrist', ...W] }, { ...k1, root: ['wrist', ...W] }],
    seq: [[1, 1.2, 0.2], [0, 1.0, 0.45]],
    phases: LOWER,
    equip: () => ({
      back: line([W[0] - 40, W[1] + 3], [W[0] - 40, 0], EQ.metal, 3.4) + line([W[0] + 40, W[1] + 3], [W[0] + 40, 0], EQ.metal, 3.4),
      mid: line([W[0] - 46, W[1] + 3], [W[0] + 46, W[1] + 3], EQ.metalLine, 4.4),
    }),
  };
}

function benchDips() {
  const W = [-26, -44];
  const base = { root: ['wrist', ...W], lik: [52, -6.5, 'up'] };
  return {
    view: 'side',
    keys: [
      { ...base, t: -92, a: [90, 90, 0] },
      { ...base, t: -96, a: [205, 86, 0] },
    ],
    seq: [[1, 1.1, 0.2], [0, 0.9, 0.45]],
    phases: LOWER,
    equip: () => ({ back: bench(-80, -18, 44) }),
  };
}

function pullover() {
  const base = { P: [22, -48], t: 180, lik: [52, -6.5, 'up'] };
  return {
    view: 'side',
    keys: [
      { ...base, a: [265, 258, 258] },
      { ...base, a: [186, 176, 176] },
    ],
    seq: [[1, 1.4, 0.25], [0, 1.1, 0.4]],
    phases: ['За голову · вдох', 'Над грудью · выдох'],
    equip: (J) => ({ back: bench(-62, 44, 41), front: dumbbell(J.hand, 7) + line(J.hand, add(J.hand, mul(sub(J.hand, J.wrist), 0.01)), EQ.metalLine, 1) }),
  };
}

function flyLying() {
  const base = { endon: true, P: [0, -10], t: -90 };
  return {
    view: 'front',
    keys: [
      { ...base, aR: [176, 0, 179, 0] },
      { ...base, aR: [102, 0, 116, 0] },
    ],
    seq: [[1, 1.4, 0.25], [0, 1.1, 0.45]],
    phases: ['Разведение · вдох', 'Сведение · выдох'],
    equip: (J) => ({
      back: rect(-15, -44, 30, 7) + rect(-6, -37, 12, 37, '#1d2430', '#3a475a', 2) + line([-14, 0], [14, 0], EQ.metalLine, 3),
      front: dumbbell(J.hdR, 6) + dumbbell(J.hdL, 6),
    }),
  };
}

function crossover(o = {}) {
  const d = o.dir || 'mid';
  const A = {
    high: [[135, 10, 140, 10], [45, 100, 35, 110]],
    low: [[40, 10, 40, 10], [100, 100, 105, 105]],
    mid: [[90, 15, 95, 20], [90, 105, 92, 115]],
  }[d];
  const py = { high: -192, low: -12, mid: -132 }[d];
  return {
    view: 'front',
    keys: [fst({ aR: A[0] }), fst({ aR: A[1] })],
    seq: [[1, 1.0, 0.35], [0, 1.3, 0.4]],
    phases: SQUEEZE,
    equip: (J) => ({
      back: tower(-78, -210) + tower(78, -210),
      preArms: cableTo(J.hdR, [72, py]) + cableTo(J.hdL, [-72, py]),
      front: handle(J.hdR) + handle(J.hdL),
    }),
  };
}

function pecDeck(o = {}) {
  const seat = { P: [0, -50], t: -90, lR: [88, 84, 3, 0], aR: [92, 8, 178, 8] };
  const keys = o.reverse
    ? [{ ...seat, aR: [90, 100, 90, 104] }, { ...seat, aR: [90, 6, 88, 6] }]
    : [{ ...seat, aR: [92, 6, 178, 6] }, { ...seat, aR: [92, 106, 178, 106] }];
  return {
    view: 'front',
    keys,
    seq: [[1, 1.0, 0.35], [0, 1.3, 0.4]],
    phases: o.reverse ? ['Разведение · выдох', 'Возврат · вдох'] : SQUEEZE,
    equip: (J) => ({
      back: rect(-24, -205, 48, 205, '#1a212c', '#323e50', 4) + rect(-14, -122, 28, 74, EQ.pad, EQ.padLine, 4) + rect(-22, -50, 44, 8),
      preArms: o.reverse ? rect(-11, -128, 22, 56, EQ.pad, EQ.padLine, 5) : '',
      front: o.reverse
        ? line(J.hdR, [22, -205], EQ.metalLine, 2.6) + line(J.hdL, [-22, -205], EQ.metalLine, 2.6) + handle(J.hdR) + handle(J.hdL)
        : padSeg(J.elR, J.wrR, 9) + padSeg(J.elL, J.wrL, 9),
    }),
  };
}

// ======================================================================= СПИНА
function pullup(o = {}) {
  const k0 = { t: -91, a: [-88, -90, -90], l: [94, 104, 60], l2: [98, 112, 66] };
  const k1 = { t: -101, a: o.chin ? [52, -104, -100] : [44, -100, -96], l: [100, 122, 72], l2: [104, 128, 76], h: -12 };
  const lowest = Math.max(solveSide({ ...k0, root: ['wrist', 0, 0] }).toe[1], solveSide({ ...k0, root: ['wrist', 0, 0] }).toeF[1]);
  const W = [0, -(lowest + 14)];
  return {
    view: 'side',
    keys: [{ ...k0, root: ['wrist', ...W] }, { ...k1, root: ['wrist', ...W] }],
    seq: [[1, 1.0, 0.35], [0, 1.4, 0.4]],
    phases: ['Подъём · выдох', 'Опускание · вдох'],
    equip: () => ({ back: line([W[0] - 40, W[1] - 26], [W[0] - 4, W[1]], EQ.metal, 3.2) + line([W[0] - 40, W[1] - 26], [W[0] - 40, 0], EQ.metal, 3.6), mid: circle(W, 3.4, '#c9d2de', '#8592a6', 1) }),
  };
}

function pulldown(o = {}) {
  const base = { P: [0, -47.5], t: -100, l: [-2, 90, 0] };
  const J0 = solveSide({ ...base, a: [90, 90] });
  const S = J0.shoulder;
  const top = [S[0] + 7, S[1] - 51];
  const bot = add(add(J0.pelvis, mul(J0.u, o.close ? 37 : 42)), mul(J0.v, 15));
  const pul = [S[0] + 8, -238];
  return {
    view: 'side',
    keys: [{ ...base, aik: [...top, 'down'] }, { ...base, aik: [...bot, 'down'] }],
    phases: PULL,
    equip: (J) => ({
      back: rect(-18, -44, 36, 7) + line([0, -38], [0, 0], EQ.metal, 3.4) + line([-12, 0], [12, 0], EQ.metalLine, 3) + circle(add(J0.knee, [0, -12]), 5.5, EQ.pad, EQ.padLine) + line(add(J0.knee, [-6, -8]), [-26, -60], EQ.metal, 3) + tower(-30, -250),
      mid: cableTo(J.grip, pul),
      front: circle(J.grip, 3.2, '#c9d2de', '#8592a6', 1),
    }),
  };
}

function straightArmPulldown() {
  const base = st({ t: -76, l: [96, 84, 0] });
  const pul = [70, -205];
  return {
    view: 'side',
    keys: [{ ...base, a: [-36, -40] }, { ...base, a: [80, 82] }],
    phases: PULL,
    equip: (J) => ({ back: tower(80, -215), mid: cableTo(J.grip, pul), front: handle(J.grip) }),
  };
}

function bentRow(o = {}) {
  const base = st({ t: -32, l: [72, 98, 0] });
  const J0 = solveSide({ ...base });
  const belly = add(add(J0.pelvis, mul(J0.u, 13)), mul(J0.v, 14));
  return {
    view: 'side',
    keys: [{ ...base, a: [90, 90] }, { ...base, aik: [...belly, 'up'] }],
    phases: PULL,
    equip: (J) => {
      const r = bbPlate(J);
      if (o.tool === 'tbar') r.back = line(J.grip, [-72, -2], EQ.metalLine, 3.2) + circle([-72, -2], 3) + plate(add(J.grip, mul(sub(J.grip, [-72, -2]), 0.12)), 13);
      return r;
    },
  };
}

function dbRow() {
  const base = { P: [0, -92], t: -6, l2: [90, 180, 180], a2: [92, 92, 10], lik: [-10, -6.5, 'fwd'] };
  return {
    view: 'side',
    keys: [{ ...base, a: [90, 90] }, { ...base, aik: [16, -79, 'up'] }],
    phases: PULL,
    equip: (J) => ({ back: bench(-24, 62, 42), front: dumbbell(J.grip) }),
  };
}

function cableRow() {
  const base = { P: [0, -22], l: [-4, 4, -70] };
  const J0 = solveSide({ ...base, t: -72, a: [0, 0] });
  const S0 = J0.shoulder;
  const reach = [S0[0] + 46, S0[1] + 8];
  return {
    view: 'side',
    keys: [
      { ...base, t: -72, aik: [...reach, 'down'] },
      { ...base, t: -96, aik: [16, -46, 'back'] },
    ],
    phases: PULL,
    equip: (J) => ({
      back: rect(-26, -16, 50, 7) + line([-14, -10], [-14, 0], EQ.metal, 3) + line([10, -10], [10, 0], EQ.metal, 3) + rect(J0.ankle[0] + 16, -44, 8, 44, '#1d2430', '#3a475a', 2),
      mid: cableTo(J.grip, [J0.ankle[0] + 20, -24]),
      front: handle(J.grip),
    }),
  };
}

function chestSupportedRow(o = {}) {
  const base = { P: [0, -72], t: -40, lik: [-28, -6.5, 'fwd'] };
  const J0 = solveSide({ ...base, a: [90, 90] });
  const ribs = add(add(J0.pelvis, mul(J0.u, 24)), mul(J0.v, 3));
  const p1 = add(J0.pelvis, add(mul(J0.v, 12), mul(J0.u, -6)));
  const p2 = add(J0.pelvis, add(mul(J0.v, 12), mul(J0.u, 52)));
  const keys = o.y ? [{ ...base, a: [90, 90] }, { ...base, a: [-58, -58] }] : [{ ...base, a: [90, 90] }, { ...base, aik: [...ribs, 'up'] }];
  return {
    view: 'side',
    keys,
    phases: o.y ? ['Подъём · выдох', 'Опускание · вдох'] : PULL,
    equip: (J) => ({
      back: padSeg(p1, p2, 7) + line(add(p1, [6, 4]), [p1[0] + 10, 0], EQ.metal, 3.4) + line([p1[0] - 4, 0], [p2[0] + 4, 0], EQ.metalLine, 3) + line(add(p2, [0, 4]), [p2[0], 0], EQ.metal, 3.2),
      ...dbPair(J),
    }),
  };
}

function invertedRow() {
  const heel = [74, 0];
  const pose = (b) => ({ root: ['heel', ...heel], t: 180 + b, l: [b, b, b - 92], a: [-90, -90] });
  const Jt = solveSide(pose(36));
  const bar = add(add(Jt.pelvis, mul(Jt.u, 38)), mul(Jt.v, 16));
  const dist = (b) => len(sub(solveSide(pose(b)).shoulder, bar));
  const bBot = bisect(dist, 36, 5, 50);
  return {
    view: 'side',
    keys: [{ ...pose(bBot), aik: [...bar, 'down'] }, { ...pose(36), aik: [...bar, 'down'] }],
    phases: ['Подъём · выдох', 'Опускание · вдох'],
    equip: () => ({ back: line([bar[0], bar[1]], [bar[0], 0], EQ.metal, 3.2) + line([bar[0] - 8, 0], [bar[0] + 8, 0], EQ.metalLine, 3), mid: circle(bar, 3.4, '#c9d2de', '#8592a6', 1) }),
  };
}

function deadlift(o = {}) {
  const r = 19;
  const t0 = o.sumo ? -40 : -29;
  const shin = o.sumo ? 98 : 101;
  const pose = (th) => st({ t: t0, l: [th, shin, 0], a: [90, 90] });
  const th = bisect((x) => solveSide(pose(x)).grip[1], -20, 60, -r);
  return {
    view: 'side',
    keys: [pose(th), st({ a: [90, 90] })],
    seq: [[1, 1.0, 0.35], [0, 1.4, 0.5]],
    phases: ['Подъём · выдох', 'Опускание · вдох'],
    equip: (J) => bbPlate(J, r),
  };
}

function rdl() {
  return {
    view: 'side',
    keys: [st({ l: [93, 87, 0], a: [90, 90] }), st({ t: -14, l: [76, 96, 0], a: [90, 90] })],
    seq: [[1, 1.4, 0.25], [0, 1.0, 0.45]],
    phases: ['Наклон · вдох', 'Подъём · выдох'],
    equip: (J) => bbPlate(J),
  };
}

function goodMorning() {
  const keys = [st({ l: [92, 88, 0] }), st({ t: -10, l: [80, 95, 0] })].map((p) => {
    const J = solveSide(p);
    const bar = add(add(J.neck, mul(J.v, -8)), mul(J.u, -3));
    return { ...p, aik: [...bar, 'down'] };
  });
  return {
    view: 'side',
    keys,
    seq: [[1, 1.4, 0.25], [0, 1.0, 0.45]],
    phases: ['Наклон · вдох', 'Подъём · выдох'],
    equip: (J) => {
      const bar = add(add(J.neck, mul(J.v, -8)), mul(J.u, -3));
      return { back: plate(bar), front: circle(bar, 2.2, '#c9d2de', '#8592a6', 0.8) };
    },
  };
}

const crossed = (t) => [t + 150, t + 8, t + 8];

function backExt() {
  const root = ['ankle', -62, -26];
  const k = (t) => ({ root, t, l: [135, 135, 60], a: crossed(t), h: t > 0 ? -10 : 0 });
  return {
    view: 'side',
    keys: [k(-45), k(68)],
    seq: [[1, 1.3, 0.25], [0, 1.1, 0.45]],
    phases: ['Наклон · вдох', 'Подъём · выдох'],
    equip: (J) => {
      const hipPad = add(J.pelvis, [9, 7]);
      return {
        back:
          line([-66, -12], [-10, 0], EQ.metal, 3) + line(hipPad, [hipPad[0] - 4, 0], EQ.metal, 3.4) + line([-80, 0], [hipPad[0] + 14, 0], EQ.metalLine, 3) +
          padSeg([-78, -17], [-56, -13], 6),
        mid: circle(add(J.ankleF, [6, -6]), 4.6, EQ.pad, EQ.padLine),
        front: circle(hipPad, 7.5, EQ.pad, EQ.padLine),
      };
    },
  };
}

function superman() {
  const k = (t, lg, ar) => ({ P: [0, -10], t, l: [lg, lg, 178], a: [ar, ar, ar], h: -4 });
  return {
    view: 'side',
    keys: [k(0, 180, -4), k(-14, 191, -22)],
    seq: [[1, 0.9, 0.9], [0, 0.9, 0.5]],
    phases: ['Подъём · выдох', 'Опускание · вдох'],
    equip: () => ({ back: rect(-80, -2, 170, 2.5, '#2a3a4f', '#3a4c64', 1.2) }),
  };
}

function shrug() {
  return {
    view: 'front',
    keys: [fst({ aR: [6, 0, 4, 0] }), fst({ sh: 7, aR: [6, 0, 4, 0] })],
    seq: [[1, 0.8, 0.6], [0, 1.0, 0.4]],
    phases: ['Подъём плеч · выдох', 'Опускание · вдох'],
    equip: (J) => ({ front: fDumb(J.hdR) + fDumb(J.hdL) }),
  };
}

// dumbbell in the front view (axis horizontal)
function fDumb(c, vertical = false) {
  const [x, y] = c;
  return vertical
    ? rect(x - 2, y - 9, 4, 18, '#2a3342', '#56657c', 1.5) + rect(x - 5.5, y - 11, 11, 5, '#1e2633', '#56657c', 1.5) + rect(x - 5.5, y + 6, 11, 5, '#1e2633', '#56657c', 1.5)
    : rect(x - 9, y - 2, 18, 4, '#2a3342', '#56657c', 1.5) + rect(x - 11, y - 5.5, 5, 11, '#1e2633', '#56657c', 1.5) + rect(x + 6, y - 5.5, 5, 11, '#1e2633', '#56657c', 1.5);
}

// ======================================================================= ПЛЕЧИ
function ohp() {
  const base = st();
  const J0 = solveSide(base);
  const rack = add(add(J0.neck, mul(J0.v, 11)), mul(J0.u, -3));
  const top = [J0.shoulder[0] + 1, J0.shoulder[1] - 51];
  return {
    view: 'side',
    keys: [{ ...base, aik: [...rack, 'down'] }, { ...base, aik: [...top, 'down'] }],
    seq: [[1, 1.0, 0.35], [0, 1.3, 0.4]],
    phases: PRESS,
    equip: (J) => bbPlate(J),
  };
}

function pressFront(o = {}) {
  const seat = { P: [0, -50], t: -90, lR: [88, 84, 3, 0] };
  const low = { ...seat, aR: [96, 12, 178, 12] };
  const top = { ...seat, aR: [164, 6, 172, 6] };
  const keys = o.arnold ? [{ ...seat, aR: [28, 86, 172, 86] }, low, top] : [low, top];
  const seq = o.arnold ? [[1, 0.6, 0], [2, 0.7, 0.3], [1, 0.7, 0], [0, 0.6, 0.35]] : [[1, 1.0, 0.3], [0, 1.2, 0.4]];
  return {
    view: 'front',
    keys,
    seq,
    phases: o.arnold ? ['Разворот', 'Жим · выдох', 'Опускание · вдох', 'Разворот'] : PRESS,
    equip: (J) => {
      const back = rect(-17, -140, 34, 92, EQ.pad, EQ.padLine, 5) + rect(-22, -50, 44, 8) + line([0, -42], [0, 0], EQ.metal, 3.4) + line([-14, 0], [14, 0], EQ.metalLine, 3);
      if (o.tool === 'machine')
        return {
          back: back + rect(-40, -230, 80, 8, '#1d2430', '#3a475a', 2),
          front: line(J.hdR, [J.hdR[0], -226], EQ.metalLine, 2.8) + line(J.hdL, [J.hdL[0], -226], EQ.metalLine, 2.8) + handle(J.hdR) + handle(J.hdL),
        };
      return { back, front: fDumb(J.hdR) + fDumb(J.hdL) };
    },
  };
}

function lateralRaise(o = {}) {
  const cable = o.tool === 'cable';
  const k0 = fst({ aR: [12, 6, 6, 6], ...(cable ? { aL: [26, 0, 34, 0] } : {}) });
  const k1 = fst({ aR: [86, 8, 78, 8], ...(cable ? { aL: [26, 0, 34, 0] } : {}) });
  return {
    view: 'front',
    keys: [k0, k1],
    seq: [[1, 0.9, 0.35], [0, 1.3, 0.4]],
    phases: ['Подъём · выдох', 'Опускание · вдох'],
    equip: (J) =>
      cable
        ? { back: tower(-62, -210), preArms: cableTo(J.hdR, [-56, -12]), front: handle(J.hdR) + handle(J.hdL) }
        : { front: fDumb(J.hdR, true) + fDumb(J.hdL, true) },
  };
}

function frontRaise() {
  return {
    view: 'side',
    keys: [st({ a: [86, 82] }), st({ a: [-4, -8] })],
    seq: [[1, 0.9, 0.35], [0, 1.3, 0.4]],
    phases: ['Подъём · выдох', 'Опускание · вдох'],
    equip: (J) => dbPair(J),
  };
}

function rearFly() {
  const base = fst({ tl: 0.36, hd: 13, root: ['anR', 9.5, -7], lR: [7, 0, 2, 0] });
  return {
    view: 'front',
    keys: [{ ...base, aR: [6, 0, 4, 0] }, { ...base, aR: [84, 0, 80, 0] }],
    seq: [[1, 0.9, 0.35], [0, 1.3, 0.4]],
    phases: ['Разведение · выдох', 'Опускание · вдох'],
    equip: (J) => ({ front: fDumb(J.hdR, true) + fDumb(J.hdL, true) }),
  };
}

function facePull() {
  const pul = [80, -150];
  return {
    view: 'side',
    keys: [st({ a: [-6, -6] }), st({ a: [175, -82, -82], as: [0.28, 0.92] })],
    seq: [[1, 0.9, 0.4], [0, 1.2, 0.4]],
    phases: PULL,
    equip: (J) => ({ back: tower(90, -215), mid: cableTo(J.grip, pul), front: handle(J.grip) }),
  };
}

function uprightRow() {
  const base = fst();
  return {
    view: 'front',
    keys: [{ ...base, hR: [11, -82, 'out'] }, { ...base, hR: [11, -126, 'out'] }],
    seq: [[1, 0.9, 0.35], [0, 1.2, 0.4]],
    phases: PULL,
    equip: (J) => {
      const y = (J.hdR[1] + J.hdL[1]) / 2;
      return { front: line([-38, y], [38, y], '#aab6c6', 2.4) + rect(-46, y - 12, 7, 24, '#1b222e', EQ.metalLine, 2) + rect(39, y - 12, 7, 24, '#1b222e', EQ.metalLine, 2) };
    },
  };
}

function externalRotation() {
  const base = fst({ aL: [8, 0, 5, 0] });
  return {
    view: 'front',
    keys: [{ ...base, aR: [6, 0, 90, 86] }, { ...base, aR: [6, 0, 90, 14] }],
    seq: [[1, 0.9, 0.4], [0, 1.2, 0.4]],
    phases: ['Разворот наружу · выдох', 'Возврат · вдох'],
    equip: (J) => ({ back: tower(-66, -150), preArms: line(J.hdR, [-62, -98], EQ.accent, 2.2) + circle([-62, -98], 3), front: handle(J.hdR) }),
  };
}

// ======================================================================= РУКИ
function curl(o = {}) {
  const k0 = st({ a: [92, 86] });
  const k1 = st({ a: [84, -64] });
  return {
    view: 'side',
    keys: [k0, k1],
    seq: [[1, 0.9, 0.3], [0, 1.3, 0.4]],
    phases: ['Подъём · выдох', 'Опускание · вдох'],
    equip: (J) => {
      if (o.tool === 'barbell') return bbPlate(J, 11);
      if (o.tool === 'cable') return { back: rect(28, -30, 14, 30, '#1d2430', '#3a475a', 2), mid: cableTo(J.grip, [34, -24]), front: handle(J.grip) };
      return dbPair(J);
    },
  };
}

function preacherCurl() {
  const base = { P: [0, -50], t: -76, l: [-2, 92, 0] };
  const J0 = solveSide({ ...base, a: [42, 42] });
  const nrm = dir(42 + 90);
  const p1 = add(J0.shoulder, add(mul(dir(42), 4), mul(nrm, 6.5)));
  const p2 = add(J0.shoulder, add(mul(dir(42), 30), mul(nrm, 6.5)));
  return {
    view: 'side',
    keys: [{ ...base, a: [42, 50] }, { ...base, a: [42, -86] }],
    seq: [[1, 0.9, 0.3], [0, 1.3, 0.4]],
    phases: ['Подъём · выдох', 'Опускание · вдох'],
    equip: (J) => ({
      back: rect(-18, -44, 34, 7) + line([0, -38], [0, 0], EQ.metal, 3.4) + line([p2[0] - 2, p2[1] + 4], [p2[0] + 2, 0], EQ.metal, 3.4) + line([-12, 0], [p2[0] + 12, 0], EQ.metalLine, 3),
      mid: padSeg(p1, p2, 7),
      ...bbPlate(J, 11),
    }),
  };
}

function inclineCurl() {
  const base = { P: [0, -48], t: -122, l: [4, 94, 0] };
  const J0 = solveSide({ ...base, a: [92, 90] });
  const b1 = add(J0.pelvis, add(mul(J0.v, -12), mul(J0.u, -4)));
  const b2 = add(J0.pelvis, add(mul(J0.v, -12), mul(J0.u, 60)));
  return {
    view: 'side',
    keys: [{ ...base, a: [94, 90] }, { ...base, a: [90, -56] }],
    seq: [[1, 0.9, 0.3], [0, 1.4, 0.4]],
    phases: ['Подъём · выдох', 'Опускание · вдох'],
    equip: (J) => ({
      back: rect(-14, -42, 36, 7) + line([6, -36], [6, 0], EQ.metal, 3.4) + padSeg(b1, b2, 7) + line(add(b2, [2, 4]), [b2[0] + 6, 0], EQ.metal, 3) + line([b2[0] - 4, 0], [26, 0], EQ.metalLine, 3),
      ...dbPair(J),
    }),
  };
}

function concentrationCurl() {
  const base = { P: [0, -48], t: -44, l: [6, 94, 0], l2: [0, 98, 0], a2: [80, 60] };
  return {
    view: 'side',
    keys: [{ ...base, a: [86, 92] }, { ...base, a: [80, -70] }],
    seq: [[1, 0.9, 0.4], [0, 1.3, 0.4]],
    phases: ['Подъём · выдох', 'Опускание · вдох'],
    equip: (J) => ({ back: bench(-40, 16, 42), front: dumbbell(J.grip) }),
  };
}

function pushdown() {
  const pul = [34, -216];
  return {
    view: 'side',
    keys: [st({ t: -82, a: [96, -8] }), st({ t: -82, a: [96, 88] })],
    seq: [[1, 0.9, 0.35], [0, 1.2, 0.4]],
    phases: ['Разгибание · выдох', 'Возврат · вдох'],
    equip: (J) => ({ back: tower(44, -225), mid: cableTo(J.grip, pul), front: handle(J.grip) }),
  };
}

function overheadExt() {
  return {
    view: 'side',
    keys: [st({ a: [-98, 100] }), st({ a: [-97, -96] })],
    seq: [[1, 0.9, 0.35], [0, 1.3, 0.4]],
    phases: ['Разгибание · выдох', 'Опускание · вдох'],
    equip: (J) => ({ front: dumbbell(J.grip, 7) }),
  };
}

function skullCrusher() {
  const base = { P: [22, -48], t: 180, lik: [52, -6.5, 'up'] };
  return {
    view: 'side',
    keys: [{ ...base, a: [262, 262] }, { ...base, a: [262, 168] }],
    seq: [[1, 1.3, 0.25], [0, 1.0, 0.4]],
    phases: ['Опускание · вдох', 'Разгибание · выдох'],
    equip: (J) => ({ back: bench(-62, 44, 41) + plate(J.grip, 10), front: circle(J.grip, 2, '#c9d2de', '#8592a6', 0.8) }),
  };
}

function kickback() {
  const base = { P: [0, -92], t: -6, l2: [90, 180, 180], a2: [92, 92, 10], lik: [-10, -6.5, 'fwd'] };
  return {
    view: 'side',
    keys: [{ ...base, a: [176, 92] }, { ...base, a: [176, 176] }],
    seq: [[1, 0.8, 0.45], [0, 1.1, 0.35]],
    phases: ['Разгибание · выдох', 'Возврат · вдох'],
    equip: (J) => ({ back: bench(-24, 62, 42), front: dumbbell(J.grip) }),
  };
}

function wristCurl() {
  const base = { P: [0, -48], t: -58, l: [2, 92, 0] };
  const J0 = solveSide({ ...base });
  const tgt = add(J0.knee, [5, -9]);
  return {
    view: 'side',
    keys: [{ ...base, aik: [...tgt, 'down'], a: [0, 0, 62] }, { ...base, aik: [...tgt, 'down'], a: [0, 0, -42] }],
    seq: [[1, 0.7, 0.3], [0, 0.9, 0.3]],
    phases: ['Сгибание · выдох', 'Опускание · вдох'],
    equip: (J) => ({ back: bench(-40, 14, 42) + plate(J.hand, 10), front: circle(J.hand, 2, '#c9d2de', '#8592a6', 0.8) }),
  };
}

function farmerWalk() {
  const k = (ln, lf, an, af, y) => ({ P: [0, y], t: -90, l: ln, l2: lf, a: an, a2: af });
  return {
    view: 'side',
    keys: [
      k([66, 96, -4], [114, 122, 28], [86, 88], [96, 92], -86.5),
      k([90, 92, 0], [78, 132, 18], [90, 90], [90, 90], -89),
      k([114, 122, 28], [66, 96, -4], [96, 92], [86, 88], -86.5),
      k([78, 132, 18], [90, 92, 0], [90, 90], [90, 90], -89),
    ],
    seq: [[1, 0.32, 0], [2, 0.32, 0], [3, 0.32, 0], [0, 0.32, 0]],
    phases: ['Шаг', 'Шаг', 'Шаг', 'Шаг'],
    equip: (J) => ({ mid: dumbbell(J.gripF, 6.5), front: dumbbell(J.grip, 6.5) }),
  };
}

function deadHang() {
  const k0 = { t: -91, a: [-89, -90, -90], l: [92, 96, 60], l2: [94, 100, 64] };
  const k1 = { t: -88.5, a: [-90, -91, -90], l: [90, 93, 58], l2: [92, 96, 62] };
  const lowest = Math.max(solveSide({ ...k0, root: ['wrist', 0, 0] }).toe[1], solveSide({ ...k0, root: ['wrist', 0, 0] }).toeF[1]);
  const W = [0, -(lowest + 14)];
  return {
    view: 'side',
    keys: [{ ...k0, root: ['wrist', ...W] }, { ...k1, root: ['wrist', ...W] }],
    seq: [[1, 1.8, 0], [0, 1.8, 0]],
    phases: ['Вис', 'Вис'],
    equip: () => ({ back: line([W[0] - 40, W[1] - 26], [W[0] - 4, W[1]], EQ.metal, 3.2) + line([W[0] - 40, W[1] - 26], [W[0] - 40, 0], EQ.metal, 3.6), mid: circle(W, 3.4, '#c9d2de', '#8592a6', 1) }),
  };
}

// ======================================================================= КОР
const lieArms = (T2) => [T2 + 150, T2 + 22, T2 + 22];

function crunch() {
  const k = (tb, h) => ({ P: [0, -9.5], t: 180, tb, h, lik: [38, -6.5, 'up'], a: lieArms(180 + tb) });
  return {
    view: 'side',
    keys: [k(0, 0), k(32, 10)],
    seq: [[1, 0.8, 0.45], [0, 1.0, 0.35]],
    phases: ['Скручивание · выдох', 'Опускание · вдох'],
    equip: () => ({ back: rect(-75, -2, 140, 2.5, '#2a3a4f', '#3a4c64', 1.2) }),
  };
}

function reverseCrunch() {
  const root = ['neck', -49, -10];
  return {
    view: 'side',
    keys: [
      { root, t: 180, tb: 0, l: [-90, 0, -90], a: [4, 1, 1] },
      { root, t: 154, tb: 26, l: [-136, -46, -136], a: [4, 1, 1] },
    ],
    seq: [[1, 0.9, 0.4], [0, 1.1, 0.35]],
    phases: ['Подкручивание таза · выдох', 'Возврат · вдох'],
    equip: () => ({ back: rect(-80, -2, 150, 2.5, '#2a3a4f', '#3a4c64', 1.2) }),
  };
}

function legRaise() {
  const k = (lg) => ({ P: [0, -9.5], t: 180, l: [lg, lg, lg - 92], a: [3, 1, 1] });
  return {
    view: 'side',
    keys: [k(-4), k(-88)],
    seq: [[1, 1.0, 0.3], [0, 1.3, 0.35]],
    phases: ['Подъём · выдох', 'Опускание · вдох'],
    equip: () => ({ back: rect(-75, -2, 160, 2.5, '#2a3a4f', '#3a4c64', 1.2) }),
  };
}

function hangingLegRaise() {
  const k0 = { t: -90, a: [-90, -90, -90], l: [92, 92, 2] };
  const k1 = { t: -102, a: [-92, -90, -90], l: [-6, -6, -96], h: 6 };
  const lowest = Math.max(solveSide({ ...k0, root: ['wrist', 0, 0] }).toe[1], solveSide({ ...k0, root: ['wrist', 0, 0] }).toeF[1]);
  const W = [0, -(lowest + 14)];
  return {
    view: 'side',
    keys: [{ ...k0, root: ['wrist', ...W] }, { ...k1, root: ['wrist', ...W] }],
    seq: [[1, 1.0, 0.35], [0, 1.3, 0.4]],
    phases: ['Подъём ног · выдох', 'Опускание · вдох'],
    equip: () => ({ back: line([W[0] - 40, W[1] - 26], [W[0] - 4, W[1]], EQ.metal, 3.2) + line([W[0] - 40, W[1] - 26], [W[0] - 40, 0], EQ.metal, 3.6), mid: circle(W, 3.4, '#c9d2de', '#8592a6', 1) }),
  };
}

function plank() {
  const toe = [-76, 0];
  const pose = (t) => ({ root: ['toe', ...toe], t, l: [t + 180, t + 180, 54], a: [90, 0, 0] });
  const t = bisect((x) => solveSide(pose(x)).elbow[1], -40, 10, -4.5);
  return {
    view: 'side',
    keys: [pose(t), pose(t - 0.8)],
    seq: [[1, 1.6, 0], [0, 1.6, 0]],
    phases: ['Удержание · ровное дыхание', 'Удержание · ровное дыхание'],
    equip: () => ({ back: rect(-100, -2, 170, 2.5, '#2a3a4f', '#3a4c64', 1.2) }),
  };
}

function sidePlank() {
  const k = (rot) => ({ root: ['anL', 70, -8], rotC: [70, -8], rot, t: -90, lR: [2, 0, 1, 0], lL: [1, 0, 0, 0], aL: [72, 0, 90, 90], aR: [104, 0, 106, 0] });
  return {
    view: 'front',
    keys: [k(-73), k(-70)],
    seq: [[1, 1.6, 0], [0, 1.6, 0]],
    phases: ['Удержание', 'Удержание'],
    equip: () => ({ back: rect(-90, -2, 180, 2.5, '#2a3a4f', '#3a4c64', 1.2) }),
  };
}

function russianTwist() {
  const base = { P: [0, -14], t: -90, tl: 0.82, legsFront: true, lR: [128, 66, 18, 80] };
  return {
    view: 'front',
    keys: [
      { ...base, t: -97, hR: [-16, -30, 'out'], hL: [-24, -30, 'in'] },
      { ...base, t: -83, hR: [24, -30, 'in'], hL: [16, -30, 'out'] },
    ],
    seq: [[1, 0.75, 0.15], [0, 0.75, 0.15]],
    phases: ['Поворот · выдох', 'Поворот · выдох'],
    equip: (J) => {
      const c = mul(add(J.hdR, J.hdL), 0.5);
      return { front: circle(c, 9, '#1b222e', EQ.metalLine, 2) + circle(c, 2.4, '#c9d2de', '#8592a6', 0.8), back: rect(-60, -2, 120, 2.5, '#2a3a4f', '#3a4c64', 1.2) };
    },
  };
}

function abWheel() {
  const root = ['knee', 0, -5];
  return {
    view: 'side',
    keys: [
      { root, t: -38, l: [92, 180, 150], aik: [30, -8, 'down'] },
      { root, t: -12, l: [160, 180, 150], aik: [126, -8, 'down'] },
    ],
    seq: [[1, 1.4, 0.3], [0, 1.2, 0.45]],
    phases: ['Выкат · вдох', 'Возврат · выдох'],
    equip: (J) => {
      const c = [J.wrist[0], -8];
      const a = (c[0] / 8) % (2 * Math.PI);
      const sp = [0, 1, 2].map((i) => line(add(c, mul(dir((a * 180) / Math.PI + i * 60), 6.5)), add(c, mul(dir((a * 180) / Math.PI + i * 60 + 180), 6.5)), '#3a475a', 1.4)).join('');
      return { mid: `<circle cx="${c[0]}" cy="${c[1]}" r="8" fill="#1b222e" stroke="${EQ.metalLine}" stroke-width="2"/>` + sp, back: rect(-30, -2, 175, 2.5, '#2a3a4f', '#3a4c64', 1.2) };
    },
  };
}

function cableCrunch() {
  const root = ['knee', 0, -5];
  const pul = [50, -200];
  const keys = [[-80, 0, 0], [-60, 58, 12]].map(([t, tb, h]) => {
    const p = { root, t, tb, h, l: [90, 180, 150] };
    const J = solveSide(p);
    return { ...p, aik: [...add(J.head, add(mul(J.v2, 5), mul(J.u2, -3))), 'down'] };
  });
  return {
    view: 'side',
    keys,
    seq: [[1, 0.9, 0.4], [0, 1.2, 0.35]],
    phases: ['Скручивание · выдох', 'Возврат · вдох'],
    equip: (J) => ({ back: tower(60, -210) + rect(-40, -2, 80, 2.5, '#2a3a4f', '#3a4c64', 1.2), mid: cableTo(J.grip, pul), front: handle(J.grip) }),
  };
}

function bicycle() {
  const k = (ln, lf) => ({ P: [0, -9.5], t: 180, tb: 24, h: 8, l: ln, l2: lf, a: lieArms(204), a2: lieArms(204) });
  const bent = [-112, -14, -100];
  const ext = [-18, -18, -100];
  return {
    view: 'side',
    keys: [k(bent, ext), k(ext, bent)],
    seq: [[1, 0.7, 0.1], [0, 0.7, 0.1]],
    phases: ['Поворот · выдох', 'Поворот · выдох'],
    equip: () => ({ back: rect(-75, -2, 160, 2.5, '#2a3a4f', '#3a4c64', 1.2) }),
  };
}

function deadBug() {
  const base = { P: [0, -9.5], t: 180 };
  const up = [270, 270, 270];
  const over = [192, 190, 190];
  const tab = [-90, 0, -90];
  const ext = [-14, -14, -104];
  return {
    view: 'side',
    keys: [
      { ...base, a: up, a2: up, l: tab, l2: tab },
      { ...base, a: over, a2: up, l: tab, l2: ext },
      { ...base, a: up, a2: up, l: tab, l2: tab },
      { ...base, a: up, a2: over, l: ext, l2: tab },
    ],
    seq: [[1, 0.9, 0.25], [2, 0.9, 0.1], [3, 0.9, 0.25], [0, 0.9, 0.1]],
    phases: ['Вытяжение · выдох', 'Возврат · вдох', 'Вытяжение · выдох', 'Возврат · вдох'],
    equip: () => ({ back: rect(-80, -2, 165, 2.5, '#2a3a4f', '#3a4c64', 1.2) }),
  };
}

function mountainClimber() {
  const W = [46, -3];
  const k = (ln, lf) => ({ root: ['wrist', ...W], t: -17, a: [94, 93, 0], l: ln, l2: lf });
  const bent = [24, 118, 40];
  const ext = [163, 163, 52];
  return {
    view: 'side',
    keys: [k(bent, ext), k(ext, bent)],
    seq: [[1, 0.34, 0.04], [0, 0.34, 0.04]],
    phases: ['Колено к груди', 'Смена ног'],
  };
}

function woodchop() {
  const base = fst({ lR: [9, 0, 6, 0], root: ['anR', 14, -7] });
  const pul = [-84, -206];
  return {
    view: 'front',
    keys: [
      { ...base, t: -96, hR: [-40, -188, 'out'], hL: [-46, -184, 'out'] },
      { ...base, t: -84, hR: [32, -82, 'out'], hL: [26, -80, 'in'] },
    ],
    seq: [[1, 0.9, 0.3], [0, 1.3, 0.4]],
    phases: ['Рывок вниз · выдох', 'Возврат · вдох'],
    equip: (J) => ({ back: tower(-92, -215), preArms: cableTo(mul(add(J.hdR, J.hdL), 0.5), pul), front: handle(mul(add(J.hdR, J.hdL), 0.5)) }),
  };
}

// ======================================================================= НОГИ
function squat(o = {}) {
  const bar = o.bar || 'back';
  const tb = { back: -52, front: -66, goblet: -64, none: -58, sumo: -68 }[bar];
  const k0 = st({ t: -90, l: [90, 90, 0] });
  const k1 = st({ t: tb, l: [4, 116, 0] });
  const withArms = (p) => {
    const J = solveSide(p);
    if (bar === 'back') return { ...p, aik: [...add(add(J.neck, mul(J.v, -8)), mul(J.u, -3)), 'down'] };
    if (bar === 'front') return { ...p, aik: [...add(add(J.neck, mul(J.v, 9)), mul(J.u, -3)), 'fwd'] };
    if (bar === 'goblet') return { ...p, aik: [...add(add(J.pelvis, mul(J.u, 36)), mul(J.v, 17)), 'down'] };
    if (bar === 'none') return { ...p, a: p === k0 ? [86, 86] : [-4, -4] };
    return { ...p, a: [90, 90] };
  };
  return {
    view: 'side',
    keys: [withArms(k0), withArms(k1)],
    seq: [[1, 1.3, 0.25], [0, 1.0, 0.45]],
    phases: ['Присед · вдох', 'Подъём · выдох'],
    equip: (J) => {
      if (bar === 'back' || bar === 'front') {
        const b = bar === 'back' ? add(add(J.neck, mul(J.v, -8)), mul(J.u, -3)) : add(add(J.neck, mul(J.v, 9)), mul(J.u, -3));
        return { back: plate(b), front: circle(b, 2.2, '#c9d2de', '#8592a6', 0.8) };
      }
      if (bar === 'goblet') return { front: dumbbell(J.grip, 7) };
      if (bar === 'sumo') return { front: dumbbell(add(J.grip, [0, 4]), 7) };
      return {};
    },
  };
}

function hackSquat() {
  const root = ['ankle', 6, -16];
  const k0 = { root, t: -122, l: [64, 80, -18] };
  const k1 = { root, t: -122, l: [-14, 110, -18] };
  return {
    view: 'side',
    keys: [k0, k1],
    seq: [[1, 1.3, 0.25], [0, 1.0, 0.45]],
    phases: ['Присед · вдох', 'Подъём · выдох'],
    equip: (J) => {
      const back = add(J.pelvis, mul(J.v, -12));
      const r1 = add(back, mul(J.u, -10));
      const r2 = add(back, mul(J.u, 60));
      const rail = mul(dir(-122 + 180), 1);
      return {
        back:
          line(add([-12, -6], mul(rail, -150)), [-12, -6], '#2b3545', 5) + padSeg(r1, r2, 8) + line([-8, -22], [30, -10], EQ.metalLine, 4) + line([-60, 0], [40, 0], EQ.metalLine, 3) +
          rect(-70, -230, 10, 230, '#1d2430', '#3a475a', 2),
        front: circle(add(J.shoulder, mul(J.v, -2)), 5, EQ.pad, EQ.padLine),
      };
    },
  };
}

function legPress(o = {}) {
  const P = [0, -36];
  const rail = -40;
  const t = -150;
  const ext = add(P, mul(dir(rail), 80));
  const bentP = add(P, mul(dir(rail), 36));
  const keys = o.calf
    ? [{ P, t, lik: [...ext, 'up'], l: [0, 0, rail - 90 - 14] }, { P, t, lik: [...ext, 'up'], l: [0, 0, rail - 90 + 26] }]
    : [{ P, t, lik: [...ext, 'up'], l: [0, 0, rail - 90] }, { P, t, lik: [...bentP, 'up'], l: [0, 0, rail - 90] }];
  return {
    view: 'side',
    keys,
    seq: [[1, 1.2, 0.25], [0, 1.0, 0.45]],
    phases: o.calf ? ['Подъём на носки · выдох', 'Опускание · вдох'] : ['Опускание · вдох', 'Жим · выдох'],
    equip: (J) => {
      const n = dir(rail + 90);
      const c = J.ball;
      const pA = add(c, mul(n, 26));
      const pB = add(c, mul(n, -18));
      const back = sub(P, mul(dir(t + 90), 12));
      return {
        back:
          line(add(P, [20, 30]), add(P, add(mul(dir(rail), 150), [20, 30])), '#2b3545', 5) +
          padSeg(add(back, mul(dir(t), -6)), add(back, mul(dir(t), 58)), 8) + rect(-20, -30, 34, 7) + line([-40, 0], [140, 0], EQ.metalLine, 3) + line([0, -24], [0, 0], EQ.metal, 3.4),
        front: padSeg(pA, pB, 6),
      };
    },
  };
}

function lunge(o = {}) {
  const bul = !!o.bulgarian;
  const front = [24, -6.5, 'fwd'];
  const rear = bul ? [-62, -50, 'fwd'] : [-40, -17, 'fwd'];
  const fr = bul ? 160 : 46;
  const k = (P) => ({ P, t: -88, lik: front, lik2: rear, l: [0, 0, 0], l2: [0, 0, fr], a: [90, 90], a2: [90, 90] });
  return {
    view: 'side',
    keys: [k(bul ? [-6, -86] : [-2, -86]), k(bul ? [-14, -50] : [-8, -50])],
    seq: [[1, 1.2, 0.25], [0, 1.0, 0.45]],
    phases: ['Опускание · вдох', 'Подъём · выдох'],
    equip: (J) => ({ back: bul ? bench(-92, -44, 45) : '', ...dbPair(J) }),
  };
}

function stepUp() {
  const k = (P, far, t) => ({ P, t, lik: [24, -52.5, 'fwd'], lik2: [...far, 'fwd'], a: [90, 90], a2: [90, 90] });
  return {
    view: 'side',
    keys: [k([-4, -86], [-14, -6.5], -82), k([12, -132], [6, -52.5], -90)],
    seq: [[1, 1.1, 0.3], [0, 1.2, 0.4]],
    phases: ['Подъём · выдох', 'Спуск · вдох'],
    equip: (J) => ({ back: rect(-8, -46, 52, 46, '#252e3c', '#3a475a', 3), ...dbPair(J) }),
  };
}

function legExt() {
  const k = (sh) => ({ P: [0, -55], t: -100, l: [0, sh, sh - 90], a: [80, 30] });
  return {
    view: 'side',
    keys: [k(94), k(-4)],
    seq: [[1, 0.9, 0.4], [0, 1.3, 0.35]],
    phases: ['Разгибание · выдох', 'Опускание · вдох'],
    equip: (J) => {
      const pad = add(J.ankle, mul(dir(Math.atan2(J.ankle[1] - J.knee[1], J.ankle[0] - J.knee[0]) * 57.2958 - 90), 7));
      return {
        back: rect(-18, -51, 46, 8) + padSeg([-16, -52], [-26, -108], 8) + line([4, -44], [4, 0], EQ.metal, 3.4) + line([-20, 0], [30, 0], EQ.metalLine, 3),
        front: line(J.knee, pad, EQ.metalLine, 3) + circle(pad, 5.5, EQ.pad, EQ.padLine) + circle(J.knee, 2.5, '#c9d2de', '#8592a6', 1),
      };
    },
  };
}

function legCurlLying() {
  const k = (sh) => ({ P: [0, -50], t: 0, l: [180, sh, sh - 90], a: [60, 20], h: -10 });
  return {
    view: 'side',
    keys: [k(182), k(278)],
    seq: [[1, 0.9, 0.4], [0, 1.3, 0.35]],
    phases: ['Сгибание · выдох', 'Опускание · вдох'],
    equip: (J) => {
      const sh = Math.atan2(J.ankle[1] - J.knee[1], J.ankle[0] - J.knee[0]) * 57.2958;
      const pad = add(J.ankle, mul(dir(sh + 90), 7));
      return { back: bench(-60, 76, 42), front: line(J.knee, pad, EQ.metalLine, 3) + circle(pad, 5.5, EQ.pad, EQ.padLine) };
    },
  };
}

function legCurlSeated() {
  const k = (sh) => ({ P: [0, -55], t: -100, l: [0, sh, sh - 90], a: [70, 10] });
  return {
    view: 'side',
    keys: [k(-2), k(96)],
    seq: [[1, 0.9, 0.4], [0, 1.3, 0.35]],
    phases: ['Сгибание · выдох', 'Возврат · вдох'],
    equip: (J) => {
      const sh = Math.atan2(J.ankle[1] - J.knee[1], J.ankle[0] - J.knee[0]) * 57.2958;
      const pad = add(J.ankle, mul(dir(sh + 90), 7));
      return {
        back: rect(-18, -51, 46, 8) + padSeg([-16, -52], [-26, -108], 8) + line([4, -44], [4, 0], EQ.metal, 3.4) + line([-20, 0], [30, 0], EQ.metalLine, 3),
        front: circle(add(J.knee, [-12, -11]), 5.5, EQ.pad, EQ.padLine) + line(J.knee, pad, EQ.metalLine, 3) + circle(pad, 5.5, EQ.pad, EQ.padLine),
      };
    },
  };
}

function nordic() {
  const root = ['knee', 0, -5];
  const k = (th, a) => ({ root, t: th, l: [th + 180, 180, 160], a });
  return {
    view: 'side',
    keys: [k(-88, [76, 20]), k(-24, [84, 70])],
    seq: [[1, 2.0, 0.2], [0, 1.2, 0.5]],
    phases: ['Медленный наклон · вдох', 'Возврат · выдох'],
    equip: (J) => ({ back: rect(-60, -2, 180, 2.5, '#2a3a4f', '#3a4c64', 1.2), front: circle(add(J.ankle, [0, -7]), 4.6, EQ.pad, EQ.padLine) }),
  };
}

function wallSit() {
  const k = (t) => st({ t, l: [0, 90, 0], a: [92, 90] });
  return {
    view: 'side',
    keys: [k(-90), k(-89)],
    seq: [[1, 1.6, 0], [0, 1.6, 0]],
    phases: ['Удержание', 'Удержание'],
    equip: () => ({ back: rect(-58, -190, 10, 190, '#232b38', '#3a475a', 1) }),
  };
}

function hipThrust(o = {}) {
  const floor = !!o.floor;
  const root = floor ? ['shoulder', -38, -10] : ['shoulder', -34, -50];
  const k = (t) => {
    const p = { root, t, lik: [36, -6.5, 'up'] };
    if (floor) return { ...p, a: [6, 2, 2] };
    const J = solveSide(p);
    return { ...p, aik: [...add(J.pelvis, mul(J.v, 13)), 'up'] };
  };
  return {
    view: 'side',
    keys: floor ? [k(180), k(147)] : [k(211), k(182)],
    seq: [[1, 0.9, 0.6], [0, 1.1, 0.35]],
    phases: ['Подъём таза · выдох', 'Опускание · вдох'],
    equip: (J) => {
      if (floor) return { back: rect(-80, -2, 150, 2.5, '#2a3a4f', '#3a4c64', 1.2) };
      const b = add(J.pelvis, mul(J.v, 13));
      return { back: bench(-88, -30, 44), mid: plate(b, 14), front: circle(b, 2.2, '#c9d2de', '#8592a6', 0.8) };
    },
  };
}

function kickbackLeg(o = {}) {
  if (o.cable) {
    const base = { root: ['ankleF', 0, -6.5], t: -76, l2: [90, 90, 0], a: [8, -16], a2: [10, -14] };
    return {
      view: 'side',
      keys: [{ ...base, l: [94, 98, 6] }, { ...base, l: [140, 146, 60] }],
      seq: [[1, 0.8, 0.45], [0, 1.1, 0.35]],
      phases: ['Отведение · выдох', 'Возврат · вдох'],
      equip: (J) => ({ back: tower(56, -200), mid: cableTo(J.ankle, [50, -10]) + circle(J.ankle, 3, EQ.accent, '#ffb3aa', 1) }),
    };
  }
  const base = { root: ['kneeF', 0, -5], t: 0, l2: [90, 180, 160], a: [90, 90, 0], a2: [90, 90, 0] };
  return {
    view: 'side',
    keys: [{ ...base, l: [92, 180, 160] }, { ...base, l: [192, 268, 178] }],
    seq: [[1, 0.8, 0.45], [0, 1.0, 0.35]],
    phases: ['Подъём ноги · выдох', 'Опускание · вдох'],
    equip: () => ({ back: rect(-60, -2, 170, 2.5, '#2a3a4f', '#3a4c64', 1.2) }),
  };
}

function hipAbduction(o = {}) {
  const seat = { P: [0, -50], t: -90, aR: [22, 0, 12, 0] };
  const open = { ...seat, lR: [90, 50, 2, 0] };
  const closed = { ...seat, lR: [90, 86, 2, 0] };
  return {
    view: 'front',
    keys: o.adduct ? [open, closed] : [closed, open],
    seq: [[1, 0.9, 0.4], [0, 1.2, 0.35]],
    phases: o.adduct ? ['Сведение · выдох', 'Разведение · вдох'] : ['Разведение · выдох', 'Сведение · вдох'],
    equip: (J) => {
      const off = o.adduct ? -6 : 6;
      return {
        back: rect(-17, -140, 34, 92, EQ.pad, EQ.padLine, 5) + rect(-24, -50, 48, 8) + line([0, -42], [0, 0], EQ.metal, 3.4) + line([-16, 0], [16, 0], EQ.metalLine, 3),
        front: circle(add(J.knR, [off, 0]), 5.5, EQ.pad, EQ.padLine) + circle(add(J.knL, [-off, 0]), 5.5, EQ.pad, EQ.padLine),
      };
    },
  };
}

function bandWalk() {
  const k = (r, l) => ({ P: [0, -86], t: -90, lR: r, lL: l, aR: [16, 0, 30, 0] });
  const n = [5, 0, 3, 0];
  const w = [14, 0, 10, 0];
  return {
    view: 'front',
    keys: [k(n, n), k(w, n), k(w, w), k(n, w)],
    seq: [[1, 0.45, 0.1], [2, 0.45, 0.1], [3, 0.45, 0.1], [0, 0.45, 0.1]],
    phases: ['Шаг', 'Шаг', 'Шаг', 'Шаг'],
    equip: (J) => {
      const a = add(J.knR, mul(sub(J.anR, J.knR), 0.15));
      const b = add(J.knL, mul(sub(J.anL, J.knL), 0.15));
      return { front: line(a, b, EQ.accent, 3) };
    },
  };
}

function sideLyingAbduction() {
  const k = (ab) => ({ P: [0, -14], rotC: [0, -14], rot: -90, t: -90, lL: [2, 0, 40, 80], lR: [ab, 0, ab, 0], aL: [168, 0, 150, 70], aR: [36, 70, 60, 80] });
  return {
    view: 'front',
    keys: [k(3), k(40)],
    seq: [[1, 0.9, 0.4], [0, 1.2, 0.35]],
    phases: ['Подъём ноги · выдох', 'Опускание · вдох'],
    equip: () => ({ back: rect(-100, -2, 190, 2.5, '#2a3a4f', '#3a4c64', 1.2) }),
  };
}

function kbSwing() {
  return {
    view: 'side',
    keys: [st({ t: -24, l: [76, 102, 0], a: [116, 122] }), st({ t: -92, a: [-8, -10] })],
    seq: [[1, 0.55, 0.12], [0, 0.6, 0.08]],
    phases: ['Мах · выдох', 'Замах назад · вдох'],
    equip: (J) => ({ front: kettlebell(J.grip) }),
  };
}

function calfRaise(o = {}) {
  if (o.seated) {
    const ball = [36, -14];
    const k = (fa) => {
      const ankle = sub(ball, [12.5 * Math.cos((fa * Math.PI) / 180) - 6.5 * Math.sin((fa * Math.PI) / 180), 12.5 * Math.sin((fa * Math.PI) / 180) + 6.5 * Math.cos((fa * Math.PI) / 180)]);
      return { P: [-6, -58], t: -86, lik: [...ankle, 'up'], l: [0, 0, fa], a: [70, -10] };
    };
    return {
      view: 'side',
      keys: [k(-18), k(30)],
      seq: [[1, 0.8, 0.5], [0, 1.1, 0.5]],
      phases: ['Подъём на носки · выдох', 'Опускание · вдох'],
      equip: (J) => ({
        back: rect(-26, -54, 36, 8) + line([-8, -46], [-8, 0], EQ.metal, 3.4) + rect(20, -14, 34, 14, '#252e3c', '#3a475a', 2) + line([-30, 0], [60, 0], EQ.metalLine, 3),
        front: circle(add(J.knee, [-2, -9]), 6, EQ.pad, EQ.padLine),
      }),
    };
  }
  const single = !!o.single;
  const k = (fa) => ({
    root: ['ball', 2, -14],
    t: -90,
    l: [90, 90, fa],
    l2: single ? [104, 152, 120] : [90, 90, fa],
    a: single ? [4, -4] : [60, -80],
    a2: single ? [80, 70] : [60, -80],
  });
  return {
    view: 'side',
    keys: [k(-16), k(32)],
    seq: [[1, 0.8, 0.5], [0, 1.1, 0.5]],
    phases: ['Подъём на носки · выдох', 'Опускание · вдох'],
    equip: (J) => ({
      back: rect(-8, -14, 30, 14, '#252e3c', '#3a475a', 2) + (single ? rect(48, -150, 8, 150, '#1d2430', '#3a475a', 2) : rect(-40, -230, 9, 230, '#1d2430', '#3a475a', 2)),
      front: single ? '' : padSeg(add(J.shoulder, [-10, -6]), add(J.shoulder, [10, -6]), 7),
    }),
  };
}

function tibRaise() {
  const k = (fa) => ({ root: ['heel', 10, 0], t: -98, l: [82, 82, fa], a: [94, 90] });
  return {
    view: 'side',
    keys: [k(4), k(-34)],
    seq: [[1, 0.7, 0.4], [0, 1.0, 0.4]],
    phases: ['Подъём носков · выдох', 'Опускание · вдох'],
    equip: (J) => ({ back: rect(J.head[0] - 22, -200, 10, 200, '#232b38', '#3a475a', 1) }),
  };
}

// ======================================================================= РЕЕСТР
export const MOTIONS = {
  'press-lying': pressLying,
  'machine-press': machinePress,
  pushup,
  'pike-pushup': pikePushup,
  'scap-pushup': scapPushup,
  dips,
  'bench-dips': benchDips,
  pullover,
  'fly-lying': flyLying,
  crossover,
  'pec-deck': pecDeck,
  pullup,
  pulldown,
  'straight-arm-pulldown': straightArmPulldown,
  'bent-row': bentRow,
  'db-row': dbRow,
  'cable-row': cableRow,
  'chest-supported-row': chestSupportedRow,
  'y-raise': () => chestSupportedRow({ y: true }),
  'inverted-row': invertedRow,
  deadlift,
  rdl,
  'good-morning': goodMorning,
  'back-ext': backExt,
  superman,
  shrug,
  ohp,
  'press-front': pressFront,
  'lateral-raise': lateralRaise,
  'front-raise': frontRaise,
  'rear-fly': rearFly,
  'face-pull': facePull,
  'upright-row': uprightRow,
  'external-rotation': externalRotation,
  curl,
  'preacher-curl': preacherCurl,
  'incline-curl': inclineCurl,
  'concentration-curl': concentrationCurl,
  pushdown,
  'overhead-ext': overheadExt,
  'skull-crusher': skullCrusher,
  kickback,
  'wrist-curl': wristCurl,
  'farmer-walk': farmerWalk,
  'dead-hang': deadHang,
  crunch,
  'reverse-crunch': reverseCrunch,
  'leg-raise': legRaise,
  'hanging-leg-raise': hangingLegRaise,
  plank,
  'side-plank': sidePlank,
  'russian-twist': russianTwist,
  'ab-wheel': abWheel,
  'cable-crunch': cableCrunch,
  bicycle,
  'dead-bug': deadBug,
  'mountain-climber': mountainClimber,
  woodchop,
  squat,
  'hack-squat': hackSquat,
  'leg-press': legPress,
  lunge,
  'step-up': stepUp,
  'leg-ext': legExt,
  'leg-curl-lying': legCurlLying,
  'leg-curl-seated': legCurlSeated,
  nordic,
  'wall-sit': wallSit,
  'hip-thrust': hipThrust,
  'kickback-leg': kickbackLeg,
  'hip-abduction': hipAbduction,
  'hip-adduction': () => hipAbduction({ adduct: true }),
  'band-walk': bandWalk,
  'side-lying-abduction': sideLyingAbduction,
  'kb-swing': kbSwing,
  'calf-raise': calfRaise,
  'tib-raise': tibRaise,
};

export { L };
