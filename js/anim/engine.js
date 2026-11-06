// Движок анимированного манекена: скелет, прямая и обратная кинематика, отрисовка.
//
// Координаты экранные (y вниз). Углы — абсолютные, в градусах: 0° = вправо, 90° = вниз,
// -90° = вверх. Вид сбоку: фигура смотрит вправо. Пол — y = 0.

export const L = { torso: 50, sDrop: 5, neck: 6, headR: 9.5, upper: 28, fore: 25, hand: 7, thigh: 43, shin: 41 };

const RAD = Math.PI / 180;
export const dir = (deg) => [Math.cos(deg * RAD), Math.sin(deg * RAD)];
export const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
export const mul = (a, k) => [a[0] * k, a[1] * k];
export const len = (a) => Math.hypot(a[0], a[1]);
export const lerp = (a, b, k) => a + (b - a) * k;
export const rotP = (p, c, deg) => {
  const [x, y] = sub(p, c);
  const co = Math.cos(deg * RAD);
  const si = Math.sin(deg * RAD);
  return [c[0] + x * co - y * si, c[1] + x * si + y * co];
};
const f1 = (v) => Math.round(v * 10) / 10;
const P = (p) => `${f1(p[0])} ${f1(p[1])}`;

/** Двухзвенная обратная кинематика: от основания A к цели T. */
export function ik2(A, T, l1, l2, bend = 'down') {
  const d = sub(T, A);
  const dist = Math.max(Math.abs(l1 - l2) + 0.01, Math.min(len(d), l1 + l2 - 0.001));
  const base = Math.atan2(d[1], d[0]);
  const a = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist))));
  const c1 = add(A, [Math.cos(base + a) * l1, Math.sin(base + a) * l1]);
  const c2 = add(A, [Math.cos(base - a) * l1, Math.sin(base - a) * l1]);
  let E;
  if (bend === 1) E = c1;
  else if (bend === -1) E = c2;
  else {
    const k = { down: [0, 1], up: [0, -1], fwd: [1, 0], back: [-1, 0], out: [1, 0], in: [-1, 0] }[bend] || [0, 1];
    E = c1[0] * k[0] + c1[1] * k[1] >= c2[0] * k[0] + c2[1] * k[1] ? c1 : c2;
  }
  const ed = sub(T, E);
  const W = add(E, mul(ed, l2 / (len(ed) || 1)));
  return [E, W];
}
const ang = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]) / RAD;

// стопа в локальных координатах голеностопа (до поворота)
const FOOT = { heel: [-5, 6.5], ball: [12.5, 6.5], toe: [17.5, 5.2] };

// ------------------------------------------------------------------ вид сбоку
export function solveSide(p) {
  const t = p.t ?? -90;
  const tb = p.tb || 0;
  const u = dir(t);
  const u2 = dir(t + tb);
  const v2 = [-u2[1], u2[0]];
  const v = [-u[1], u[0]];
  const MID = 25;
  const J = { u, v, u2, v2, t, tb };
  J.pelvis = [0, 0];
  J.mid = mul(u, MID);
  J.neck = add(J.mid, mul(u2, L.torso - MID));
  const so = p.sOff || [0, 0];
  J.shoulder = add(add(J.mid, mul(u2, L.torso - MID - L.sDrop + so[0])), mul(v2, so[1]));
  J.headA = t + tb + (p.h || 0);
  J.head = add(J.neck, mul(dir(J.headA), L.neck + L.headR));
  const FAR = add(mul(v, -1.3), mul(u, 0.9));
  J.far = FAR;
  J.shoulderF = add(J.shoulder, FAR);
  J.hip = J.pelvis;
  J.hipF = add(J.pelvis, FAR);

  const legFK = (hip, a) => {
    const knee = add(hip, mul(dir(a[0]), L.thigh));
    const ankle = add(knee, mul(dir(a[1]), L.shin));
    return { knee, ankle, fa: a[2] ?? 0 };
  };
  const armFK = (sh, a, sc = [1, 1]) => {
    const elbow = add(sh, mul(dir(a[0]), L.upper * sc[0]));
    const wrist = add(elbow, mul(dir(a[1]), L.fore * sc[1]));
    return { elbow, wrist, ha: a[2] ?? a[1] };
  };
  const ln = p.l || [90, 90, 0];
  const lf = p.l2 || ln;
  const an = p.a || [90, 90];
  const af = p.a2 || an;
  const legN = legFK(J.hip, ln);
  const legF = legFK(J.hipF, lf);
  const armN = armFK(J.shoulder, an, p.as);
  const armF = armFK(J.shoulderF, af, p.as2 || p.as);
  Object.assign(J, { knee: legN.knee, ankle: legN.ankle, faN: legN.fa, kneeF: legF.knee, ankleF: legF.ankle, faF: legF.fa });
  Object.assign(J, { elbow: armN.elbow, wrist: armN.wrist, haN: armN.ha, elbowF: armF.elbow, wristF: armF.wrist, haF: armF.ha });
  footPts(J);

  // перенос: корень (опорная точка) или положение таза
  let off = p.P || [0, 0];
  if (p.root) {
    const [name, x, y] = p.root;
    off = sub([x, y], J[name]);
  }
  translate(J, off);

  // обратная кинематика (цели в мировых координатах)
  if (p.aik) {
    const [E, W] = ik2(J.shoulder, p.aik, L.upper, L.fore, p.aik[2] || 'down');
    J.elbow = E;
    J.wrist = W;
    J.haN = p.a?.[2] ?? ang(E, W);
  }
  if (p.aik || p.aik2) {
    const tg = p.aik2 || add(p.aik, J.far);
    const [E, W] = ik2(J.shoulderF, tg, L.upper, L.fore, (p.aik2 || p.aik)[2] || 'down');
    J.elbowF = E;
    J.wristF = W;
    J.haF = (p.a2 || p.a)?.[2] ?? ang(E, W);
  }
  if (p.lik) {
    const [K, A] = ik2(J.hip, p.lik, L.thigh, L.shin, p.lik[2] || 'fwd');
    J.knee = K;
    J.ankle = A;
  }
  if (p.lik || p.lik2) {
    const tg = p.lik2 || add(p.lik, J.far);
    const [K, A] = ik2(J.hipF, tg, L.thigh, L.shin, (p.lik2 || p.lik)[2] || 'fwd');
    J.kneeF = K;
    J.ankleF = A;
  }
  footPts(J);
  J.hand = add(J.wrist, mul(dir(J.haN), L.hand));
  J.handF = add(J.wristF, mul(dir(J.haF), L.hand));
  J.grip = add(J.wrist, mul(dir(J.haN), L.hand * 0.55));
  J.gripF = add(J.wristF, mul(dir(J.haF), L.hand * 0.55));
  return J;
}

function footPts(J) {
  for (const [s, a, fa] of [['', J.ankle, J.faN], ['F', J.ankleF, J.faF]]) {
    for (const [k, v] of Object.entries(FOOT)) J[k + s] = add(a, rotP(v, [0, 0], fa));
  }
}

function translate(J, off) {
  for (const k of Object.keys(J)) {
    const v = J[k];
    if (Array.isArray(v) && v.length === 2 && typeof v[0] === 'number' && !['u', 'v', 'u2', 'v2', 'far'].includes(k)) J[k] = add(v, off);
  }
}

// ------------------------------------------------------------------ вид спереди
// Рука/нога задаются парой углов (ab, f) на звено: ab — отведение от «вниз» (0)
// к «наружу» (90) и «вверх» (180); f — поворот к зрителю (90 = направлено на нас).
const SW = 15.5;
const HW = 8.2;

function frontVec(J, ab, f, side) {
  const x = Math.sin(ab * RAD) * Math.cos(f * RAD) * side;
  const y = Math.cos(ab * RAD);
  return add(mul(J.v, x), mul(J.u, -y));
}

export function solveFront(p) {
  const t = p.t ?? -90;
  const tl = p.tl ?? 1;
  const u = dir(t);
  const v = [-u[1], u[0]];
  const J = { u, v, t, tl, front: true, endon: !!p.endon, legsFront: !!p.legsFront };
  J.pelvis = [0, 0];
  const sh = p.sh || 0;
  J.neck = mul(u, L.torso * tl + sh);
  const sc = mul(u, (L.torso - 6) * tl + sh);
  J.shR = add(sc, mul(v, SW));
  J.shL = add(sc, mul(v, -SW));
  J.hipR = mul(v, HW);
  J.hipL = mul(v, -HW);
  J.head = add(J.neck, mul(u, (L.neck + L.headR) * Math.max(0.55, tl) - (p.hd || 0)));

  const limb = (base, a, l1, l2, side) => {
    const m = add(base, mul(frontVec(J, a[0], a[1] ?? 0, side), l1));
    const e = add(m, mul(frontVec(J, a[2] ?? a[0], a[3] ?? a[1] ?? 0, side), l2));
    return [m, e];
  };
  const aR = p.aR || [8, 0, 4, 0];
  const aL = p.aL || aR;
  const lR = p.lR || [4, 0, 2, 0];
  const lL = p.lL || lR;
  [J.elR, J.wrR] = limb(J.shR, aR, L.upper, L.fore, 1);
  [J.elL, J.wrL] = limb(J.shL, aL, L.upper, L.fore, -1);
  [J.knR, J.anR] = limb(J.hipR, lR, L.thigh, L.shin, 1);
  [J.knL, J.anL] = limb(J.hipL, lL, L.thigh, L.shin, -1);

  let off = p.P || [0, 0];
  if (p.root) off = sub([p.root[1], p.root[2]], J[p.root[0]]);
  for (const k of Object.keys(J)) {
    const val = J[k];
    if (Array.isArray(val) && typeof val[0] === 'number' && !['u', 'v'].includes(k)) J[k] = add(val, off);
  }
  if (p.hR) {
    const [E, W] = ik2(J.shR, p.hR, L.upper, L.fore, p.hR[2] || 'out');
    J.elR = E;
    J.wrR = W;
  }
  if (p.hR || p.hL) {
    const src = p.hL || [2 * J.pelvis[0] - p.hR[0], p.hR[1], p.hR[2] === 'out' ? 'in' : p.hR[2] === 'in' ? 'out' : p.hR[2]];
    const [E, W] = ik2(J.shL, src, L.upper, L.fore, src[2] || 'in');
    J.elL = E;
    J.wrL = W;
  }
  if (p.rot) {
    const c = p.rotC || J.pelvis;
    for (const k of Object.keys(J)) {
      const val = J[k];
      if (Array.isArray(val) && typeof val[0] === 'number' && !['u', 'v'].includes(k)) J[k] = rotP(val, c, p.rot);
    }
    J.u = rotP(J.u, [0, 0], p.rot);
    J.v = rotP(J.v, [0, 0], p.rot);
  }
  J.hdR = add(J.wrR, mul(sub(J.wrR, J.elR), L.hand / (len(sub(J.wrR, J.elR)) || 1)));
  J.hdL = add(J.wrL, mul(sub(J.wrL, J.elL), L.hand / (len(sub(J.wrL, J.elL)) || 1)));
  return J;
}

// ------------------------------------------------------------------ интерполяция
export function lerpPose(a, b, k) {
  const out = {};
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const x = a[key] ?? b[key];
    const y = b[key] ?? a[key];
    if (typeof x === 'number' && typeof y === 'number') out[key] = lerp(x, y, k);
    else if (Array.isArray(x) && Array.isArray(y)) out[key] = x.map((v, i) => (typeof v === 'number' && typeof y[i] === 'number' ? lerp(v, y[i], k) : k < 0.5 ? v : y[i]));
    else out[key] = k < 0.5 ? x : y;
  }
  return out;
}

export const ease = (k) => 0.5 - 0.5 * Math.cos(Math.PI * k);

// ------------------------------------------------------------------ рисование
const COL = {
  near: '#e9edf3',
  nearLine: '#8794a8',
  far: '#a2adbd',
  farLine: '#6c788c',
  torso: '#eef1f6',
  joint: '#cfd6e0',
};

function mix(c1, c2, k) {
  const h = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const a = h(c1);
  const b = typeof c2 === 'string' ? h(c2) : c2;
  return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * k)).join(' ')})`;
}

/** Капсула (сегмент конечности) от a к b с радиусами ra, rb. */
export function capsule(a, b, ra, rb) {
  const d = sub(b, a);
  const l = len(d) || 0.001;
  const n = [-d[1] / l, d[0] / l];
  const p1 = add(a, mul(n, ra));
  const p2 = add(b, mul(n, rb));
  const p3 = add(b, mul(n, -rb));
  const p4 = add(a, mul(n, -ra));
  return `M${P(p1)}L${P(p2)}A${f1(rb)} ${f1(rb)} 0 0 0 ${P(p3)}L${P(p4)}A${f1(ra)} ${f1(ra)} 0 0 0 ${P(p1)}Z`;
}

function smooth(pts) {
  const n = pts.length;
  let d = `M${P(pts[0])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const k = 0.18;
    d += `C${P([p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k])} ${P([p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k])} ${P(p2)}`;
  }
  return d + 'Z';
}

const path = (d, fill, stroke, sw = 0.8, extra = '') => `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"${extra}/>`;

/** Цвет сегмента с учётом нагрузки (heat — 0…1 для участка тела). */
const segFill = (base, heat, k = 0.95) => {
  const h = Math.max(0, (heat - 0.3) / 0.7);
  return h > 0.02 ? mix(base, heatRGB(heat), Math.min(1, h * k)) : base;
};

let heatRGB = () => [255, 80, 80];
export function setHeatFn(fn) {
  heatRGB = fn;
}

/** Участки тела манекена ← мышцы. */
export function bodyHeat(m = {}) {
  const g = (...ids) => Math.max(0, ...ids.map((id) => m[id] || 0)) / 100;
  return {
    chest: g('chest_upper', 'chest_mid', 'chest_lower', 'abs_upper', 'abs_lower', 'obliques', 'serratus'),
    back: g('lats', 'traps_mid', 'traps_lower', 'lower_back', 'rotator'),
    neck: g('traps_upper'),
    delt: g('delt_front', 'delt_side', 'delt_rear'),
    upper: g('biceps', 'brachialis', 'triceps_long', 'triceps_lat'),
    fore: g('forearms'),
    glute: g('glutes', 'glute_med'),
    thigh: g('quads', 'hamstrings', 'adductors', 'hip_flexors'),
    shin: g('calves', 'soleus', 'tibialis'),
  };
}

export function drawSide(J, H, layers = {}) {
  const leg = (s, far) => {
    const knee = J['knee' + s];
    const ankle = J['ankle' + s];
    const hip = s ? J.hipF : J.hip;
    const base = far ? COL.far : COL.near;
    const line = far ? COL.farLine : COL.nearLine;
    const fT = segFill(base, H.thigh * (far ? 0.75 : 1));
    const fS = segFill(base, H.shin * (far ? 0.75 : 1));
    const foot = smooth([J['heel' + s], add(J['heel' + s], mul(sub(ankle, J['heel' + s]), 0.65)), J['ball' + s], J['toe' + s], add(J['ball' + s], [0, 0])]);
    return (
      path(capsule(knee, ankle, 5.6, 3.6), fS, line) +
      path(foot, base, line) +
      path(capsule(hip, knee, 8.2, 5.8), fT, line)
    );
  };
  const arm = (s, far) => {
    const sh = s ? J.shoulderF : J.shoulder;
    const el = J['elbow' + s];
    const wr = J['wrist' + s];
    const hd = J['hand' + s];
    const base = far ? COL.far : COL.near;
    const line = far ? COL.farLine : COL.nearLine;
    return (
      path(capsule(el, wr, 4.2, 3), segFill(base, H.fore * (far ? 0.75 : 1)), line) +
      path(capsule(wr, hd, 3.1, 2.6), base, line) +
      path(capsule(sh, el, 5.4, 4.4), segFill(base, H.upper * (far ? 0.75 : 1)), line)
    );
  };
  // туловище: передняя и задняя половины (разная подсветка)
  const T = (a, c) => (a <= 25 ? add(add(J.pelvis, mul(J.u, a)), mul(J.v, c)) : add(add(J.mid, mul(J.u2, a - 25)), mul(J.v2, c)));
  const front = [[-4, 0], [-3, 6.5], [6, 8.6], [16, 9], [26, 10.4], [35, 11.6], [42, 10], [48, 5.5], [52, 0]].map(([a, c]) => T(a, c));
  const back = [[52, 0], [48, -6.5], [40, -9.2], [30, -8.6], [19, -7.2], [9, -8.6], [0, -10.2], [-5, -6], [-4, 0]].map(([a, c]) => T(a, c));
  const torsoD = smooth([...front.slice(1, -1), front[front.length - 1], ...back.slice(1, -1), front[0]]);
  const frontD = smooth([...front, T(26, 0)]);
  const backD = smooth([...back, T(26, 0)]);
  const glute = smooth([T(9, -5), T(4, -10.4), T(-3, -10.5), T(-6, -6), T(-3, -1)]);
  const delt = smooth([add(J.shoulder, mul(J.u2, 5)), add(J.shoulder, add(mul(J.v2, 6.5), mul(J.u2, 1))), add(J.shoulder, add(mul(J.v2, 4), mul(J.u2, -6))), add(J.shoulder, add(mul(J.v2, -4), mul(J.u2, -5))), add(J.shoulder, add(mul(J.v2, -6), mul(J.u2, 2)))]);
  const uh = dir(J.headA);
  const vh = [-uh[1], uh[0]];
  const eye = add(J.head, add(mul(vh, 5.4), mul(uh, 1.6)));
  const ear = add(J.head, mul(vh, -1));
  return (
    (layers.back || '') +
    leg('F', true) +
    arm('F', true) +
    (layers.mid || '') +
    path(capsule(J.neck, add(J.neck, mul(dir(J.headA), 7)), 4.4, 4), COL.torso, COL.nearLine) +
    path(torsoD, COL.torso, COL.nearLine, 0.9) +
    (H.chest > 0.05 ? path(frontD, segFill(COL.torso, H.chest), 'none', 0, ' opacity=".9"') : '') +
    (H.back > 0.05 ? path(backD, segFill(COL.torso, H.back), 'none', 0, ' opacity=".9"') : '') +
    (H.glute > 0.05 ? path(glute, segFill(COL.torso, H.glute), 'none', 0) : '') +
    path(torsoD, 'none', COL.nearLine, 0.9) +
    `<circle cx="${f1(J.head[0])}" cy="${f1(J.head[1])}" r="${L.headR}" fill="${COL.torso}" stroke="${COL.nearLine}" stroke-width=".9"/>` +
    `<ellipse cx="${f1(ear[0])}" cy="${f1(ear[1])}" rx="1.8" ry="2.4" fill="#d3dae4"/>` +
    `<circle cx="${f1(eye[0])}" cy="${f1(eye[1])}" r="1.15" fill="#5c687a"/>` +
    leg('', false) +
    path(delt, segFill(COL.near, H.delt), COL.nearLine) +
    arm('', false) +
    (layers.front || '')
  );
}

export function drawFront(J, H, layers = {}) {
  const leg = (s) => {
    const hip = J['hip' + s];
    const kn = J['kn' + s];
    const an = J['an' + s];
    const foot = add(an, mul(J.u, -5));
    return (
      path(capsule(kn, an, 5.4, 3.6), segFill(COL.near, H.shin), COL.nearLine) +
      path(capsule(an, add(foot, mul(J.v, s === 'R' ? 3 : -3)), 3.6, 3.6), COL.near, COL.nearLine) +
      path(capsule(hip, kn, 8, 5.6), segFill(COL.near, H.thigh), COL.nearLine)
    );
  };
  const arm = (s) => {
    const sh = J['sh' + s];
    const el = J['el' + s];
    const wr = J['wr' + s];
    const hd = J['hd' + s];
    return (
      path(capsule(el, wr, 4.2, 3), segFill(COL.near, H.fore), COL.nearLine) +
      path(capsule(wr, hd, 3.1, 2.7), COL.near, COL.nearLine) +
      path(capsule(sh, el, 5.4, 4.3), segFill(COL.near, H.upper), COL.nearLine) +
      `<circle cx="${f1(sh[0])}" cy="${f1(sh[1])}" r="6.6" fill="${segFill(COL.near, H.delt)}" stroke="${COL.nearLine}" stroke-width=".8"/>`
    );
  };
  if (J.endon) return drawEndOn(J, H, layers, arm);
  const T = (x, a) => add(add(J.pelvis, mul(J.v, x)), mul(J.u, a * J.tl));
  const shift = sub(J.neck, add(J.pelvis, mul(J.u, L.torso * J.tl)));
  const pts = [[0, -5], [12, -2], [13, 8], [11, 20], [12.5, 30], [15, 38], [19.5, 42.5], [18, 46.5], [10, 48], [4.5, 50], [-4.5, 50], [-10, 48], [-18, 46.5], [-19.5, 42.5], [-15, 38], [-12.5, 30], [-11, 20], [-13, 8], [-12, -2]].map(([x, a]) =>
    a >= 38 ? add(T(x, a), mul(shift, Math.min(1, (a - 30) / 14))) : T(x, a),
  );
  const torso = smooth(pts);
  const chest = smooth([T(-11, 5), T(11, 5), T(12.2, 20), T(12.6, 30), T(15, 38), T(0, 41), T(-15, 38), T(-12.6, 30), T(-12.2, 20)]);
  const legs = leg('R') + leg('L');
  return (
    (layers.back || '') +
    (J.legsFront ? '' : legs) +
    (layers.mid || '') +
    path(capsule(J.neck, J.head, 4.4, 4.2), COL.torso, COL.nearLine) +
    path(torso, segFill(COL.torso, Math.max(H.back * 0.6, 0)), COL.nearLine, 0.9) +
    (H.chest > 0.05 ? path(chest, segFill(COL.torso, H.chest), 'none', 0, ' opacity=".95"') : '') +
    (H.neck > 0.05 ? path(capsule(add(J.shL, mul(J.v, 4)), add(J.shR, mul(J.v, -4)), 4, 4), segFill(COL.torso, H.neck), 'none', 0) : '') +
    `<circle cx="${f1(J.head[0])}" cy="${f1(J.head[1])}" r="${L.headR}" fill="${COL.torso}" stroke="${COL.nearLine}" stroke-width=".9"/>` +
    (J.legsFront ? legs : '') +
    (layers.preArms || '') +
    arm('R') +
    arm('L') +
    (layers.front || '')
  );
}

function drawEndOn(J, H, layers, arm) {
  // тело лёжа, вид со стороны ног: грудная клетка — эллипс, голова — за ней
  const c = add(J.pelvis, mul(J.u, 44));
  const torso = `<ellipse cx="${f1(c[0])}" cy="${f1(c[1])}" rx="21" ry="10" fill="${segFill(COL.torso, H.chest)}" stroke="${COL.nearLine}" stroke-width=".9"/>`;
  const head = `<circle cx="${f1(c[0])}" cy="${f1(c[1] - 10)}" r="8.5" fill="${COL.far}" stroke="${COL.farLine}" stroke-width=".9"/>`;
  const legs = ['R', 'L']
    .map((s) => {
      const sx = s === 'R' ? 1 : -1;
      const knee = add(c, [sx * 15, 14]);
      const foot = add(c, [sx * 24, 46]);
      return path(capsule(knee, foot, 5.4, 3.6), segFill(COL.near, H.shin), COL.nearLine) + `<circle cx="${f1(knee[0])}" cy="${f1(knee[1])}" r="7.4" fill="${segFill(COL.near, H.thigh)}" stroke="${COL.nearLine}" stroke-width=".8"/>`;
    })
    .join('');
  return (layers.back || '') + legs + (layers.mid || '') + head + torso + arm('R') + arm('L') + (layers.front || '');
}

// ------------------------------------------------------------------ инвентарь
// Габариты нарисованного инвентаря собираются для автокадрирования.
export const BB = { on: false, pts: [] };
const track = (x, y, r = 0) => {
  if (BB.on) BB.pts.push([x - r, y - r], [x + r, y + r]);
};

export const EQ = {
  metal: '#2a3342',
  metalLine: '#56657c',
  pad: '#3b4658',
  padLine: '#5c6b82',
  cable: '#9fb0c8',
  accent: '#ff6a5a',
};

export function plate(c, r = 13) {
  track(c[0], c[1], r + 1);
  return `<circle cx="${f1(c[0])}" cy="${f1(c[1])}" r="${r}" fill="#1b222e" stroke="${EQ.metalLine}" stroke-width="2"/><circle cx="${f1(c[0])}" cy="${f1(c[1])}" r="${f1(r * 0.62)}" fill="none" stroke="#2f394a" stroke-width="1.4"/><circle cx="${f1(c[0])}" cy="${f1(c[1])}" r="2.6" fill="#c9d2de"/>`;
}
export function dumbbell(c, r = 5.4) {
  track(c[0], c[1], r + 1);
  return `<circle cx="${f1(c[0])}" cy="${f1(c[1])}" r="${r}" fill="#222a37" stroke="${EQ.metalLine}" stroke-width="1.6"/><circle cx="${f1(c[0])}" cy="${f1(c[1])}" r="1.6" fill="#b9c3d0"/>`;
}
export function kettlebell(c) {
  const b = add(c, [0, 9]);
  track(b[0], b[1], 9);
  return `<path d="M${P(add(c, [-4.5, 4]))}Q${P(add(c, [-5, -3]))} ${P(c)}Q${P(add(c, [5, -3]))} ${P(add(c, [4.5, 4]))}" fill="none" stroke="${EQ.metalLine}" stroke-width="2.2"/><circle cx="${f1(b[0])}" cy="${f1(b[1])}" r="7.6" fill="#222a37" stroke="${EQ.metalLine}" stroke-width="1.6"/>`;
}
export function rect(x, y, w, h, fill = EQ.pad, stroke = EQ.padLine, r = 2.5) {
  track(x, y);
  track(x + w, y + h);
  return `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" rx="${r}" fill="${fill}" stroke="${stroke}" stroke-width="1"/>`;
}
export function line(a, b, stroke = EQ.metalLine, w = 2.4, extra = '') {
  track(a[0], a[1], w);
  track(b[0], b[1], w);
  return `<line x1="${f1(a[0])}" y1="${f1(a[1])}" x2="${f1(b[0])}" y2="${f1(b[1])}" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round"${extra}/>`;
}
export function circle(c, r, fill = EQ.metal, stroke = EQ.metalLine, w = 1.4) {
  track(c[0], c[1], r);
  return `<circle cx="${f1(c[0])}" cy="${f1(c[1])}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${w}"/>`;
}
/** Наклонная накладка (подушка скамьи) от точки a к b толщиной th. */
export function padSeg(a, b, th = 6) {
  track(a[0], a[1], th);
  track(b[0], b[1], th);
  return `<path d="${capsule(a, b, th / 2, th / 2)}" fill="${EQ.pad}" stroke="${EQ.padLine}" stroke-width="1"/>`;
}
/** Горизонтальная скамья: верх подушки на высоте top (над полом), от x1 до x2. */
export function bench(x1, x2, top = 40) {
  return (
    line([x1 + 8, -top + 4], [x1 + 8, 0], EQ.metal, 3.4) +
    line([x2 - 8, -top + 4], [x2 - 8, 0], EQ.metal, 3.4) +
    line([x1 + 2, 0], [x1 + 14, 0], EQ.metalLine, 3) +
    line([x2 - 14, 0], [x2 - 2, 0], EQ.metalLine, 3) +
    rect(x1, -top, x2 - x1, 6.5)
  );
}
export function cableTo(hand, pulley) {
  return line(hand, pulley, EQ.cable, 1.2, ' stroke-dasharray="0"') + circle(pulley, 3.4, '#1e2633', EQ.metalLine, 1.4);
}
export function tower(x, y1 = -205, y2 = 0) {
  return rect(x - 5, y1, 10, y2 - y1, '#1d2430', '#3a475a', 2);
}
export function handle(c) {
  return circle(c, 2.8, EQ.accent, '#ffb3aa', 1);
}
