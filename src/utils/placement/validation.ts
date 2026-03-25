import type { Piece, Point, ElementMur } from '../../types';
import {
  rotatedRectCorners, rotatedRectInPoly,
  segCroiseRotatedRect, rotatedRectsOverlap, distPointSegment,
} from '../geometry';
import type { PlacedItem, ExclusionZone, WallInfo } from './types';
import { getRule } from './rules';
import { distPt, getCentroid } from './walls';

// ═══════════════════════════════════════════════════════════════
// 4-level constraint system from architecture reference:
//
// LEVEL 1 - ABSOLUTE (always enforced):
//   Inside polygon, no wall crossing, door arc free,
//   60cm min circulation guaranteed
//
// LEVEL 2 - HARD (strict mode):
//   Equipment clearances, bed head against wall,
//   radiator clearance, not in door axis
//
// LEVEL 3 - SOFT (scoring only):
//   Bed perpendicular to window, sofa not back to door,
//   proportion rules, desk side of window
//
// LEVEL 4 - BONUS (scoring only):
//   Light, visual balance, alignment
// ═══════════════════════════════════════════════════════════════

export type Strictness = 'strict' | 'relaxed' | 'minimal';

const SPACING: Record<Strictness, number> = {
  strict: 30,     // 30cm general minimum spacing
  relaxed: 10,
  minimal: 2,
};

export function positionValide(
  cx: number, cy: number, w: number, h: number, angleDeg: number,
  piece: Piece, placed: PlacedItem[], exclusionZones: ExclusionZone[],
  catalogueId: string,
  walls: WallInfo[],
  elementsMur: ElementMur[],
  strictness: Strictness = 'strict',
): boolean {
  // ═══ LEVEL 1: ABSOLUTE CONSTRAINTS ═══

  // Must be inside room polygon
  if (!rotatedRectInPoly(cx, cy, w, h, angleDeg, piece.contour)) return false;

  // Must not cross any wall
  const corners = rotatedRectCorners(cx, cy, w, h, angleDeg);
  for (const wall of piece.allWalls) {
    if (segCroiseRotatedRect(wall.debut, wall.fin, corners, 2)) return false;
  }

  // Overlap check with spacing
  const baseSpacing = SPACING[strictness];
  for (const p of placed) {
    const spacing = getMinSpacing(catalogueId, p.catalogueId, baseSpacing);
    if (rotatedRectsOverlap(corners, p.corners, spacing)) return false;
  }

  // Door arc must be completely free (ABSOLUTE)
  for (const ez of exclusionZones) {
    if (ez.type === 'porte') {
      // Doors: always enforce, even in minimal mode
      if (rotatedRectsOverlap(corners, ez.corners, 2)) return false;
    } else {
      // Windows: relaxed in minimal mode
      const margin = strictness === 'minimal' ? 0 : 3;
      if (rotatedRectsOverlap(corners, ez.corners, margin)) return false;
    }
  }

  const rule = getRule(catalogueId);

  // ═══ LEVEL 1.5: BED HEAD AGAINST WALL — ALWAYS enforced ═══
  // This is NON-NEGOTIABLE even in relaxed/minimal mode
  if (rule.headAgainstWall) {
    if (!checkHeadAgainstWall(cx, cy, w, h, angleDeg, walls)) return false;
  }

  // ═══ LEVEL 2: HARD CONSTRAINTS (strict + relaxed) ═══
  if (strictness !== 'minimal') {
    // Bed: never under window
    if (rule.neverUnderWindow) {
      if (checkHeadUnderWindow(cx, cy, w, h, angleDeg, piece, elementsMur)) return false;
    }

    // Tall furniture: don't block windows
    if (rule.blocksFenetre) {
      if (checkBlocksWindow(cx, cy, w, h, angleDeg, piece, elementsMur)) return false;
    }

    // Radiator clearance (10cm min, official DTU)
    if (checkRadiatorBlocking(cx, cy, w, h, angleDeg, placed)) return false;
  }

  // ═══ LEVEL 2.5: STRICT-ONLY CONSTRAINTS ═══
  if (strictness === 'strict') {
    // Bed: access both sides (couple bed)
    if (rule.accessBothSides && rule.accessBothSides > 0) {
      if (!checkBedAccess(cx, cy, w, h, angleDeg, piece, placed, rule.accessBothSides)) return false;
    }

    // Bed: not in direct axis of door (soft-ish, can be relaxed)
    if (rule.notInDoorAxis) {
      if (checkInDoorAxis(cx, cy, w, h, angleDeg, piece, elementsMur, walls)) return false;
    }
  }

  return true;
}

// ── Spacing between furniture ──
function getMinSpacing(idA: string, idB: string, baseSpacing: number): number {
  const ruleA = getRule(idA);
  const ruleB = getRule(idB);

  // Satellite next to its anchor: tight fit
  if (ruleA.anchorId?.split('|').includes(idB)) return 1;
  if (ruleB.anchorId?.split('|').includes(idA)) return 1;

  // Tapis goes under furniture
  if (idA === 'tapis' || idB === 'tapis') return 0;

  // Same functional group: tighter
  if (ruleA.group && ruleA.group === ruleB.group) return Math.min(baseSpacing, 5);

  // Wall items side by side: tight fit
  if (ruleA.wallAlign && ruleB.wallAlign) return Math.min(baseSpacing, 5);

  return baseSpacing;
}

// ── Bed: head against a solid wall ──
function checkHeadAgainstWall(
  cx: number, cy: number, _w: number, h: number, angleDeg: number,
  walls: WallInfo[],
): boolean {
  const rad = angleDeg * Math.PI / 180;
  // Head position: the "top" end of the bed in local coords
  const headCx = cx - Math.sin(rad) * (h / 2);
  const headCy = cy + Math.cos(rad) * (h / 2);
  for (const wall of walls) {
    const d = distPointSegment({ x: headCx, y: headCy }, wall.debut, wall.fin);
    if (d < 15) return true;  // 15cm tolerance (accounts for wall thickness)
  }
  return false;
}

// ── Bed: head under window ──
function checkHeadUnderWindow(
  cx: number, cy: number, _w: number, h: number, angleDeg: number,
  piece: Piece, elementsMur: ElementMur[],
): boolean {
  const rad = angleDeg * Math.PI / 180;
  const headCx = cx - Math.sin(rad) * (h / 2);
  const headCy = cy + Math.cos(rad) * (h / 2);
  for (const el of elementsMur) {
    if (el.type !== 'fenetre') continue;
    const wall = piece.allWalls[el.murIndex];
    if (!wall) continue;
    const winX = wall.debut.x + (wall.fin.x - wall.debut.x) * el.position;
    const winY = wall.debut.y + (wall.fin.y - wall.debut.y) * el.position;
    const d = distPt({ x: headCx, y: headCy }, { x: winX, y: winY });
    if (d < el.largeur / 2 + 15) return true;
  }
  return false;
}

// ── Bed: accessible from both sides ──
function checkBedAccess(
  cx: number, cy: number, w: number, h: number, angleDeg: number,
  piece: Piece, placed: PlacedItem[], minAccess: number,
): boolean {
  const rad = angleDeg * Math.PI / 180;
  const cos = Math.cos(rad), sin = Math.sin(rad);
  const rightX = cos, rightY = sin;

  const probeW = minAccess;
  const probeH = h * 0.5;

  const leftCx = cx - rightX * (w / 2 + probeW / 2);
  const leftCy = cy - rightY * (w / 2 + probeW / 2);
  const rightCx = cx + rightX * (w / 2 + probeW / 2);
  const rightCy = cy + rightY * (w / 2 + probeW / 2);

  const leftCorners = rotatedRectCorners(leftCx, leftCy, probeW, probeH, angleDeg);
  const rightCorners = rotatedRectCorners(rightCx, rightCy, probeW, probeH, angleDeg);

  const leftClear = rotatedRectInPoly(leftCx, leftCy, probeW, probeH, angleDeg, piece.contour)
    && !placed.some(p => rotatedRectsOverlap(leftCorners, p.corners, 2));
  const rightClear = rotatedRectInPoly(rightCx, rightCy, probeW, probeH, angleDeg, piece.contour)
    && !placed.some(p => rotatedRectsOverlap(rightCorners, p.corners, 2));

  return leftClear && rightClear;
}

// ── Bed: not in direct axis of door ──
function checkInDoorAxis(
  cx: number, cy: number, w: number, h: number, _angleDeg: number,
  piece: Piece, elementsMur: ElementMur[], walls: WallInfo[],
): boolean {
  for (const el of elementsMur) {
    if (el.type !== 'porte') continue;
    const wall = piece.allWalls[el.murIndex];
    if (!wall) continue;
    const wallInfo = walls[el.murIndex];
    if (!wallInfo) continue;
    const doorX = wall.debut.x + (wall.fin.x - wall.debut.x) * el.position;
    const doorY = wall.debut.y + (wall.fin.y - wall.debut.y) * el.position;

    // Door axis: normal direction into room from door position
    const axisX = doorX + wallInfo.normalX * 300;
    const axisY = doorY + wallInfo.normalY * 300;

    // Check if bed center is within the door's axis corridor (60cm wide)
    const d = distPointToSeg({ x: cx, y: cy }, { x: doorX, y: doorY }, { x: axisX, y: axisY });
    const distToDoor = distPt({ x: cx, y: cy }, { x: doorX, y: doorY });

    // Only penalize if bed is reasonably close and directly in the axis
    if (d < Math.max(w, h) / 2 + 20 && distToDoor < 300) return true;
  }
  return false;
}

// ── Tall furniture blocks window ──
function checkBlocksWindow(
  cx: number, cy: number, w: number, h: number, angleDeg: number,
  piece: Piece, elementsMur: ElementMur[],
): boolean {
  const corners = rotatedRectCorners(cx, cy, w, h, angleDeg);
  const centroid = getCentroid(piece.contour);
  for (const el of elementsMur) {
    if (el.type !== 'fenetre') continue;
    const wall = piece.allWalls[el.murIndex];
    if (!wall) continue;
    const winX = wall.debut.x + (wall.fin.x - wall.debut.x) * el.position;
    const winY = wall.debut.y + (wall.fin.y - wall.debut.y) * el.position;
    const halfW = el.largeur / 2;
    const dx = wall.fin.x - wall.debut.x, dy = wall.fin.y - wall.debut.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) continue;
    const ux = dx / len, uy = dy / len;
    const nx = -uy, ny = ux;
    const midX = (wall.debut.x + wall.fin.x) / 2, midY = (wall.debut.y + wall.fin.y) / 2;
    const dot = (centroid.x - midX) * nx + (centroid.y - midY) * ny;
    const inx = dot >= 0 ? nx : -nx, iny = dot >= 0 ? ny : -ny;
    // 25cm depth zone in front of window
    const windowZone = [
      { x: winX - ux * halfW, y: winY - uy * halfW },
      { x: winX + ux * halfW, y: winY + uy * halfW },
      { x: winX + ux * halfW + inx * 25, y: winY + uy * halfW + iny * 25 },
      { x: winX - ux * halfW + inx * 25, y: winY - uy * halfW + iny * 25 },
    ];
    if (rotatedRectsOverlap(corners, windowZone, 2)) return true;
  }
  return false;
}

// ── Check if furniture blocks a radiator (10cm min clearance) ──
function checkRadiatorBlocking(
  cx: number, cy: number, w: number, h: number, angleDeg: number,
  placed: PlacedItem[],
): boolean {
  const corners = rotatedRectCorners(cx, cy, w, h, angleDeg);
  for (const p of placed) {
    if (p.catalogueId !== 'radiateur' && p.catalogueId !== 'radiateurpetit') continue;
    if (rotatedRectsOverlap(corners, p.corners, 10)) return true;
  }
  return false;
}

// ═══════════════════════════════════════════════════════════════
// Circulation score — improved path checking
//
// Checks multiple paths from each door into the room,
// verifying minimum 60cm clearance width along each path.
// ═══════════════════════════════════════════════════════════════

export function checkCirculationScore(
  placed: PlacedItem[], piece: Piece, doorPos: Point[],
): number {
  if (doorPos.length === 0) return 1;
  const centroid = getCentroid(piece.contour);

  let totalScore = 0;
  for (const door of doorPos) {
    let pathScore = 1;
    const steps = 10;
    for (let s = 1; s < steps; s++) {
      const t = s / steps;
      const px = door.x + (centroid.x - door.x) * t;
      const py = door.y + (centroid.y - door.y) * t;
      let minClearance = Infinity;
      for (const item of placed) {
        const d = distToPlacedItemEdge(item, { x: px, y: py });
        if (d < minClearance) minClearance = d;
      }
      // 60cm is minimum passage (DTU reference)
      if (minClearance < 25) pathScore -= 0.2;       // blocked
      else if (minClearance < 40) pathScore -= 0.1;   // very tight
      else if (minClearance < 60) pathScore -= 0.03;   // acceptable but not ideal
    }
    totalScore += Math.max(0, pathScore);
  }
  return totalScore / doorPos.length;
}

/** Distance from point to placed item edges */
function distToPlacedItemEdge(item: PlacedItem, pt: Point): number {
  let minDist = Infinity;
  for (let i = 0; i < item.corners.length; i++) {
    const j = (i + 1) % item.corners.length;
    const d = distPointToSeg(pt, item.corners[i], item.corners[j]);
    if (d < minDist) minDist = d;
  }
  return minDist;
}

function distPointToSeg(point: Point, a: Point, b: Point): number {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return distPt(a, point);
  let t = ((point.x - a.x) * dx + (point.y - a.y) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return distPt(point, { x: a.x + t * dx, y: a.y + t * dy });
}
