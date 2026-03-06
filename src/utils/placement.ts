import type { MeubleCatalogue, MeublePlacement, Piece, ElementMur, Point } from '../types';
import {
  polyBounds, pointDansPolygone, rotatedRectCorners, rotatedRectInPoly,
  segCroiseRotatedRect, rotatedRectsOverlap, distPointSegment,
} from './geometry';

// ── Furniture rules ──

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
}

const FURNITURE_RULES: Record<string, FurnitureRule> = {
  // Salon
  canape3:      { role: 'wall', wallAlign: true, facing: 'meubletv' },
  canape2:      { role: 'wall', wallAlign: true, facing: 'meubletv' },
  canapeangle:  { role: 'wall', wallAlign: true, facing: 'meubletv' },
  fauteuil:     { role: 'filler' },
  pouf:         { role: 'filler' },
  tablebasse:   { role: 'satellite', anchorId: 'canape3|canape2|canapeangle', relativePos: 'front', relativeOffset: 40 },
  meubletv:     { role: 'wall', wallAlign: true },
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
  coiffeuse:    { role: 'wall', wallAlign: true },

  // Salle à manger
  table6:       { role: 'anchor', group: 'salle_a_manger' },
  table4:       { role: 'anchor', group: 'salle_a_manger' },
  tableronde:   { role: 'anchor', group: 'salle_a_manger' },
  chaise:       { role: 'satellite', anchorId: 'table6|table4|tableronde', relativePos: 'side', relativeOffset: 10 },
  tabouret:     { role: 'satellite', anchorId: 'table6|table4|tableronde|ilot', relativePos: 'side', relativeOffset: 10 },
  buffet:       { role: 'wall', wallAlign: true },
  vaisselier:   { role: 'wall', wallAlign: true },

  // Bureau
  bureau:       { role: 'anchor', wallAlign: true, needsOutlet: true, group: 'bureau' },
  bureauangle:  { role: 'anchor', wallAlign: true, needsOutlet: true, group: 'bureau' },
  chaisebureau: { role: 'satellite', anchorId: 'bureau|bureauangle', relativePos: 'front', relativeOffset: 60 },
  etagere:      { role: 'wall', wallAlign: true },
  classeur:     { role: 'wall', wallAlign: true },

  // Divers
  canapelit:    { role: 'wall', wallAlign: true },
  tapis:        { role: 'filler' },
  porte_manteaux: { role: 'wall', wallAlign: true },
  meuble_chaussures: { role: 'wall', wallAlign: true },
};

function getRule(id: string): FurnitureRule {
  return FURNITURE_RULES[id] ?? { role: 'filler' };
}

// ── Wall analysis ──

interface WallInfo {
  index: number;
  debut: Point;
  fin: Point;
  angleDeg: number;
  normalX: number;  // interior-pointing normal
  normalY: number;
  length: number;
  freeLength: number;
}

function analyzeWalls(piece: Piece, elementsMur: ElementMur[]): WallInfo[] {
  const centroid = getCentroid(piece.contour);
  return piece.allWalls.map((w, i) => {
    const dx = w.fin.x - w.debut.x, dy = w.fin.y - w.debut.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    const angleDeg = Math.atan2(dy, dx) * 180 / Math.PI;

    // Two possible normals
    const nx1 = -dy / len, ny1 = dx / len;
    const midX = (w.debut.x + w.fin.x) / 2, midY = (w.debut.y + w.fin.y) / 2;
    // Pick normal pointing toward interior (centroid side)
    const dot1 = (centroid.x - midX) * nx1 + (centroid.y - midY) * ny1;
    const normalX = dot1 >= 0 ? nx1 : -nx1;
    const normalY = dot1 >= 0 ? ny1 : -ny1;

    // Free length: total minus doors/windows on this wall
    const elems = elementsMur.filter(e => e.murIndex === i);
    const usedLength = elems.reduce((sum, e) => sum + e.largeur, 0);

    return { index: i, debut: w.debut, fin: w.fin, angleDeg, normalX, normalY, length: len, freeLength: len - usedLength };
  });
}

function getCentroid(poly: Point[]): Point {
  let cx = 0, cy = 0;
  for (const p of poly) { cx += p.x; cy += p.y; }
  return { x: cx / poly.length, y: cy / poly.length };
}

// ── Door zones ──

function buildDoorZones(piece: Piece, elementsMur: ElementMur[]): Point[][] {
  const zones: Point[][] = [];
  for (const el of elementsMur) {
    if (el.type !== 'porte') continue;
    const wall = piece.allWalls[el.murIndex];
    if (!wall) continue;

    const dx = wall.fin.x - wall.debut.x, dy = wall.fin.y - wall.debut.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) continue;

    // Door center on wall
    const doorCx = wall.debut.x + dx * el.position;
    const doorCy = wall.debut.y + dy * el.position;

    // Wall direction unit vector
    const ux = dx / len, uy = dy / len;

    // Interior normal
    const centroid = getCentroid(piece.contour);
    const nx = -uy, ny = ux;
    const midX = (wall.debut.x + wall.fin.x) / 2, midY = (wall.debut.y + wall.fin.y) / 2;
    const dot = (centroid.x - midX) * nx + (centroid.y - midY) * ny;
    const inx = dot >= 0 ? nx : -nx, iny = dot >= 0 ? ny : -ny;

    // Rectangle: doorWidth along wall, 90cm deep into interior
    const halfW = el.largeur / 2;
    const depth = 90;
    const corners: Point[] = [
      { x: doorCx - ux * halfW, y: doorCy - uy * halfW },
      { x: doorCx + ux * halfW, y: doorCy + uy * halfW },
      { x: doorCx + ux * halfW + inx * depth, y: doorCy + uy * halfW + iny * depth },
      { x: doorCx - ux * halfW + inx * depth, y: doorCy - uy * halfW + iny * depth },
    ];
    zones.push(corners);
  }
  return zones;
}

// ── Outlet positions ──

function findOutlets(fixes: MeublePlacement[]): Point[] {
  return fixes
    .filter(f => f.catalogueId === 'prisecourant')
    .map(f => ({ x: f.x + f.largeur / 2, y: f.y + f.hauteur / 2 }));
}

// ── Placement validation ──

interface PlacedItem {
  cx: number; cy: number; w: number; h: number; angleDeg: number;
  corners: Point[];
  catalogueId: string;
}

function toPlacedItem(m: MeublePlacement): PlacedItem {
  const cx = m.x + m.largeur / 2, cy = m.y + m.hauteur / 2;
  const corners = rotatedRectCorners(cx, cy, m.largeur, m.hauteur, m.rotation);
  return { cx, cy, w: m.largeur, h: m.hauteur, angleDeg: m.rotation, corners, catalogueId: m.catalogueId };
}

function positionValide(
  cx: number, cy: number, w: number, h: number, angleDeg: number,
  piece: Piece, placed: PlacedItem[], doorZones: Point[][]
): boolean {
  // 1. All corners inside polygon
  if (!rotatedRectInPoly(cx, cy, w, h, angleDeg, piece.contour)) return false;

  const corners = rotatedRectCorners(cx, cy, w, h, angleDeg);

  // 2. Does not cross any wall
  for (const wall of piece.allWalls) {
    if (segCroiseRotatedRect(wall.debut, wall.fin, corners, 3)) return false;
  }

  // 3. No collision with placed items
  for (const p of placed) {
    if (rotatedRectsOverlap(corners, p.corners, 8)) return false;
  }

  // 4. Not in door zone
  for (const dz of doorZones) {
    if (rotatedRectsOverlap(corners, dz, 5)) return false;
  }

  return true;
}

// ── Wall placement helpers ──

function tryPlaceAlongWall(
  meuble: MeubleCatalogue,
  wallInfo: WallInfo,
  piece: Piece,
  placed: PlacedItem[],
  doorZones: Point[][],
  offset = 2,
): { cx: number; cy: number; angleDeg: number } | null {
  const { debut, fin, angleDeg, normalX, normalY, length } = wallInfo;
  if (length < Math.min(meuble.largeur, meuble.hauteur)) return null;

  const dx = fin.x - debut.x, dy = fin.y - debut.y;

  // Try both orientations: largeur along wall, or hauteur along wall
  const orientations = [
    { wAlong: meuble.largeur, wPerp: meuble.hauteur, rot: angleDeg },
    { wAlong: meuble.hauteur, wPerp: meuble.largeur, rot: angleDeg + 90 },
  ];

  for (const { wAlong, wPerp, rot } of orientations) {
    if (wAlong > length) continue;

    // Slide along the wall in steps
    const step = 10;
    const startT = (wAlong / 2) / length;
    const endT = 1 - startT;
    const positions: number[] = [];
    for (let t = startT; t <= endT; t += step / length) positions.push(t);

    // Shuffle positions for variety
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }

    for (const t of positions) {
      const wallPtX = debut.x + dx * t;
      const wallPtY = debut.y + dy * t;
      // Center of meuble: offset from wall toward interior
      const cx = wallPtX + normalX * (wPerp / 2 + offset);
      const cy = wallPtY + normalY * (wPerp / 2 + offset);
      const normRot = ((rot % 360) + 360) % 360;

      if (positionValide(cx, cy, meuble.largeur, meuble.hauteur, normRot, piece, placed, doorZones)) {
        return { cx, cy, angleDeg: normRot };
      }
    }
  }

  return null;
}

function scoreWallPosition(
  cx: number, cy: number,
  outlets: Point[],
  needsOutlet: boolean
): number {
  let score = 0;
  if (needsOutlet && outlets.length > 0) {
    const minDist = Math.min(...outlets.map(o => Math.sqrt((o.x - cx) ** 2 + (o.y - cy) ** 2)));
    score -= minDist; // closer to outlet = higher score (less negative)
    if (minDist < 100) score += 500; // bonus for being within 1m
  }
  return score;
}

// ── Satellite placement ──

function placeSatellite(
  meuble: MeubleCatalogue,
  rule: FurnitureRule,
  anchor: PlacedItem,
  piece: Piece,
  placed: PlacedItem[],
  doorZones: Point[][]
): { cx: number; cy: number; angleDeg: number } | null {
  const anchorRad = anchor.angleDeg * Math.PI / 180;
  const cos = Math.cos(anchorRad), sin = Math.sin(anchorRad);

  // Anchor's local axes
  const rightX = cos, rightY = sin;     // along anchor's width
  const frontX = -sin, frontY = cos;     // perpendicular to anchor (front = away from wall)

  const positions: Array<{ cx: number; cy: number; rot: number }> = [];

  if (rule.relativePos === 'side') {
    // Place on left and right sides of anchor
    const offsetAlongSide = rule.relativeOffset ?? 0;
    for (const side of [1, -1]) {
      const cx = anchor.cx + rightX * (anchor.w / 2 + meuble.largeur / 2 + offsetAlongSide) * side;
      const cy = anchor.cy + rightY * (anchor.w / 2 + meuble.largeur / 2 + offsetAlongSide) * side;
      positions.push({ cx, cy, rot: anchor.angleDeg });
    }
  } else if (rule.relativePos === 'front') {
    const offset = rule.relativeOffset ?? 60;
    const cx = anchor.cx + frontX * (anchor.h / 2 + meuble.hauteur / 2 + offset);
    const cy = anchor.cy + frontY * (anchor.h / 2 + meuble.hauteur / 2 + offset);
    positions.push({ cx, cy, rot: anchor.angleDeg });
    // Also try rotated 180° (facing anchor)
    positions.push({ cx, cy, rot: (anchor.angleDeg + 180) % 360 });
  } else if (rule.relativePos === 'behind') {
    const offset = rule.relativeOffset ?? 10;
    const cx = anchor.cx - frontX * (anchor.h / 2 + meuble.hauteur / 2 + offset);
    const cy = anchor.cy - frontY * (anchor.h / 2 + meuble.hauteur / 2 + offset);
    positions.push({ cx, cy, rot: anchor.angleDeg });
  }

  for (const pos of positions) {
    const normRot = ((pos.rot % 360) + 360) % 360;
    if (positionValide(pos.cx, pos.cy, meuble.largeur, meuble.hauteur, normRot, piece, placed, doorZones)) {
      return { cx: pos.cx, cy: pos.cy, angleDeg: normRot };
    }
  }
  return null;
}

// ── Chair placement around tables ──

function placeChairsAroundTable(
  meuble: MeubleCatalogue,
  anchor: PlacedItem,
  piece: Piece,
  placed: PlacedItem[],
  doorZones: Point[][]
): { cx: number; cy: number; angleDeg: number } | null {
  const rad = anchor.angleDeg * Math.PI / 180;
  const cos = Math.cos(rad), sin = Math.sin(rad);

  // Try all 4 sides of the table
  const sides: Array<{ dx: number; dy: number; rot: number }> = [
    { dx: 0, dy: -(anchor.h / 2 + meuble.hauteur / 2 + 10), rot: 0 },     // top
    { dx: 0, dy: (anchor.h / 2 + meuble.hauteur / 2 + 10), rot: 180 },     // bottom
    { dx: -(anchor.w / 2 + meuble.largeur / 2 + 10), dy: 0, rot: 90 },     // left
    { dx: (anchor.w / 2 + meuble.largeur / 2 + 10), dy: 0, rot: 270 },     // right
  ];

  // Shuffle sides for variety
  for (let i = sides.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [sides[i], sides[j]] = [sides[j], sides[i]];
  }

  for (const side of sides) {
    // Rotate offset by anchor's rotation
    const rx = side.dx * cos - side.dy * sin;
    const ry = side.dx * sin + side.dy * cos;
    const cx = anchor.cx + rx;
    const cy = anchor.cy + ry;
    const rot = ((anchor.angleDeg + side.rot) % 360 + 360) % 360;

    if (positionValide(cx, cy, meuble.largeur, meuble.hauteur, rot, piece, placed, doorZones)) {
      return { cx, cy, angleDeg: rot };
    }
  }
  return null;
}

// ── Free-space placement ──

function placeFreeSpace(
  meuble: MeubleCatalogue,
  piece: Piece,
  placed: PlacedItem[],
  doorZones: Point[][],
  walls: WallInfo[],
  preferWall: boolean,
): { cx: number; cy: number; angleDeg: number } | null {
  const bounds = polyBounds(piece.contour);

  // Collect rotation angles to try: wall angles + cardinal
  const angles = new Set<number>();
  for (const w of walls) {
    angles.add(((Math.round(w.angleDeg) % 360) + 360) % 360);
    angles.add(((Math.round(w.angleDeg) + 90) % 360 + 360) % 360);
  }
  [0, 90, 180, 270].forEach(a => angles.add(a));
  const rotations = [...angles];

  // Try wall-aligned positions first if preferred
  if (preferWall) {
    // Shuffle walls for variety
    const shuffledWalls = [...walls];
    for (let i = shuffledWalls.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledWalls[i], shuffledWalls[j]] = [shuffledWalls[j], shuffledWalls[i]];
    }

    for (const w of shuffledWalls) {
      const result = tryPlaceAlongWall(meuble, w, piece, placed, doorZones);
      if (result) return result;
    }
  }

  // Random placement attempts
  const MAX = 300;
  const rw = bounds.maxX - bounds.minX, rh = bounds.maxY - bounds.minY;
  for (let i = 0; i < MAX; i++) {
    const rot = rotations[Math.floor(Math.random() * rotations.length)];
    const cx = bounds.minX + meuble.largeur / 2 + Math.random() * Math.max(0, rw - meuble.largeur);
    const cy = bounds.minY + meuble.hauteur / 2 + Math.random() * Math.max(0, rh - meuble.hauteur);
    const snappedCx = Math.round(cx / 5) * 5;
    const snappedCy = Math.round(cy / 5) * 5;

    if (positionValide(snappedCx, snappedCy, meuble.largeur, meuble.hauteur, rot, piece, placed, doorZones)) {
      return { cx: snappedCx, cy: snappedCy, angleDeg: rot };
    }
  }

  // Grid fallback
  for (const rot of rotations) {
    for (let cy = bounds.minY + meuble.hauteur / 2 + 5; cy + meuble.hauteur / 2 <= bounds.maxY - 5; cy += 10) {
      for (let cx = bounds.minX + meuble.largeur / 2 + 5; cx + meuble.largeur / 2 <= bounds.maxX - 5; cx += 10) {
        if (positionValide(cx, cy, meuble.largeur, meuble.hauteur, rot, piece, placed, doorZones)) {
          return { cx, cy, angleDeg: rot };
        }
      }
    }
  }

  return null;
}

// ── Facing resolution ──

function resolveFacing(
  placements: Map<string, { meuble: MeubleCatalogue; pos: { cx: number; cy: number; angleDeg: number } }>,
  piece: Piece,
  placed: PlacedItem[],
  doorZones: Point[][]
): void {
  for (const [id, data] of placements) {
    const rule = getRule(id);
    if (!rule.facing) continue;
    const target = placements.get(rule.facing);
    if (!target) continue;

    // Angle from this meuble to its facing target
    const desiredAngle = Math.atan2(
      target.pos.cy - data.pos.cy,
      target.pos.cx - data.pos.cx
    ) * 180 / Math.PI;

    // Try rotating to face the target
    const normRot = ((Math.round(desiredAngle) % 360) + 360) % 360;

    // Remove self from placed to validate
    const othersPlaced = placed.filter(p => p.catalogueId !== id);

    if (positionValide(data.pos.cx, data.pos.cy, data.meuble.largeur, data.meuble.hauteur, normRot, piece, othersPlaced, doorZones)) {
      // Update in place
      data.pos.angleDeg = normRot;
      // Update in placed array too
      const idx = placed.findIndex(p => p.catalogueId === id);
      if (idx >= 0) {
        placed[idx].angleDeg = normRot;
        placed[idx].corners = rotatedRectCorners(data.pos.cx, data.pos.cy, data.meuble.largeur, data.meuble.hauteur, normRot);
      }
    }
  }
}

// ── Circulation check (simplified BFS) ──

function checkCirculation(
  piece: Piece,
  placed: PlacedItem[],
  _doorZones: Point[][],
  elementsMur: ElementMur[]
): string[] {
  // Build occupancy grid (10cm cells)
  const bounds = polyBounds(piece.contour);
  const cellSize = 10;
  const cols = Math.ceil((bounds.maxX - bounds.minX) / cellSize);
  const rows = Math.ceil((bounds.maxY - bounds.minY) / cellSize);

  if (cols <= 0 || rows <= 0 || cols * rows > 100000) return []; // too large, skip

  const grid = new Uint8Array(cols * rows); // 0 = free, 1 = blocked

  // Mark cells outside polygon or occupied by furniture as blocked
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const px = bounds.minX + (c + 0.5) * cellSize;
      const py = bounds.minY + (r + 0.5) * cellSize;
      if (!pointDansPolygone({ x: px, y: py }, piece.contour)) {
        grid[r * cols + c] = 1;
        continue;
      }
      // Check walls
      for (const w of piece.allWalls) {
        if (distPointSegment({ x: px, y: py }, w.debut, w.fin) < cellSize) {
          grid[r * cols + c] = 1;
          break;
        }
      }
    }
  }

  // Mark cells occupied by placed furniture (with 30cm margin for circulation)
  const circMargin = 30; // 30cm each side = 60cm passage
  for (const p of placed) {
    const expandedCorners = rotatedRectCorners(p.cx, p.cy, p.w + circMargin, p.h + circMargin, p.angleDeg);
    const eMinX = Math.min(...expandedCorners.map(c => c.x));
    const eMinY = Math.min(...expandedCorners.map(c => c.y));
    const eMaxX = Math.max(...expandedCorners.map(c => c.x));
    const eMaxY = Math.max(...expandedCorners.map(c => c.y));

    const c0 = Math.max(0, Math.floor((eMinX - bounds.minX) / cellSize));
    const c1 = Math.min(cols - 1, Math.ceil((eMaxX - bounds.minX) / cellSize));
    const r0 = Math.max(0, Math.floor((eMinY - bounds.minY) / cellSize));
    const r1 = Math.min(rows - 1, Math.ceil((eMaxY - bounds.minY) / cellSize));

    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const px = bounds.minX + (c + 0.5) * cellSize;
        const py = bounds.minY + (r + 0.5) * cellSize;
        // Simple check: point inside expanded rect corners (approximate)
        const cp = rotatedRectCorners(p.cx, p.cy, p.w, p.h, p.angleDeg);
        if (isPointInConvex({ x: px, y: py }, cp)) {
          grid[r * cols + c] = 1;
        }
      }
    }
  }

  // Find door positions on the grid
  const doorCells: number[] = [];
  for (const el of elementsMur) {
    if (el.type !== 'porte') continue;
    const wall = piece.allWalls[el.murIndex];
    if (!wall) continue;
    const doorX = wall.debut.x + (wall.fin.x - wall.debut.x) * el.position;
    const doorY = wall.debut.y + (wall.fin.y - wall.debut.y) * el.position;
    const dc = Math.floor((doorX - bounds.minX) / cellSize);
    const dr = Math.floor((doorY - bounds.minY) / cellSize);
    if (dc >= 0 && dc < cols && dr >= 0 && dr < rows) {
      doorCells.push(dr * cols + dc);
    }
  }

  if (doorCells.length === 0) return [];

  // BFS from room center
  const centerC = Math.floor((((bounds.minX + bounds.maxX) / 2) - bounds.minX) / cellSize);
  const centerR = Math.floor((((bounds.minY + bounds.maxY) / 2) - bounds.minY) / cellSize);
  const startCell = centerR * cols + centerC;

  const visited = new Uint8Array(cols * rows);
  const queue: number[] = [];

  if (grid[startCell] === 0) {
    queue.push(startCell);
    visited[startCell] = 1;
  }

  let qi = 0;
  while (qi < queue.length) {
    const cell = queue[qi++];
    const r = Math.floor(cell / cols);
    const c = cell % cols;
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      const ni = nr * cols + nc;
      if (visited[ni] || grid[ni]) continue;
      visited[ni] = 1;
      queue.push(ni);
    }
  }

  // Check which doors are unreachable
  const blockedDoors: string[] = [];
  for (let i = 0; i < doorCells.length; i++) {
    // Check a small area around the door (door might be on a wall cell)
    const dr = Math.floor(doorCells[i] / cols);
    const dc = doorCells[i] % cols;
    let reachable = false;
    for (let rr = -2; rr <= 2 && !reachable; rr++) {
      for (let cc = -2; cc <= 2 && !reachable; cc++) {
        const nr = dr + rr, nc = dc + cc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && visited[nr * cols + nc]) {
          reachable = true;
        }
      }
    }
    if (!reachable) blockedDoors.push(`porte_${i}`);
  }

  return blockedDoors;
}

function isPointInConvex(p: Point, corners: Point[]): boolean {
  const n = corners.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const cross = (corners[j].x - corners[i].x) * (p.y - corners[i].y) -
                  (corners[j].y - corners[i].y) * (p.x - corners[i].x);
    if (cross > 0) return false;
  }
  return true;
}

// ── MeublePlacement builder ──

function buildPlacement(
  meuble: MeubleCatalogue,
  pos: { cx: number; cy: number; angleDeg: number }
): MeublePlacement {
  return {
    catalogueId: meuble.id,
    nom: meuble.nom,
    largeur: meuble.largeur,
    hauteur: meuble.hauteur,
    couleur: meuble.couleur,
    x: pos.cx - meuble.largeur / 2,
    y: pos.cy - meuble.hauteur / 2,
    rotation: pos.angleDeg,
    fixe: false,
  };
}

// ── Main placement function ──

export function genererPlacement(
  meubles: MeubleCatalogue[],
  piece: Piece,
  fixes: MeublePlacement[],
  elementsMur: ElementMur[] = [],
): MeublePlacement[] {
  if (meubles.length === 0) return [];

  // Pre-analysis
  const walls = analyzeWalls(piece, elementsMur);
  const doorZones = buildDoorZones(piece, elementsMur);
  const outlets = findOutlets(fixes);

  // Initialize placed items with fixed elements
  const placed: PlacedItem[] = fixes.map(toPlacedItem);
  // Add door zones as virtual obstacles (already handled in positionValide)

  const result: MeublePlacement[] = [];
  const placementMap = new Map<string, { meuble: MeubleCatalogue; pos: { cx: number; cy: number; angleDeg: number } }>();

  // Classify meubles by role
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

  // Sort each group by area (largest first) with slight randomness
  const sortBySize = (arr: MeubleCatalogue[]) =>
    arr.sort((a, b) => (b.largeur * b.hauteur) - (a.largeur * a.hauteur) + (Math.random() - 0.5) * 2000);

  sortBySize(wallMeubles);
  sortBySize(anchorMeubles);
  sortBySize(fillerMeubles);

  // Helper to commit a placement
  function commitPlacement(meuble: MeubleCatalogue, pos: { cx: number; cy: number; angleDeg: number }) {
    const mp = buildPlacement(meuble, pos);
    result.push(mp);
    placed.push({
      cx: pos.cx, cy: pos.cy, w: meuble.largeur, h: meuble.hauteur,
      angleDeg: pos.angleDeg,
      corners: rotatedRectCorners(pos.cx, pos.cy, meuble.largeur, meuble.hauteur, pos.angleDeg),
      catalogueId: meuble.id,
    });
    placementMap.set(meuble.id, { meuble, pos });
  }

  // ── Phase 1: Wall-aligned meubles ──
  for (const m of wallMeubles) {
    const rule = getRule(m.id);
    // Shuffle walls for variety
    const shuffledWalls = [...walls];
    for (let i = shuffledWalls.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledWalls[i], shuffledWalls[j]] = [shuffledWalls[j], shuffledWalls[i]];
    }

    let bestPos: { cx: number; cy: number; angleDeg: number } | null = null;
    let bestScore = -Infinity;

    for (const w of shuffledWalls) {
      const pos = tryPlaceAlongWall(m, w, piece, placed, doorZones);
      if (pos) {
        const score = scoreWallPosition(pos.cx, pos.cy, outlets, !!rule.needsOutlet) + Math.random() * 100;
        if (score > bestScore) {
          bestScore = score;
          bestPos = pos;
        }
        // For variety, don't always pick the best — accept first valid sometimes
        if (!rule.needsOutlet && Math.random() < 0.5) break;
      }
    }

    if (bestPos) {
      commitPlacement(m, bestPos);
    }
  }

  // ── Phase 2: Anchors ──
  for (const m of anchorMeubles) {
    const rule = getRule(m.id);

    if (rule.wallAlign) {
      // Same as wall placement but with outlet scoring
      const shuffledWalls = [...walls];
      for (let i = shuffledWalls.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledWalls[i], shuffledWalls[j]] = [shuffledWalls[j], shuffledWalls[i]];
      }

      let bestPos: { cx: number; cy: number; angleDeg: number } | null = null;
      let bestScore = -Infinity;

      for (const w of shuffledWalls) {
        const pos = tryPlaceAlongWall(m, w, piece, placed, doorZones);
        if (pos) {
          let score = scoreWallPosition(pos.cx, pos.cy, outlets, !!rule.needsOutlet);
          score += Math.random() * 50;
          if (score > bestScore) {
            bestScore = score;
            bestPos = pos;
          }
        }
      }

      if (bestPos) {
        commitPlacement(m, bestPos);
      } else {
        // Fallback: free-space
        const pos = placeFreeSpace(m, piece, placed, doorZones, walls, false);
        if (pos) commitPlacement(m, pos);
      }
    } else {
      // Place in center of free space (tables, etc.)
      const pos = placeFreeSpace(m, piece, placed, doorZones, walls, false);
      if (pos) commitPlacement(m, pos);
    }
  }

  // ── Phase 3: Satellites ──
  for (const m of satelliteMeubles) {
    const rule = getRule(m.id);
    if (!rule.anchorId) continue;

    // Find placed anchor
    const anchorIds = rule.anchorId.split('|');
    let anchor: PlacedItem | null = null;
    for (const aid of anchorIds) {
      const found = placed.find(p => p.catalogueId === aid);
      if (found) { anchor = found; break; }
    }

    if (!anchor) {
      // Anchor not placed, treat as filler
      fillerMeubles.push(m);
      continue;
    }

    let pos: { cx: number; cy: number; angleDeg: number } | null = null;

    // Special handling for chairs around tables
    if ((m.id === 'chaise' || m.id === 'tabouret') &&
        (anchor.catalogueId === 'table6' || anchor.catalogueId === 'table4' || anchor.catalogueId === 'tableronde')) {
      pos = placeChairsAroundTable(m, anchor, piece, placed, doorZones);
    } else {
      pos = placeSatellite(m, rule, anchor, piece, placed, doorZones);
    }

    if (pos) {
      commitPlacement(m, pos);
    } else {
      // Fallback: free-space
      const freePos = placeFreeSpace(m, piece, placed, doorZones, walls, true);
      if (freePos) commitPlacement(m, freePos);
    }
  }

  // ── Phase 4: Fillers ──
  for (const m of fillerMeubles) {
    const pos = placeFreeSpace(m, piece, placed, doorZones, walls, true);
    if (pos) commitPlacement(m, pos);
  }

  // ── Phase 5: Resolve facing constraints ──
  resolveFacing(placementMap, piece, placed, doorZones);

  // Update result with any facing rotations
  for (const mp of result) {
    const data = placementMap.get(mp.catalogueId);
    if (data) {
      mp.rotation = data.pos.angleDeg;
      mp.x = data.pos.cx - mp.largeur / 2;
      mp.y = data.pos.cy - mp.hauteur / 2;
    }
  }

  // ── Circulation check ──
  const blockedDoors = checkCirculation(piece, placed, doorZones, elementsMur);
  if (blockedDoors.length > 0 && result.length > 0) {
    // Remove the last filler placed and retry once
    for (let i = result.length - 1; i >= 0; i--) {
      const rule = getRule(result[i].catalogueId);
      if (rule.role === 'filler') {
        result.splice(i, 1);
        break;
      }
    }
  }

  return result;
}
