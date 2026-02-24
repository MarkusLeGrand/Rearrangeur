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
