import type { MeubleCatalogue, Piece } from '../../types';
import type { PlacedItem, WallInfo, ExclusionZone, FurnitureRule } from './types';
import { polyBounds } from '../geometry';
import { positionValide, type Strictness } from './validation';
import { shuffle } from './walls';
import type { ElementMur } from '../../types';

// ═══════════════════════════════════════════════════════════════
// Bed placement — HEAD against wall, bed perpendicular into room
//
// The head is at local (0, +h/2) from center.
// We compute the rotation so head points TOWARD the wall.
// headDir = (-sin(angle), cos(angle)) must equal -normal (toward wall)
// → angle = atan2(normalX, -normalY)
// ═══════════════════════════════════════════════════════════════

export function tryPlaceBedAgainstWall(
  meuble: MeubleCatalogue, wallInfo: WallInfo,
  piece: Piece, placed: PlacedItem[], exclusionZones: ExclusionZone[],
  walls: WallInfo[], elementsMur: ElementMur[],
  strictness: Strictness = 'strict',
): Array<{ cx: number; cy: number; angleDeg: number }> {
  const { debut, fin, normalX, normalY, length } = wallInfo;
  const dx = fin.x - debut.x, dy = fin.y - debut.y;
  const results: Array<{ cx: number; cy: number; angleDeg: number }> = [];

  // Bed width must fit along the wall
  if (length < meuble.largeur) return [];

  // Rotation: head points toward wall (opposite to normal)
  const angleDeg = Math.atan2(normalX, -normalY) * 180 / Math.PI;
  const normRot = ((Math.round(angleDeg) % 360) + 360) % 360;

  // Distance from wall: head 2cm from wall, then half the bed length into the room
  const offset = meuble.hauteur / 2 + 2;

  const step = Math.max(5, Math.min(20, length / 12));
  const startT = (meuble.largeur / 2) / length;
  const endT = 1 - startT;

  // Try center first, then spread outward
  const positions: number[] = [];
  const centerT = (startT + endT) / 2;
  positions.push(centerT);
  for (let off = step / length; off <= (endT - startT) / 2 + 0.01; off += step / length) {
    positions.push(Math.min(endT, centerT + off));
    positions.push(Math.max(startT, centerT - off));
  }

  for (const t of positions) {
    const wallPtX = debut.x + dx * t;
    const wallPtY = debut.y + dy * t;
    const cx = wallPtX + normalX * offset;
    const cy = wallPtY + normalY * offset;

    if (positionValide(cx, cy, meuble.largeur, meuble.hauteur, normRot, piece, placed, exclusionZones, meuble.id, walls, elementsMur, strictness)) {
      results.push({ cx, cy, angleDeg: normRot });
      if (results.length >= 8) return results;
    }
  }
  return results;
}

// ═══════════════════════════════════════════════════════════════
// Wall placement — place furniture flush against a wall
// ═══════════════════════════════════════════════════════════════

export function tryPlaceAlongWall(
  meuble: MeubleCatalogue, wallInfo: WallInfo,
  piece: Piece, placed: PlacedItem[], exclusionZones: ExclusionZone[],
  walls: WallInfo[], elementsMur: ElementMur[],
  strictness: Strictness = 'strict',
  offset = 2,
): Array<{ cx: number; cy: number; angleDeg: number }> {
  const { debut, fin, angleDeg, normalX, normalY, length } = wallInfo;
  if (length < Math.min(meuble.largeur, meuble.hauteur)) return [];
  const dx = fin.x - debut.x, dy = fin.y - debut.y;
  const results: Array<{ cx: number; cy: number; angleDeg: number }> = [];

  const orientations = [
    { wAlong: meuble.largeur, wPerp: meuble.hauteur, rot: angleDeg },
    { wAlong: meuble.hauteur, wPerp: meuble.largeur, rot: angleDeg + 90 },
  ];

  for (const { wAlong, wPerp, rot } of orientations) {
    if (wAlong > length + 5) continue;
    // Adaptive step: smaller for short walls, larger for long walls
    const step = Math.max(5, Math.min(20, length / 15));
    const startT = Math.min(0.5, (wAlong / 2) / length);
    const endT = Math.max(0.5, 1 - startT);
    const positions: number[] = [];

    // Center first, then spread outward (better placements first)
    const centerT = (startT + endT) / 2;
    positions.push(centerT);
    for (let off = step / length; off <= (endT - startT) / 2; off += step / length) {
      positions.push(centerT + off);
      positions.push(centerT - off);
    }
    // Add edge positions
    positions.push(startT, endT);

    for (const t of positions) {
      if (t < startT - 0.01 || t > endT + 0.01) continue;
      const wallPtX = debut.x + dx * t;
      const wallPtY = debut.y + dy * t;
      const cx = wallPtX + normalX * (wPerp / 2 + offset);
      const cy = wallPtY + normalY * (wPerp / 2 + offset);
      const normRot = ((rot % 360) + 360) % 360;
      if (positionValide(cx, cy, meuble.largeur, meuble.hauteur, normRot, piece, placed, exclusionZones, meuble.id, walls, elementsMur, strictness)) {
        results.push({ cx, cy, angleDeg: normRot });
        if (results.length >= 8) return results;
      }
    }
  }
  return results;
}

// ═══════════════════════════════════════════════════════════════
// Satellite placement — relative to anchor
// ═══════════════════════════════════════════════════════════════

export function placeSatellite(
  meuble: MeubleCatalogue, rule: FurnitureRule, anchor: PlacedItem,
  piece: Piece, placed: PlacedItem[], exclusionZones: ExclusionZone[],
  walls: WallInfo[], elementsMur: ElementMur[],
  strictness: Strictness = 'strict',
): Array<{ cx: number; cy: number; angleDeg: number }> {
  const rad = anchor.angleDeg * Math.PI / 180;
  const cos = Math.cos(rad), sin = Math.sin(rad);
  const rightX = cos, rightY = sin;
  const frontX = -sin, frontY = cos;
  const candidates: Array<{ cx: number; cy: number; angleDeg: number }> = [];

  const tryPos = (cx: number, cy: number, rot: number) => {
    const normRot = ((rot % 360) + 360) % 360;
    if (positionValide(cx, cy, meuble.largeur, meuble.hauteur, normRot, piece, placed, exclusionZones, meuble.id, walls, elementsMur, strictness)) {
      candidates.push({ cx, cy, angleDeg: normRot });
    }
  };

  if (rule.relativePos === 'side') {
    const off = rule.relativeOffset ?? 0;
    // Try both sides, also slightly offset along the anchor's length
    for (const side of [1, -1]) {
      const baseCx = anchor.cx + rightX * (anchor.w / 2 + meuble.largeur / 2 + off) * side;
      const baseCy = anchor.cy + rightY * (anchor.w / 2 + meuble.largeur / 2 + off) * side;
      // Aligned with anchor center
      tryPos(baseCx, baseCy, anchor.angleDeg);
      // Shifted toward head of bed (if applicable)
      const shiftCx = baseCx - frontX * (anchor.h / 2 - meuble.hauteur / 2);
      const shiftCy = baseCy - frontY * (anchor.h / 2 - meuble.hauteur / 2);
      tryPos(shiftCx, shiftCy, anchor.angleDeg);
      // Shifted toward foot
      const shift2Cx = baseCx + frontX * (anchor.h / 2 - meuble.hauteur / 2);
      const shift2Cy = baseCy + frontY * (anchor.h / 2 - meuble.hauteur / 2);
      tryPos(shift2Cx, shift2Cy, anchor.angleDeg);
    }
  } else if (rule.relativePos === 'front') {
    const off = rule.relativeOffset ?? 50;
    // Try centered in front
    const cx = anchor.cx + frontX * (anchor.h / 2 + meuble.hauteur / 2 + off);
    const cy = anchor.cy + frontY * (anchor.h / 2 + meuble.hauteur / 2 + off);
    tryPos(cx, cy, anchor.angleDeg);
    tryPos(cx, cy, (anchor.angleDeg + 180) % 360);
    // Try slightly left/right of center
    for (const side of [1, -1]) {
      const offCx = cx + rightX * anchor.w * 0.2 * side;
      const offCy = cy + rightY * anchor.w * 0.2 * side;
      tryPos(offCx, offCy, anchor.angleDeg);
    }
  } else if (rule.relativePos === 'behind') {
    const off = rule.relativeOffset ?? 10;
    const cx = anchor.cx - frontX * (anchor.h / 2 + meuble.hauteur / 2 + off);
    const cy = anchor.cy - frontY * (anchor.h / 2 + meuble.hauteur / 2 + off);
    tryPos(cx, cy, anchor.angleDeg);
    tryPos(cx, cy, (anchor.angleDeg + 180) % 360);
  }

  return candidates;
}

// ═══════════════════════════════════════════════════════════════
// Chair placement around table
//
// Places chairs on all 4 sides with proper gap (25cm) and
// facing toward table center. For round tables, distributes
// evenly around circumference.
// ═══════════════════════════════════════════════════════════════

export function placeChairsAroundTable(
  meuble: MeubleCatalogue, anchor: PlacedItem,
  piece: Piece, placed: PlacedItem[], exclusionZones: ExclusionZone[],
  walls: WallInfo[], elementsMur: ElementMur[],
  strictness: Strictness = 'strict',
): Array<{ cx: number; cy: number; angleDeg: number }> {
  const rad = anchor.angleDeg * Math.PI / 180;
  const cos = Math.cos(rad), sin = Math.sin(rad);

  const gap = 25; // 25cm between chair and table edge
  const candidates: Array<{ cx: number; cy: number; angleDeg: number }> = [];

  // For round tables, distribute chairs around the circle
  if (anchor.catalogueId === 'tableronde') {
    const radius = Math.max(anchor.w, anchor.h) / 2 + meuble.hauteur / 2 + gap;
    const numPositions = 6; // try 6 positions around circle
    for (let i = 0; i < numPositions; i++) {
      const angle = (i / numPositions) * Math.PI * 2 + rad;
      const cx = anchor.cx + Math.cos(angle) * radius;
      const cy = anchor.cy + Math.sin(angle) * radius;
      // Chair faces table center
      const facingAngle = Math.atan2(anchor.cy - cy, anchor.cx - cx) * 180 / Math.PI;
      const normRot = ((Math.round(facingAngle) % 360) + 360) % 360;
      if (positionValide(cx, cy, meuble.largeur, meuble.hauteur, normRot, piece, placed, exclusionZones, meuble.id, walls, elementsMur, strictness)) {
        candidates.push({ cx, cy, angleDeg: normRot });
      }
    }
    return candidates;
  }

  // For rectangular tables: chairs on 4 sides
  // Each side can have multiple chairs for large tables
  const sides: Array<{ dx: number; dy: number; rot: number; capacity: number }> = [
    // Front (top)
    { dx: 0, dy: -(anchor.h / 2 + meuble.hauteur / 2 + gap), rot: 0, capacity: Math.max(1, Math.floor(anchor.w / (meuble.largeur + 10))) },
    // Back (bottom)
    { dx: 0, dy: (anchor.h / 2 + meuble.hauteur / 2 + gap), rot: 180, capacity: Math.max(1, Math.floor(anchor.w / (meuble.largeur + 10))) },
    // Left
    { dx: -(anchor.w / 2 + meuble.largeur / 2 + gap), dy: 0, rot: 90, capacity: Math.max(1, Math.floor(anchor.h / (meuble.largeur + 10))) },
    // Right
    { dx: (anchor.w / 2 + meuble.largeur / 2 + gap), dy: 0, rot: 270, capacity: Math.max(1, Math.floor(anchor.h / (meuble.largeur + 10))) },
  ];

  for (const side of shuffle(sides)) {
    // Transform offset by anchor rotation
    const rx = side.dx * cos - side.dy * sin;
    const ry = side.dx * sin + side.dy * cos;
    const cx = anchor.cx + rx;
    const cy = anchor.cy + ry;
    const rot = ((anchor.angleDeg + side.rot) % 360 + 360) % 360;

    // For sides with capacity > 1, try multiple positions along the side
    if (side.capacity > 1 && (side.rot === 0 || side.rot === 180)) {
      const spacing = anchor.w / (side.capacity + 1);
      for (let k = 1; k <= side.capacity; k++) {
        const offsetAlong = (k - (side.capacity + 1) / 2) * spacing;
        const offX = cos * offsetAlong;
        const offY = sin * offsetAlong;
        if (positionValide(cx + offX, cy + offY, meuble.largeur, meuble.hauteur, rot, piece, placed, exclusionZones, meuble.id, walls, elementsMur, strictness)) {
          candidates.push({ cx: cx + offX, cy: cy + offY, angleDeg: rot });
        }
      }
    } else {
      if (positionValide(cx, cy, meuble.largeur, meuble.hauteur, rot, piece, placed, exclusionZones, meuble.id, walls, elementsMur, strictness)) {
        candidates.push({ cx, cy, angleDeg: rot });
      }
    }
  }
  return candidates;
}

// ═══════════════════════════════════════════════════════════════
// Free-space placement — random + grid fallback
// ═══════════════════════════════════════════════════════════════

export function placeFreeSpace(
  meuble: MeubleCatalogue, piece: Piece, placed: PlacedItem[],
  exclusionZones: ExclusionZone[], walls: WallInfo[], preferWall: boolean,
  elementsMur: ElementMur[],
  strictness: Strictness = 'strict',
): Array<{ cx: number; cy: number; angleDeg: number }> {
  const bounds = polyBounds(piece.contour);
  const angles = new Set<number>();
  for (const w of walls) {
    angles.add(((Math.round(w.angleDeg) % 360) + 360) % 360);
    angles.add(((Math.round(w.angleDeg) + 90) % 360 + 360) % 360);
  }
  [0, 90, 180, 270].forEach(a => angles.add(a));
  const rotations = [...angles];
  const candidates: Array<{ cx: number; cy: number; angleDeg: number }> = [];

  // Wall-aligned positions first
  if (preferWall) {
    for (const w of shuffle(walls)) {
      const results = tryPlaceAlongWall(meuble, w, piece, placed, exclusionZones, walls, elementsMur, strictness);
      candidates.push(...results);
      if (candidates.length >= 8) return candidates.slice(0, 8);
    }
  }

  // Random positions (more attempts)
  const rw = bounds.maxX - bounds.minX, rh = bounds.maxY - bounds.minY;
  for (let i = 0; i < 300; i++) {
    const rot = rotations[Math.floor(Math.random() * rotations.length)];
    const cx = bounds.minX + meuble.largeur / 2 + Math.random() * Math.max(0, rw - meuble.largeur);
    const cy = bounds.minY + meuble.hauteur / 2 + Math.random() * Math.max(0, rh - meuble.hauteur);
    const snCx = Math.round(cx / 5) * 5, snCy = Math.round(cy / 5) * 5;
    if (positionValide(snCx, snCy, meuble.largeur, meuble.hauteur, rot, piece, placed, exclusionZones, meuble.id, walls, elementsMur, strictness)) {
      candidates.push({ cx: snCx, cy: snCy, angleDeg: rot });
      if (candidates.length >= 8) return candidates.slice(0, 8);
    }
  }

  // Grid fallback with multiple step sizes
  if (candidates.length === 0) {
    for (const gridStep of [25, 15, 10]) {
      for (const rot of rotations) {
        for (let cy = bounds.minY + meuble.hauteur / 2 + 5; cy + meuble.hauteur / 2 <= bounds.maxY - 5; cy += gridStep) {
          for (let cx = bounds.minX + meuble.largeur / 2 + 5; cx + meuble.largeur / 2 <= bounds.maxX - 5; cx += gridStep) {
            if (positionValide(cx, cy, meuble.largeur, meuble.hauteur, rot, piece, placed, exclusionZones, meuble.id, walls, elementsMur, strictness)) {
              candidates.push({ cx, cy, angleDeg: rot });
              if (candidates.length >= 3) return candidates;
            }
          }
        }
      }
      if (candidates.length > 0) return candidates;
    }
  }

  return candidates;
}

// ═══════════════════════════════════════════════════════════════
// Tapis placement — compute bounding box of group and center
// ═══════════════════════════════════════════════════════════════

export function placeTapisUnderGroup(
  meuble: MeubleCatalogue, placed: PlacedItem[],
  piece: Piece, exclusionZones: ExclusionZone[],
  walls: WallInfo[], elementsMur: ElementMur[],
  targetIds: string[],
  strictness: Strictness = 'strict',
): Array<{ cx: number; cy: number; angleDeg: number }> {
  const targets = placed.filter(p => targetIds.includes(p.catalogueId));
  if (targets.length === 0) return [];

  // Compute bounding box of all target furniture
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const t of targets) {
    for (const c of t.corners) {
      if (c.x < minX) minX = c.x;
      if (c.y < minY) minY = c.y;
      if (c.x > maxX) maxX = c.x;
      if (c.y > maxY) maxY = c.y;
    }
  }

  const gcx = (minX + maxX) / 2;
  const gcy = (minY + maxY) / 2;

  // Try centering the tapis on the group with padding
  const candidates: Array<{ cx: number; cy: number; angleDeg: number }> = [];

  // Try main group angle first (from largest target)
  const mainTarget = targets.reduce((a, b) => a.w * a.h > b.w * b.h ? a : b);
  const mainAngle = mainTarget.angleDeg;

  const rotations = [mainAngle, (mainAngle + 90) % 360, 0, 90, 180, 270];
  const uniqueRots = [...new Set(rotations)];

  for (const rot of uniqueRots) {
    if (positionValide(gcx, gcy, meuble.largeur, meuble.hauteur, rot, piece, placed, exclusionZones, meuble.id, walls, elementsMur, strictness)) {
      candidates.push({ cx: gcx, cy: gcy, angleDeg: rot });
    }
    // Try slight offsets if centered doesn't work
    for (const [ox, oy] of [[20, 0], [-20, 0], [0, 20], [0, -20]]) {
      if (positionValide(gcx + ox, gcy + oy, meuble.largeur, meuble.hauteur, rot, piece, placed, exclusionZones, meuble.id, walls, elementsMur, strictness)) {
        candidates.push({ cx: gcx + ox, cy: gcy + oy, angleDeg: rot });
      }
    }
  }

  return candidates;
}
