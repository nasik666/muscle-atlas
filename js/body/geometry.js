// Геометрия для SVG-фигур: сглаживание контуров, зеркалирование, скругления.

const r1 = (v) => Math.round(v * 10) / 10;

/**
 * Замкнутая гладкая кривая через точки (Catmull-Rom → кубические Безье).
 * Точка вида [x, y, 1] — острый угол (без сглаживания).
 */
export function smoothClosed(pts, k = 0.17) {
  const n = pts.length;
  let d = `M${r1(pts[0][0])} ${r1(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1 = p1[2] ? p1 : [p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k];
    const c2 = p2[2] ? p2 : [p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k];
    d += `C${r1(c1[0])} ${r1(c1[1])} ${r1(c2[0])} ${r1(c2[1])} ${r1(p2[0])} ${r1(p2[1])}`;
  }
  return d + 'Z';
}

/** Незамкнутая гладкая линия через точки. */
export function smoothOpen(pts, k = 0.17) {
  const n = pts.length;
  let d = `M${r1(pts[0][0])} ${r1(pts[0][1])}`;
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(n - 1, i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k];
    const c2 = [p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k];
    d += `C${r1(c1[0])} ${r1(c1[1])} ${r1(c2[0])} ${r1(c2[1])} ${r1(p2[0])} ${r1(p2[1])}`;
  }
  return d;
}

export const CX = 100;

/** Зеркальная копия многоугольника относительно вертикальной оси фигуры. */
export const mirror = (poly) => poly.map(([x, y, c]) => [2 * CX - x, y, c]).reverse();

/**
 * Половина симметричного контура (от точки на оси, вниз по правой стороне,
 * обратно к оси) → полный замкнутый контур.
 */
export function mirrorJoin(half) {
  const back = half.slice(1, -1).reverse().map(([x, y, c]) => [2 * CX - x, y, c]);
  return half.concat(back);
}

/**
 * Многоугольник со скруглёнными углами: у каждой вершины вставляются
 * две точки на расстоянии r вдоль соседних рёбер.
 */
export function rp(poly, r = 2) {
  const out = [];
  const n = poly.length;
  for (let i = 0; i < n; i++) {
    const p = poly[i];
    const a = poly[(i - 1 + n) % n];
    const b = poly[(i + 1) % n];
    const da = Math.hypot(a[0] - p[0], a[1] - p[1]) || 1;
    const db = Math.hypot(b[0] - p[0], b[1] - p[1]) || 1;
    const ra = Math.min(r, da / 2.5);
    const rb = Math.min(r, db / 2.5);
    out.push([p[0] + ((a[0] - p[0]) / da) * ra, p[1] + ((a[1] - p[1]) / da) * ra]);
    out.push([p[0] + ((b[0] - p[0]) / db) * rb, p[1] + ((b[1] - p[1]) / db) * rb]);
  }
  return out;
}
