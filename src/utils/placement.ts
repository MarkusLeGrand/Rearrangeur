import type { MeubleCatalogue, MeublePlacement, Piece, ElementMur, Point } from '../types';
import {
  polyBounds, rotatedRectCorners, rotatedRectInPoly,
  segCroiseRotatedRect, rotatedRectsOverlap, distPointSegment,
} from './geometry';

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

interface PlacedItem {
  cx: number; cy: number; w: number; h: number; angleDeg: number;
  corners: Point[];
  catalogueId: string;
}

interface WallInfo {
  index: number;
  debut: Point; fin: Point;
  angleDeg: number;
  normalX: number; normalY: number; // interior-pointing normal
  length: number;
  freeLength: number;
}

interface FunctionalZone {
  id: string;
  furnitureIds: string[];
  prefer: 'window' | 'door' | 'center' | 'any';
}

interface SAConfig {
  numCandidates: number;
  iterationsPerCandidate: number;
  initialTemp: number;
  coolingRate: number;
}

const SA_CONFIG: SAConfig = {
  numCandidates: 10,
  iterationsPerCandidate: 200,
  initialTemp: 0.3,
  coolingRate: 0.993,
};

// ═══════════════════════════════════════════════════════════════
// Furniture rules
// ═══════════════════════════════════════════════════════════════

type PlacementRole = 'wall' | 'anchor' | 'satellite' | 'filler';

interface FurnitureRule {
  role: PlacementRole;
  wallAlign?: boolean;
  needsOutlet?: boolean;
  group?: string;
  anchorId?: string;
  relativePos?: 'side' | 'front' | 'behind';
  relativeOffset?: number;
  facing?: string;
  prefersLight?: boolean;    // prefers window proximity
  avoidsLight?: boolean;     // avoids window glare (TV)
  nearDoor?: boolean;        // prefers near entrance
}

const RULES: Record<string, FurnitureRule> = {
  // Salon
  canape3:      { role: 'wall', wallAlign: true, facing: 'meubletv', prefersLight: true },
  canape2:      { role: 'wall', wallAlign: true, facing: 'meubletv', prefersLight: true },
  canapeangle:  { role: 'wall', wallAlign: true, facing: 'meubletv', prefersLight: true },
  fauteuil:     { role: 'filler', prefersLight: true },
  pouf:         { role: 'filler' },
  tablebasse:   { role: 'satellite', anchorId: 'canape3|canape2|canapeangle', relativePos: 'front', relativeOffset: 40 },
  meubletv:     { role: 'wall', wallAlign: true, avoidsLight: true },
  biblio:       { role: 'wall', wallAlign: true },
  console:      { role: 'wall', wallAlign: true },
  // Chambre
  litdouble:    { role: 'anchor', wallAlign: true, group: 'chambre' },
  litsimple:    { role: 'anchor', wallAlign: true, group: 'chambre' },
  lit140:       { role: 'anchor', wallAlign: true, group: 'chambre' },
  chevet:       { role: 'satellite', anchorId: 'litdouble|lit140|litsimple', relativePos: 'side', relativeOffset: 0 },
  armoire:      { role: 'wall', wallAlign: true },
  armoire2p:    { role: 'wall', wallAlign: true },
  commode:      { role: 'wall', wallAlign: true },
  coiffeuse:    { role: 'wall', wallAlign: true, prefersLight: true },
  // Salle à manger
  table6:       { role: 'anchor', group: 'salle_a_manger' },
  table4:       { role: 'anchor', group: 'salle_a_manger' },
  tableronde:   { role: 'anchor', group: 'salle_a_manger' },
  chaise:       { role: 'satellite', anchorId: 'table6|table4|tableronde', relativePos: 'side', relativeOffset: 10 },
  tabouret:     { role: 'satellite', anchorId: 'table6|table4|tableronde|ilot', relativePos: 'side', relativeOffset: 10 },
  buffet:       { role: 'wall', wallAlign: true },
  vaisselier:   { role: 'wall', wallAlign: true },
  // Bureau
  bureau:       { role: 'anchor', wallAlign: true, needsOutlet: true, group: 'bureau', prefersLight: true },
  bureauangle:  { role: 'anchor', wallAlign: true, needsOutlet: true, group: 'bureau', prefersLight: true },
  chaisebureau: { role: 'satellite', anchorId: 'bureau|bureauangle', relativePos: 'front', relativeOffset: 60 },
  etagere:      { role: 'wall', wallAlign: true },
  classeur:     { role: 'wall', wallAlign: true },
  // Divers
  canapelit:    { role: 'wall', wallAlign: true },
  tapis:        { role: 'filler' },
  porte_manteaux: { role: 'wall', wallAlign: true, nearDoor: true },
  meuble_chaussures: { role: 'wall', wallAlign: true, nearDoor: true },
};

function getRule(id: string): FurnitureRule {
  return RULES[id] ?? { role: 'filler' };
}

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

function getCentroid(poly: Point[]): Point {
  let cx = 0, cy = 0;
  for (const p of poly) { cx += p.x; cy += p.y; }
  return { x: cx / poly.length, y: cy / poly.length };
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function distPt(a: Point, b: Point): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function toPlacedItem(m: MeublePlacement): PlacedItem {
  const cx = m.x + m.largeur / 2, cy = m.y + m.hauteur / 2;
  return {
    cx, cy, w: m.largeur, h: m.hauteur, angleDeg: m.rotation,
    corners: rotatedRectCorners(cx, cy, m.largeur, m.hauteur, m.rotation),
    catalogueId: m.catalogueId,
  };
}

function buildPlacement(meuble: MeubleCatalogue, pos: { cx: number; cy: number; angleDeg: number }): MeublePlacement {
  return {
    catalogueId: meuble.id, nom: meuble.nom,
    largeur: meuble.largeur, hauteur: meuble.hauteur, couleur: meuble.couleur,
    x: pos.cx - meuble.largeur / 2, y: pos.cy - meuble.hauteur / 2,
    rotation: pos.angleDeg, fixe: false,
  };
}

// ═══════════════════════════════════════════════════════════════
// Wall analysis
// ═══════════════════════════════════════════════════════════════

function analyzeWalls(piece: Piece, elementsMur: ElementMur[]): WallInfo[] {
  const centroid = getCentroid(piece.contour);
  return piece.allWalls.map((w, i) => {
    const dx = w.fin.x - w.debut.x, dy = w.fin.y - w.debut.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    const angleDeg = Math.atan2(dy, dx) * 180 / Math.PI;
    const nx1 = -dy / (len || 1), ny1 = dx / (len || 1);
    const midX = (w.debut.x + w.fin.x) / 2, midY = (w.debut.y + w.fin.y) / 2;
    const dot1 = (centroid.x - midX) * nx1 + (centroid.y - midY) * ny1;
    const normalX = dot1 >= 0 ? nx1 : -nx1;
    const normalY = dot1 >= 0 ? ny1 : -ny1;
    const elems = elementsMur.filter(e => e.murIndex === i);
    const usedLength = elems.reduce((sum, e) => sum + e.largeur, 0);
    return { index: i, debut: w.debut, fin: w.fin, angleDeg, normalX, normalY, length: len, freeLength: len - usedLength };
  });
}

// ═══════════════════════════════════════════════════════════════
// Exclusion zones (doors + windows)
// ═══════════════════════════════════════════════════════════════

function buildExclusionZones(piece: Piece, elementsMur: ElementMur[]): Point[][] {
  const zones: Point[][] = [];
  const centroid = getCentroid(piece.contour);
  for (const el of elementsMur) {
    if (el.type !== 'porte' && el.type !== 'fenetre') continue;
    const wall = piece.allWalls[el.murIndex];
    if (!wall) continue;
    const dx = wall.fin.x - wall.debut.x, dy = wall.fin.y - wall.debut.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) continue;
    const elCx = wall.debut.x + dx * el.position;
    const elCy = wall.debut.y + dy * el.position;
    const ux = dx / len, uy = dy / len;
    const nx = -uy, ny = ux;
    const midX = (wall.debut.x + wall.fin.x) / 2, midY = (wall.debut.y + wall.fin.y) / 2;
    const dot = (centroid.x - midX) * nx + (centroid.y - midY) * ny;
    const inx = dot >= 0 ? nx : -nx, iny = dot >= 0 ? ny : -ny;
    const halfW = el.largeur / 2;
    const depth = el.type === 'porte' ? 90 : 60;
    zones.push([
      { x: elCx - ux * halfW, y: elCy - uy * halfW },
      { x: elCx + ux * halfW, y: elCy + uy * halfW },
      { x: elCx + ux * halfW + inx * depth, y: elCy + uy * halfW + iny * depth },
      { x: elCx - ux * halfW + inx * depth, y: elCy - uy * halfW + iny * depth },
    ]);
  }
  return zones;
}

// ═══════════════════════════════════════════════════════════════
// Window & door positions (for scoring)
// ═══════════════════════════════════════════════════════════════

function getWindowPositions(piece: Piece, elementsMur: ElementMur[]): Point[] {
  return elementsMur
    .filter(e => e.type === 'fenetre')
    .map(e => {
      const w = piece.allWalls[e.murIndex];
      if (!w) return { x: 0, y: 0 };
      return {
        x: w.debut.x + (w.fin.x - w.debut.x) * e.position,
        y: w.debut.y + (w.fin.y - w.debut.y) * e.position,
      };
    });
}

function getDoorPositions(piece: Piece, elementsMur: ElementMur[]): Point[] {
  return elementsMur
    .filter(e => e.type === 'porte')
    .map(e => {
      const w = piece.allWalls[e.murIndex];
      if (!w) return { x: 0, y: 0 };
      return {
        x: w.debut.x + (w.fin.x - w.debut.x) * e.position,
        y: w.debut.y + (w.fin.y - w.debut.y) * e.position,
      };
    });
}

function findOutlets(fixes: MeublePlacement[]): Point[] {
  return fixes
    .filter(f => f.catalogueId === 'prisecourant')
    .map(f => ({ x: f.x + f.largeur / 2, y: f.y + f.hauteur / 2 }));
}

// ═══════════════════════════════════════════════════════════════
// Zone inference
// ═══════════════════════════════════════════════════════════════

function inferZones(meubles: MeubleCatalogue[]): FunctionalZone[] {
  const catMap: Record<string, string[]> = {};
  for (const m of meubles) {
    const cat = m.categorie;
    if (!catMap[cat]) catMap[cat] = [];
    catMap[cat].push(m.id);
  }
  const zones: FunctionalZone[] = [];
  if (catMap['Salon']) zones.push({ id: 'salon', furnitureIds: catMap['Salon'], prefer: 'window' });
  if (catMap['Chambre']) zones.push({ id: 'chambre', furnitureIds: catMap['Chambre'], prefer: 'any' });
  if (catMap['Salle à manger']) zones.push({ id: 'salle_a_manger', furnitureIds: catMap['Salle à manger'], prefer: 'center' });
  if (catMap['Bureau']) zones.push({ id: 'bureau', furnitureIds: catMap['Bureau'], prefer: 'window' });
  if (catMap['Divers']) zones.push({ id: 'divers', furnitureIds: catMap['Divers'], prefer: 'door' });
  return zones;
}


// ═══════════════════════════════════════════════════════════════
// Position validation
// ═══════════════════════════════════════════════════════════════

function positionValide(
  cx: number, cy: number, w: number, h: number, angleDeg: number,
  piece: Piece, placed: PlacedItem[], exclusionZones: Point[][],
  minSpacing = 5,
): boolean {
  if (!rotatedRectInPoly(cx, cy, w, h, angleDeg, piece.contour)) return false;
  const corners = rotatedRectCorners(cx, cy, w, h, angleDeg);
  for (const wall of piece.allWalls) {
    if (segCroiseRotatedRect(wall.debut, wall.fin, corners, 3)) return false;
  }
  for (const p of placed) {
    if (rotatedRectsOverlap(corners, p.corners, minSpacing)) return false;
  }
  for (const dz of exclusionZones) {
    if (rotatedRectsOverlap(corners, dz, 5)) return false;
  }
  return true;
}

// ═══════════════════════════════════════════════════════════════
// Scoring engine
// ═══════════════════════════════════════════════════════════════

interface ScoreCtx {
  piece: Piece;
  walls: WallInfo[];
  windowPos: Point[];
  doorPos: Point[];
  outlets: Point[];
  zones: FunctionalZone[];
  exclusionZones: Point[][];
  elementsMur: ElementMur[];
  roomDiag: number;
}

function buildScoreCtx(
  piece: Piece, elementsMur: ElementMur[], fixes: MeublePlacement[],
  walls: WallInfo[], zones: FunctionalZone[], exclusionZones: Point[][],
): ScoreCtx {
  const b = polyBounds(piece.contour);
  const roomDiag = Math.sqrt((b.maxX - b.minX) ** 2 + (b.maxY - b.minY) ** 2);
  return {
    piece, walls,
    windowPos: getWindowPositions(piece, elementsMur),
    doorPos: getDoorPositions(piece, elementsMur),
    outlets: findOutlets(fixes),
    zones, exclusionZones, elementsMur,
    roomDiag: Math.max(roomDiag, 1),
  };
}

function scoreLayout(
  items: Array<{ meuble: MeubleCatalogue; pos: { cx: number; cy: number; angleDeg: number } }>,
  ctx: ScoreCtx,
): number {
  if (items.length === 0) return 0;

  let sWall = 0;       // wall proximity for wall items
  let sLight = 0;      // window light
  let sGroup = 0;      // functional grouping
  let sSpacing = 0;    // spacing harmony
  let sFacing = 0;     // facing correctness
  let sOutlet = 0;     // outlet proximity
  let sBalance = 0;    // coverage balance
  let sDoor = 0;       // door proximity for entrance items

  let nWall = 0, nLight = 0, nFacing = 0, nOutlet = 0, nDoor = 0;

  // Build lookup for facing
  const posMap = new Map<string, Point>();
  for (const it of items) posMap.set(it.meuble.id, { x: it.pos.cx, y: it.pos.cy });

  // Per-item scores
  for (const it of items) {
    const rule = getRule(it.meuble.id);
    const { cx, cy, angleDeg } = it.pos;

    // Wall proximity: min distance from center to any wall
    if (rule.wallAlign) {
      let minWDist = Infinity;
      for (const w of ctx.walls) {
        const d = distPointSegment({ x: cx, y: cy }, w.debut, w.fin);
        if (d < minWDist) minWDist = d;
      }
      // Ideal: half the perpendicular dimension from wall
      const perpDim = Math.min(it.meuble.largeur, it.meuble.hauteur) / 2;
      const wallErr = Math.abs(minWDist - perpDim - 2);
      sWall += Math.max(0, 1 - wallErr / 50);
      nWall++;
    }

    // Window light
    if ((rule.prefersLight || rule.avoidsLight) && ctx.windowPos.length > 0) {
      const minWinDist = Math.min(...ctx.windowPos.map(w => distPt({ x: cx, y: cy }, w)));
      if (rule.prefersLight) {
        sLight += Math.max(0, 1 - minWinDist / ctx.roomDiag);
      } else {
        // avoidsLight: prefer far from windows
        sLight += Math.min(1, minWinDist / (ctx.roomDiag * 0.5));
      }
      nLight++;
    }

    // Facing
    if (rule.facing) {
      const target = posMap.get(rule.facing);
      if (target) {
        const desiredAngle = Math.atan2(target.y - cy, target.x - cx) * 180 / Math.PI;
        const diff = Math.abs(((angleDeg - desiredAngle + 180) % 360 + 360) % 360 - 180);
        sFacing += Math.max(0, 1 - diff / 90);
        nFacing++;
      }
    }

    // Outlet
    if (rule.needsOutlet && ctx.outlets.length > 0) {
      const minDist = Math.min(...ctx.outlets.map(o => distPt({ x: cx, y: cy }, o)));
      sOutlet += Math.max(0, 1 - minDist / 200);
      nOutlet++;
    }

    // Door proximity for entrance items
    if (rule.nearDoor && ctx.doorPos.length > 0) {
      const minDist = Math.min(...ctx.doorPos.map(d => distPt({ x: cx, y: cy }, d)));
      sDoor += Math.max(0, 1 - minDist / 300);
      nDoor++;
    }
  }

  // Functional grouping: items in same zone should cluster
  for (const zone of ctx.zones) {
    const zoneItems = items.filter(it => zone.furnitureIds.includes(it.meuble.id));
    if (zoneItems.length < 2) continue;
    const zcx = zoneItems.reduce((s, it) => s + it.pos.cx, 0) / zoneItems.length;
    const zcy = zoneItems.reduce((s, it) => s + it.pos.cy, 0) / zoneItems.length;
    let avgDist = 0;
    for (const it of zoneItems) avgDist += distPt({ x: it.pos.cx, y: it.pos.cy }, { x: zcx, y: zcy });
    avgDist /= zoneItems.length;
    sGroup += Math.max(0, 1 - avgDist / (ctx.roomDiag * 0.4));
  }
  const nGroup = ctx.zones.filter(z => items.filter(it => z.furnitureIds.includes(it.meuble.id)).length >= 2).length;

  // Spacing harmony: no items too close (<15cm) or too far apart (>200cm from nearest)
  let spacingSum = 0;
  for (let i = 0; i < items.length; i++) {
    let minNeighborDist = Infinity;
    for (let j = 0; j < items.length; j++) {
      if (i === j) continue;
      const d = distPt({ x: items[i].pos.cx, y: items[i].pos.cy }, { x: items[j].pos.cx, y: items[j].pos.cy });
      if (d < minNeighborDist) minNeighborDist = d;
    }
    if (minNeighborDist < 15) spacingSum += 0.3; // too tight
    else if (minNeighborDist > 300) spacingSum += 0.5; // too isolated
    else spacingSum += 1;
  }
  sSpacing = items.length > 1 ? spacingSum / items.length : 1;

  // Coverage balance: spread of furniture vs room size
  if (items.length > 1) {
    const allCx = items.map(it => it.pos.cx);
    const allCy = items.map(it => it.pos.cy);
    const spreadX = Math.max(...allCx) - Math.min(...allCx);
    const spreadY = Math.max(...allCy) - Math.min(...allCy);
    const b = polyBounds(ctx.piece.contour);
    const roomW = b.maxX - b.minX, roomH = b.maxY - b.minY;
    sBalance = Math.min(1, (spreadX / Math.max(roomW, 1) + spreadY / Math.max(roomH, 1)) / 1.2);
  } else {
    sBalance = 0.5;
  }

  // Weighted sum
  const norm = (v: number, n: number) => n > 0 ? v / n : 0.5;
  return (
    norm(sWall, nWall) * 0.15 +
    norm(sLight, nLight) * 0.12 +
    norm(sGroup, nGroup) * 0.20 +
    sSpacing * 0.15 +
    norm(sFacing, nFacing) * 0.12 +
    norm(sOutlet, nOutlet) * 0.06 +
    sBalance * 0.08 +
    norm(sDoor, nDoor) * 0.05 +
    // Bonus: more items placed = better
    Math.min(1, items.length / 5) * 0.07
  );
}

// ═══════════════════════════════════════════════════════════════
// Wall placement
// ═══════════════════════════════════════════════════════════════

function tryPlaceAlongWall(
  meuble: MeubleCatalogue, wallInfo: WallInfo,
  piece: Piece, placed: PlacedItem[], exclusionZones: Point[][],
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
    if (wAlong > length) continue;
    const step = 10;
    const startT = (wAlong / 2) / length;
    const endT = 1 - startT;
    const positions: number[] = [];
    for (let t = startT; t <= endT; t += step / length) positions.push(t);

    for (const t of shuffle(positions)) {
      const wallPtX = debut.x + dx * t;
      const wallPtY = debut.y + dy * t;
      const cx = wallPtX + normalX * (wPerp / 2 + offset);
      const cy = wallPtY + normalY * (wPerp / 2 + offset);
      const normRot = ((rot % 360) + 360) % 360;
      if (positionValide(cx, cy, meuble.largeur, meuble.hauteur, normRot, piece, placed, exclusionZones)) {
        results.push({ cx, cy, angleDeg: normRot });
        if (results.length >= 5) return results; // cap candidates
      }
    }
  }
  return results;
}

// ═══════════════════════════════════════════════════════════════
// Satellite placement
// ═══════════════════════════════════════════════════════════════

function placeSatellite(
  meuble: MeubleCatalogue, rule: FurnitureRule, anchor: PlacedItem,
  piece: Piece, placed: PlacedItem[], exclusionZones: Point[][],
): Array<{ cx: number; cy: number; angleDeg: number }> {
  const rad = anchor.angleDeg * Math.PI / 180;
  const cos = Math.cos(rad), sin = Math.sin(rad);
  const rightX = cos, rightY = sin;
  const frontX = -sin, frontY = cos;
  const candidates: Array<{ cx: number; cy: number; angleDeg: number }> = [];

  const tryPos = (cx: number, cy: number, rot: number) => {
    const normRot = ((rot % 360) + 360) % 360;
    if (positionValide(cx, cy, meuble.largeur, meuble.hauteur, normRot, piece, placed, exclusionZones)) {
      candidates.push({ cx, cy, angleDeg: normRot });
    }
  };

  if (rule.relativePos === 'side') {
    const off = rule.relativeOffset ?? 0;
    for (const side of [1, -1]) {
      const cx = anchor.cx + rightX * (anchor.w / 2 + meuble.largeur / 2 + off) * side;
      const cy = anchor.cy + rightY * (anchor.w / 2 + meuble.largeur / 2 + off) * side;
      tryPos(cx, cy, anchor.angleDeg);
    }
  } else if (rule.relativePos === 'front') {
    const off = rule.relativeOffset ?? 60;
    const cx = anchor.cx + frontX * (anchor.h / 2 + meuble.hauteur / 2 + off);
    const cy = anchor.cy + frontY * (anchor.h / 2 + meuble.hauteur / 2 + off);
    tryPos(cx, cy, anchor.angleDeg);
    tryPos(cx, cy, (anchor.angleDeg + 180) % 360);
  } else if (rule.relativePos === 'behind') {
    const off = rule.relativeOffset ?? 10;
    const cx = anchor.cx - frontX * (anchor.h / 2 + meuble.hauteur / 2 + off);
    const cy = anchor.cy - frontY * (anchor.h / 2 + meuble.hauteur / 2 + off);
    tryPos(cx, cy, anchor.angleDeg);
  }

  return candidates;
}

function placeChairsAroundTable(
  meuble: MeubleCatalogue, anchor: PlacedItem,
  piece: Piece, placed: PlacedItem[], exclusionZones: Point[][],
): Array<{ cx: number; cy: number; angleDeg: number }> {
  const rad = anchor.angleDeg * Math.PI / 180;
  const cos = Math.cos(rad), sin = Math.sin(rad);
  const sides: Array<{ dx: number; dy: number; rot: number }> = [
    { dx: 0, dy: -(anchor.h / 2 + meuble.hauteur / 2 + 10), rot: 0 },
    { dx: 0, dy: (anchor.h / 2 + meuble.hauteur / 2 + 10), rot: 180 },
    { dx: -(anchor.w / 2 + meuble.largeur / 2 + 10), dy: 0, rot: 90 },
    { dx: (anchor.w / 2 + meuble.largeur / 2 + 10), dy: 0, rot: 270 },
  ];
  const candidates: Array<{ cx: number; cy: number; angleDeg: number }> = [];
  for (const side of shuffle(sides)) {
    const rx = side.dx * cos - side.dy * sin;
    const ry = side.dx * sin + side.dy * cos;
    const cx = anchor.cx + rx;
    const cy = anchor.cy + ry;
    const rot = ((anchor.angleDeg + side.rot) % 360 + 360) % 360;
    if (positionValide(cx, cy, meuble.largeur, meuble.hauteur, rot, piece, placed, exclusionZones)) {
      candidates.push({ cx, cy, angleDeg: rot });
    }
  }
  return candidates;
}

// ═══════════════════════════════════════════════════════════════
// Free-space placement
// ═══════════════════════════════════════════════════════════════

function placeFreeSpace(
  meuble: MeubleCatalogue, piece: Piece, placed: PlacedItem[],
  exclusionZones: Point[][], walls: WallInfo[], preferWall: boolean,
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

  // Wall-aligned positions
  if (preferWall) {
    for (const w of shuffle(walls)) {
      const results = tryPlaceAlongWall(meuble, w, piece, placed, exclusionZones);
      candidates.push(...results);
      if (candidates.length >= 5) return candidates.slice(0, 5);
    }
  }

  // Random positions
  const rw = bounds.maxX - bounds.minX, rh = bounds.maxY - bounds.minY;
  for (let i = 0; i < 200; i++) {
    const rot = rotations[Math.floor(Math.random() * rotations.length)];
    const cx = bounds.minX + meuble.largeur / 2 + Math.random() * Math.max(0, rw - meuble.largeur);
    const cy = bounds.minY + meuble.hauteur / 2 + Math.random() * Math.max(0, rh - meuble.hauteur);
    const snCx = Math.round(cx / 5) * 5, snCy = Math.round(cy / 5) * 5;
    if (positionValide(snCx, snCy, meuble.largeur, meuble.hauteur, rot, piece, placed, exclusionZones)) {
      candidates.push({ cx: snCx, cy: snCy, angleDeg: rot });
      if (candidates.length >= 5) return candidates.slice(0, 5);
    }
  }

  // Grid fallback
  if (candidates.length === 0) {
    for (const rot of rotations) {
      for (let cy = bounds.minY + meuble.hauteur / 2 + 5; cy + meuble.hauteur / 2 <= bounds.maxY - 5; cy += 15) {
        for (let cx = bounds.minX + meuble.largeur / 2 + 5; cx + meuble.largeur / 2 <= bounds.maxX - 5; cx += 15) {
          if (positionValide(cx, cy, meuble.largeur, meuble.hauteur, rot, piece, placed, exclusionZones)) {
            return [{ cx, cy, angleDeg: rot }];
          }
        }
      }
    }
  }

  return candidates;
}

// ═══════════════════════════════════════════════════════════════
// Generate one complete layout (enhanced greedy)
// ═══════════════════════════════════════════════════════════════

function generateOneLayout(
  meubles: MeubleCatalogue[],
  piece: Piece, fixes: MeublePlacement[],
  _elementsMur: ElementMur[],
  walls: WallInfo[], exclusionZones: Point[][],
  scoreCtx: ScoreCtx,
): Array<{ meuble: MeubleCatalogue; pos: { cx: number; cy: number; angleDeg: number } }> {

  const placed: PlacedItem[] = fixes.map(toPlacedItem);
  const result: Array<{ meuble: MeubleCatalogue; pos: { cx: number; cy: number; angleDeg: number } }> = [];

  function commit(meuble: MeubleCatalogue, pos: { cx: number; cy: number; angleDeg: number }) {
    result.push({ meuble, pos });
    placed.push({
      cx: pos.cx, cy: pos.cy, w: meuble.largeur, h: meuble.hauteur,
      angleDeg: pos.angleDeg,
      corners: rotatedRectCorners(pos.cx, pos.cy, meuble.largeur, meuble.hauteur, pos.angleDeg),
      catalogueId: meuble.id,
    });
  }

  // Pick best candidate by incremental scoring
  function pickBest(
    meuble: MeubleCatalogue,
    candidates: Array<{ cx: number; cy: number; angleDeg: number }>,
  ): { cx: number; cy: number; angleDeg: number } | null {
    if (candidates.length === 0) return null;
    if (candidates.length === 1) return candidates[0];

    let bestScore = -Infinity;
    let bestPos = candidates[0];
    for (const c of candidates) {
      const testItems = [...result.map(r => ({ ...r })), { meuble, pos: c }];
      const s = scoreLayout(testItems, scoreCtx);
      if (s > bestScore) { bestScore = s; bestPos = c; }
    }
    return bestPos;
  }

  // Classify
  const wallMeubles: MeubleCatalogue[] = [];
  const anchorMeubles: MeubleCatalogue[] = [];
  const satelliteMeubles: MeubleCatalogue[] = [];
  const fillerMeubles: MeubleCatalogue[] = [];

  for (const m of meubles) {
    const rule = getRule(m.id);
    switch (rule.role) {
      case 'wall': wallMeubles.push(m); break;
      case 'anchor': anchorMeubles.push(m); break;
      case 'satellite': satelliteMeubles.push(m); break;
      case 'filler': fillerMeubles.push(m); break;
    }
  }

  // Sort by area descending with randomness
  const sortBySize = (arr: MeubleCatalogue[]) =>
    arr.sort((a, b) => (b.largeur * b.hauteur) - (a.largeur * a.hauteur) + (Math.random() - 0.5) * 2000);
  sortBySize(wallMeubles);
  sortBySize(anchorMeubles);
  sortBySize(fillerMeubles);

  // Phase 1: Wall items
  for (const m of wallMeubles) {
    const allCandidates: Array<{ cx: number; cy: number; angleDeg: number }> = [];
    for (const w of shuffle(walls)) {
      allCandidates.push(...tryPlaceAlongWall(m, w, piece, placed, exclusionZones));
      if (allCandidates.length >= 5) break;
    }
    const best = pickBest(m, allCandidates);
    if (best) commit(m, best);
  }

  // Phase 2: Anchors
  for (const m of anchorMeubles) {
    const rule = getRule(m.id);
    let candidates: Array<{ cx: number; cy: number; angleDeg: number }> = [];

    if (rule.wallAlign) {
      for (const w of shuffle(walls)) {
        candidates.push(...tryPlaceAlongWall(m, w, piece, placed, exclusionZones));
        if (candidates.length >= 5) break;
      }
    }
    if (candidates.length === 0) {
      candidates = placeFreeSpace(m, piece, placed, exclusionZones, walls, false);
    }

    const best = pickBest(m, candidates);
    if (best) commit(m, best);
  }

  // Phase 3: Satellites
  for (const m of satelliteMeubles) {
    const rule = getRule(m.id);
    if (!rule.anchorId) { fillerMeubles.push(m); continue; }

    const anchorIds = rule.anchorId.split('|');
    let anchor: PlacedItem | null = null;
    for (const aid of anchorIds) {
      const found = placed.find(p => p.catalogueId === aid);
      if (found) { anchor = found; break; }
    }

    if (!anchor) { fillerMeubles.push(m); continue; }

    let candidates: Array<{ cx: number; cy: number; angleDeg: number }>;
    if ((m.id === 'chaise' || m.id === 'tabouret') &&
        ['table6', 'table4', 'tableronde'].includes(anchor.catalogueId)) {
      candidates = placeChairsAroundTable(m, anchor, piece, placed, exclusionZones);
    } else {
      candidates = placeSatellite(m, rule, anchor, piece, placed, exclusionZones);
    }

    if (candidates.length === 0) {
      candidates = placeFreeSpace(m, piece, placed, exclusionZones, walls, true);
    }

    const best = pickBest(m, candidates);
    if (best) commit(m, best);
  }

  // Phase 4: Fillers
  for (const m of fillerMeubles) {
    const candidates = placeFreeSpace(m, piece, placed, exclusionZones, walls, true);
    const best = pickBest(m, candidates);
    if (best) commit(m, best);
  }

  // Phase 5: Resolve facing
  for (const item of result) {
    const rule = getRule(item.meuble.id);
    if (!rule.facing) continue;
    const target = result.find(r => r.meuble.id === rule.facing);
    if (!target) continue;
    const desiredAngle = Math.atan2(
      target.pos.cy - item.pos.cy, target.pos.cx - item.pos.cx,
    ) * 180 / Math.PI;
    const normRot = ((Math.round(desiredAngle) % 360) + 360) % 360;
    const othersPlaced = placed.filter(p => p.catalogueId !== item.meuble.id);
    if (positionValide(item.pos.cx, item.pos.cy, item.meuble.largeur, item.meuble.hauteur, normRot, piece, othersPlaced, exclusionZones)) {
      item.pos.angleDeg = normRot;
      const idx = placed.findIndex(p => p.catalogueId === item.meuble.id);
      if (idx >= 0) {
        placed[idx].angleDeg = normRot;
        placed[idx].corners = rotatedRectCorners(item.pos.cx, item.pos.cy, item.meuble.largeur, item.meuble.hauteur, normRot);
      }
    }
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════
// Simulated annealing optimizer
// ═══════════════════════════════════════════════════════════════

function optimizeLayout(
  layout: Array<{ meuble: MeubleCatalogue; pos: { cx: number; cy: number; angleDeg: number } }>,
  piece: Piece, fixes: MeublePlacement[],
  walls: WallInfo[], exclusionZones: Point[][],
  scoreCtx: ScoreCtx,
  config: SAConfig,
): Array<{ meuble: MeubleCatalogue; pos: { cx: number; cy: number; angleDeg: number } }> {
  if (layout.length === 0) return layout;

  // Deep clone
  let current = layout.map(it => ({ meuble: it.meuble, pos: { ...it.pos } }));
  let currentScore = scoreLayout(current, scoreCtx);

  let best = current.map(it => ({ meuble: it.meuble, pos: { ...it.pos } }));
  let bestScore = currentScore;

  let temp = config.initialTemp;

  // Available rotations from walls
  const wallAngles = new Set<number>();
  for (const w of walls) {
    wallAngles.add(((Math.round(w.angleDeg) % 360) + 360) % 360);
    wallAngles.add(((Math.round(w.angleDeg) + 90) % 360 + 360) % 360);
  }
  [0, 90, 180, 270].forEach(a => wallAngles.add(a));
  const rotations = [...wallAngles];

  for (let iter = 0; iter < config.iterationsPerCandidate; iter++) {
    const idx = Math.floor(Math.random() * current.length);
    const item = current[idx];
    const oldPos = { ...item.pos };

    // Pick perturbation
    const pertType = Math.random();
    if (pertType < 0.5) {
      // Move: shift 10-80cm random direction
      const dist = 10 + Math.random() * 70;
      const angle = Math.random() * Math.PI * 2;
      item.pos.cx = Math.round((item.pos.cx + Math.cos(angle) * dist) / 5) * 5;
      item.pos.cy = Math.round((item.pos.cy + Math.sin(angle) * dist) / 5) * 5;
    } else if (pertType < 0.75) {
      // Rotate
      item.pos.angleDeg = rotations[Math.floor(Math.random() * rotations.length)];
    } else {
      // Nudge to nearest wall
      let bestWallPos: { cx: number; cy: number; angleDeg: number } | null = null;
      let bestWallDist = Infinity;
      for (const w of walls) {
        const d = distPointSegment({ x: item.pos.cx, y: item.pos.cy }, w.debut, w.fin);
        if (d < bestWallDist) {
          bestWallDist = d;
          const perpDim = Math.min(item.meuble.largeur, item.meuble.hauteur) / 2;
          const dx = w.fin.x - w.debut.x, dy = w.fin.y - w.debut.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          if (len === 0) continue;
          const t = Math.max(0, Math.min(1,
            ((item.pos.cx - w.debut.x) * dx + (item.pos.cy - w.debut.y) * dy) / (len * len)));
          const wallPtX = w.debut.x + dx * t;
          const wallPtY = w.debut.y + dy * t;
          bestWallPos = {
            cx: wallPtX + w.normalX * (perpDim + 2),
            cy: wallPtY + w.normalY * (perpDim + 2),
            angleDeg: ((Math.round(w.angleDeg) % 360) + 360) % 360,
          };
        }
      }
      if (bestWallPos) {
        item.pos = bestWallPos;
      }
    }

    // Validate
    const otherPlaced: PlacedItem[] = [
      ...fixes.map(toPlacedItem),
      ...current.filter((_, i) => i !== idx).map(it => ({
        cx: it.pos.cx, cy: it.pos.cy, w: it.meuble.largeur, h: it.meuble.hauteur,
        angleDeg: it.pos.angleDeg,
        corners: rotatedRectCorners(it.pos.cx, it.pos.cy, it.meuble.largeur, it.meuble.hauteur, it.pos.angleDeg),
        catalogueId: it.meuble.id,
      })),
    ];

    if (!positionValide(item.pos.cx, item.pos.cy, item.meuble.largeur, item.meuble.hauteur, item.pos.angleDeg, piece, otherPlaced, exclusionZones)) {
      item.pos = oldPos; // revert
      continue;
    }

    const newScore = scoreLayout(current, scoreCtx);
    const delta = newScore - currentScore;

    if (delta > 0 || Math.random() < Math.exp(delta / temp)) {
      currentScore = newScore;
      if (newScore > bestScore) {
        bestScore = newScore;
        best = current.map(it => ({ meuble: it.meuble, pos: { ...it.pos } }));
      }
    } else {
      item.pos = oldPos; // revert
    }

    temp *= config.coolingRate;
  }

  return best;
}

// ═══════════════════════════════════════════════════════════════
// Main entry point
// ═══════════════════════════════════════════════════════════════

export function genererPlacement(
  meubles: MeubleCatalogue[],
  piece: Piece,
  fixes: MeublePlacement[],
  elementsMur: ElementMur[] = [],
): MeublePlacement[] {
  if (meubles.length === 0) return [];

  const walls = analyzeWalls(piece, elementsMur);
  const exclusionZones = buildExclusionZones(piece, elementsMur);
  const zones = inferZones(meubles);
  const scoreCtx = buildScoreCtx(piece, elementsMur, fixes, walls, zones, exclusionZones);

  let bestLayout: Array<{ meuble: MeubleCatalogue; pos: { cx: number; cy: number; angleDeg: number } }> = [];
  let bestScore = -Infinity;

  // Generate N candidate layouts and optimize each
  for (let i = 0; i < SA_CONFIG.numCandidates; i++) {
    const layout = generateOneLayout(meubles, piece, fixes, elementsMur, walls, exclusionZones, scoreCtx);
    const optimized = optimizeLayout(layout, piece, fixes, walls, exclusionZones, scoreCtx, SA_CONFIG);
    const score = scoreLayout(optimized, scoreCtx);

    if (score > bestScore) {
      bestScore = score;
      bestLayout = optimized;
    }
  }

  return bestLayout.map(it => buildPlacement(it.meuble, it.pos));
}
