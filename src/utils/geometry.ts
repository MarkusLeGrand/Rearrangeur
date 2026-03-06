import type { Point, MeublePlacement } from '../types';

export function snap(v: number, grid: number): number {
  return Math.round(v / grid) * grid;
}

export function dist(a: Point, b: Point): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

export function pointSurSegment(a: Point, b: Point, t: number): Point {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

export function angleSegment(a: Point, b: Point): number {
  return Math.atan2(b.y - a.y, b.x - a.x);
}

export function projeterSur(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return 0;
  return Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
}

export function pointDansPolygone(p: Point, poly: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y;
    const xj = poly[j].x, yj = poly[j].y;
    if ((yi > p.y) !== (yj > p.y) && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi)
      inside = !inside;
  }
  return inside;
}

export function polyBounds(pts: Point[]) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}

export function aire(pts: Point[]): number {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    a += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
  }
  return Math.abs(a) / 2;
}

export function rectsOverlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
  m = 5
): boolean {
  return a.x < b.x + b.w + m && a.x + a.w + m > b.x && a.y < b.y + b.h + m && a.y + a.h + m > b.y;
}

export function meubleBBox(m: MeublePlacement) {
  const w = m.rotation === 90 ? m.hauteur : m.largeur;
  const h = m.rotation === 90 ? m.largeur : m.hauteur;
  return { x: m.x, y: m.y, w, h };
}

export function rectDansPoly(r: { x: number; y: number; w: number; h: number }, poly: Point[]): boolean {
  return [
    { x: r.x, y: r.y }, { x: r.x + r.w, y: r.y },
    { x: r.x + r.w, y: r.y + r.h }, { x: r.x, y: r.y + r.h },
  ].every((c) => pointDansPolygone(c, poly));
}

/** Liang-Barsky: segment P1P2 croise rectangle? */
export function segCroiseRect(
  p1: Point, p2: Point,
  rect: { x: number; y: number; w: number; h: number },
  marge = 5
): boolean {
  const rx = rect.x - marge, ry = rect.y - marge;
  const rw = rect.w + marge * 2, rh = rect.h + marge * 2;
  const dx = p2.x - p1.x, dy = p2.y - p1.y;
  const p = [-dx, dx, -dy, dy];
  const q = [p1.x - rx, rx + rw - p1.x, p1.y - ry, ry + rh - p1.y];
  let tMin = 0, tMax = 1;
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) { if (q[i] < 0) return false; }
    else {
      const t = q[i] / p[i];
      if (p[i] < 0) { if (t > tMax) return false; if (t > tMin) tMin = t; }
      else { if (t < tMin) return false; if (t < tMax) tMax = t; }
    }
  }
  return tMin <= tMax;
}

// ── Rotation-aware geometry ──

/** 4 corners of a rectangle rotated around its center (cx, cy) */
export function rotatedRectCorners(cx: number, cy: number, w: number, h: number, angleDeg: number): Point[] {
  const rad = angleDeg * Math.PI / 180;
  const cos = Math.cos(rad), sin = Math.sin(rad);
  const hw = w / 2, hh = h / 2;
  const offsets: [number, number][] = [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]];
  return offsets.map(([ox, oy]) => ({
    x: cx + ox * cos - oy * sin,
    y: cy + ox * sin + oy * cos,
  }));
}

/** Check all corners of a rotated rect are inside a polygon */
export function rotatedRectInPoly(cx: number, cy: number, w: number, h: number, angleDeg: number, poly: Point[]): boolean {
  const corners = rotatedRectCorners(cx, cy, w, h, angleDeg);
  return corners.every(c => pointDansPolygone(c, poly));
}

/** SAT axes for a convex polygon (edge normals) */
function satAxes(corners: Point[]): Point[] {
  const axes: Point[] = [];
  for (let i = 0; i < corners.length; i++) {
    const j = (i + 1) % corners.length;
    const ex = corners[j].x - corners[i].x;
    const ey = corners[j].y - corners[i].y;
    const len = Math.sqrt(ex * ex + ey * ey);
    if (len > 0) axes.push({ x: -ey / len, y: ex / len });
  }
  return axes;
}

/** Project polygon onto axis, return [min, max] */
function projectPoly(corners: Point[], axis: Point): [number, number] {
  let min = Infinity, max = -Infinity;
  for (const c of corners) {
    const d = c.x * axis.x + c.y * axis.y;
    if (d < min) min = d;
    if (d > max) max = d;
  }
  return [min, max];
}

/** Check if a segment intersects a rotated rectangle (with margin) using SAT */
export function segCroiseRotatedRect(p1: Point, p2: Point, corners: Point[], marge = 3): boolean {
  // Expand corners by margin
  const cx = (corners[0].x + corners[2].x) / 2;
  const cy = (corners[0].y + corners[2].y) / 2;
  const expanded = corners.map(c => ({
    x: cx + (c.x - cx) * (1 + marge / Math.max(1, Math.sqrt((c.x - cx) ** 2 + (c.y - cy) ** 2))),
    y: cy + (c.y - cy) * (1 + marge / Math.max(1, Math.sqrt((c.x - cx) ** 2 + (c.y - cy) ** 2))),
  }));

  // Treat segment as a very thin polygon (two points)
  const segPoly: Point[] = [p1, p2];

  // SAT axes: 4 from rect edges + 1 from segment normal
  const axes = satAxes(expanded);
  const segDx = p2.x - p1.x, segDy = p2.y - p1.y;
  const segLen = Math.sqrt(segDx * segDx + segDy * segDy);
  if (segLen > 0) axes.push({ x: -segDy / segLen, y: segDx / segLen });

  for (const axis of axes) {
    const [rMin, rMax] = projectPoly(expanded, axis);
    const [sMin, sMax] = projectPoly(segPoly, axis);
    if (rMax < sMin || sMax < rMin) return false;
  }
  return true;
}

/** AABB enclosing a rotated rectangle */
export function rotatedRectAABB(cx: number, cy: number, w: number, h: number, angleDeg: number): { x: number; y: number; w: number; h: number } {
  const corners = rotatedRectCorners(cx, cy, w, h, angleDeg);
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const c of corners) {
    if (c.x < minX) minX = c.x;
    if (c.y < minY) minY = c.y;
    if (c.x > maxX) maxX = c.x;
    if (c.y > maxY) maxY = c.y;
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

/** SAT collision between two rotated rectangles (with margin) */
export function rotatedRectsOverlap(cornersA: Point[], cornersB: Point[], marge = 8): boolean {
  // Expand both by margin/2 each for total margin between them
  const halfM = marge / 2;
  function expand(corners: Point[]): Point[] {
    const cx = (corners[0].x + corners[2].x) / 2;
    const cy = (corners[0].y + corners[2].y) / 2;
    return corners.map(c => {
      const dx = c.x - cx, dy = c.y - cy;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d === 0) return c;
      return { x: c.x + dx / d * halfM, y: c.y + dy / d * halfM };
    });
  }
  const eA = expand(cornersA), eB = expand(cornersB);

  const axes = [...satAxes(eA), ...satAxes(eB)];
  for (const axis of axes) {
    const [aMin, aMax] = projectPoly(eA, axis);
    const [bMin, bMax] = projectPoly(eB, axis);
    if (aMax < bMin || bMax < aMin) return false;
  }
  return true;
}

/** Douglas-Peucker polyline simplification */
export function douglasPeucker(points: Point[], epsilon: number): Point[] {
  if (points.length <= 2) return points;
  let maxDist = 0;
  let maxIdx = 0;
  const first = points[0];
  const last = points[points.length - 1];
  for (let i = 1; i < points.length - 1; i++) {
    const d = distPointToLine(points[i], first, last);
    if (d > maxDist) {
      maxDist = d;
      maxIdx = i;
    }
  }
  if (maxDist > epsilon) {
    const left = douglasPeucker(points.slice(0, maxIdx + 1), epsilon);
    const right = douglasPeucker(points.slice(maxIdx), epsilon);
    return [...left.slice(0, -1), ...right];
  }
  return [first, last];
}

function distPointToLine(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.sqrt((p.x - a.x) ** 2 + (p.y - a.y) ** 2);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  const projX = a.x + t * dx, projY = a.y + t * dy;
  return Math.sqrt((p.x - projX) ** 2 + (p.y - projY) ** 2);
}

/** Arc through 3 points → polyline of numSegments segments */
export function arcThroughThreePoints(p1: Point, p2: Point, p3: Point, numSegments = 16): Point[] {
  // Find circumscribed circle center
  const ax = p1.x, ay = p1.y;
  const bx = p2.x, by = p2.y;
  const cx = p3.x, cy = p3.y;
  const D = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
  if (Math.abs(D) < 1e-10) {
    // Collinear — just return the 3 points
    return [p1, p2, p3];
  }
  const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / D;
  const uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / D;
  const r = Math.sqrt((ax - ux) ** 2 + (ay - uy) ** 2);
  // Angles
  let a1 = Math.atan2(ay - uy, ax - ux);
  let a2 = Math.atan2(by - uy, bx - ux);
  let a3 = Math.atan2(cy - uy, cx - ux);
  // Ensure a1 → a2 → a3 is in correct arc direction
  const normalize = (a: number) => { while (a < 0) a += 2 * Math.PI; return a % (2 * Math.PI); };
  a1 = normalize(a1);
  a2 = normalize(a2);
  a3 = normalize(a3);
  // Determine if we go clockwise or counter-clockwise
  let startAngle = a1, endAngle = a3;
  const ccw = normalize(a2 - a1) < normalize(a3 - a1);
  if (!ccw) {
    // Go the other way
    startAngle = a1;
    endAngle = a3;
  }
  let sweep = ccw ? normalize(a3 - a1) : -(2 * Math.PI - normalize(a3 - a1));
  // If midpoint is not in the arc, flip
  const midTest = normalize(a2 - startAngle);
  const sweepNorm = ccw ? normalize(endAngle - startAngle) : 2 * Math.PI - normalize(endAngle - startAngle);
  if (ccw && midTest > sweepNorm) sweep = -(2 * Math.PI - sweepNorm);
  else if (!ccw && midTest < sweepNorm) sweep = 2 * Math.PI - sweepNorm;

  const pts: Point[] = [];
  for (let i = 0; i <= numSegments; i++) {
    const t = i / numSegments;
    const angle = startAngle + sweep * t;
    pts.push({
      x: snap(ux + r * Math.cos(angle), 1),
      y: snap(uy + r * Math.sin(angle), 1),
    });
  }
  return pts;
}

/** Distance from point p to segment [a, b] */
export function distPointSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.sqrt((p.x - a.x) ** 2 + (p.y - a.y) ** 2);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  const projX = a.x + t * dx, projY = a.y + t * dy;
  return Math.sqrt((p.x - projX) ** 2 + (p.y - projY) ** 2);
}
