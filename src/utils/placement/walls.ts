import type { Piece, ElementMur, MeublePlacement, Point } from '../../types';
import { polyBounds, aire } from '../geometry';
import type { WallInfo, ExclusionZone, FunctionalZone, ScoreCtx } from './types';
import type { MeubleCatalogue } from '../../types';

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

export function getCentroid(poly: Point[]): Point {
  let cx = 0, cy = 0;
  for (const p of poly) { cx += p.x; cy += p.y; }
  return { x: cx / poly.length, y: cy / poly.length };
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function distPt(a: Point, b: Point): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

// ═══════════════════════════════════════════════════════════════
// Wall analysis
// ═══════════════════════════════════════════════════════════════

export function analyzeWalls(piece: Piece, elementsMur: ElementMur[]): WallInfo[] {
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
// Door swing = full arc (largeur of door as radius)
// Windows = 30cm depth (official min for opening)
// ═══════════════════════════════════════════════════════════════

export function buildExclusionZones(piece: Piece, elementsMur: ElementMur[]): ExclusionZone[] {
  const zones: ExclusionZone[] = [];
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
    // Doors: full swing arc clearance. Windows: 30cm (min to open)
    const depth = el.type === 'porte' ? el.largeur : 30;
    zones.push({
      corners: [
        { x: elCx - ux * halfW, y: elCy - uy * halfW },
        { x: elCx + ux * halfW, y: elCy + uy * halfW },
        { x: elCx + ux * halfW + inx * depth, y: elCy + uy * halfW + iny * depth },
        { x: elCx - ux * halfW + inx * depth, y: elCy - uy * halfW + iny * depth },
      ],
      type: el.type,
      depth,
    });
  }
  return zones;
}

// ═══════════════════════════════════════════════════════════════
// Window & door positions
// ═══════════════════════════════════════════════════════════════

export function getWindowPositions(piece: Piece, elementsMur: ElementMur[]): Point[] {
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

export function getWindowWallInfo(
  piece: Piece, elementsMur: ElementMur[], walls: WallInfo[],
): Array<{ pos: Point; wallInfo: WallInfo; largeur: number }> {
  return elementsMur
    .filter(e => e.type === 'fenetre')
    .map(e => {
      const w = piece.allWalls[e.murIndex];
      if (!w) return null;
      return {
        pos: {
          x: w.debut.x + (w.fin.x - w.debut.x) * e.position,
          y: w.debut.y + (w.fin.y - w.debut.y) * e.position,
        },
        wallInfo: walls[e.murIndex],
        largeur: e.largeur,
      };
    })
    .filter((d): d is NonNullable<typeof d> => d !== null);
}

export function getDoorPositions(piece: Piece, elementsMur: ElementMur[]): Point[] {
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

export function getDoorWallInfo(
  piece: Piece, elementsMur: ElementMur[], walls: WallInfo[],
): Array<{ pos: Point; wallInfo: WallInfo; sens: number; largeur: number }> {
  return elementsMur
    .filter(e => e.type === 'porte')
    .map(e => {
      const w = piece.allWalls[e.murIndex];
      if (!w) return null;
      return {
        pos: {
          x: w.debut.x + (w.fin.x - w.debut.x) * e.position,
          y: w.debut.y + (w.fin.y - w.debut.y) * e.position,
        },
        wallInfo: walls[e.murIndex],
        sens: e.sens,
        largeur: e.largeur,
      };
    })
    .filter((d): d is NonNullable<typeof d> => d !== null);
}

export function findOutlets(fixes: MeublePlacement[]): Point[] {
  return fixes
    .filter(f => f.catalogueId === 'prisecourant')
    .map(f => ({ x: f.x + f.largeur / 2, y: f.y + f.hauteur / 2 }));
}

export function findRadiators(fixes: MeublePlacement[]): Point[] {
  return fixes
    .filter(f => f.catalogueId === 'radiateur' || f.catalogueId === 'radiateurpetit')
    .map(f => ({ x: f.x + f.largeur / 2, y: f.y + f.hauteur / 2 }));
}

// ═══════════════════════════════════════════════════════════════
// Zone inference
// ═══════════════════════════════════════════════════════════════

export function inferZones(meubles: MeubleCatalogue[]): FunctionalZone[] {
  const catMap: Record<string, string[]> = {};
  for (const m of meubles) {
    const cat = m.categorie;
    if (!catMap[cat]) catMap[cat] = [];
    if (!catMap[cat].includes(m.id)) catMap[cat].push(m.id);
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
// Infer zones from fixed elements
// ═══════════════════════════════════════════════════════════════

/** Category-to-zone mapping for fixed elements */
const FIX_CATEGORY_TO_ZONE: Record<string, string> = {
  'Cuisine': 'cuisine',
  'Salle de bain': 'sdb',
  // Installations are skipped (no zone)
};

export interface FixZoneCentroid {
  zone: string;
  centroid: Point;
}

/**
 * Groups fixed elements by their catalogue category, maps to zone types,
 * and computes the centroid of each group.
 */
export function inferZonesFromFixes(
  fixes: MeublePlacement[],
): FixZoneCentroid[] {
  // Group fixes by zone type
  const groups: Record<string, Point[]> = {};
  for (const f of fixes) {
    // Look up the fixed catalogue item to get its category
    const catItem = fixedCatalogueMap[f.catalogueId];
    if (!catItem) continue;
    const zone = FIX_CATEGORY_TO_ZONE[catItem];
    if (!zone) continue;
    const center: Point = { x: f.x + f.largeur / 2, y: f.y + f.hauteur / 2 };
    if (!groups[zone]) groups[zone] = [];
    groups[zone].push(center);
  }

  const result: FixZoneCentroid[] = [];
  for (const [zone, points] of Object.entries(groups)) {
    const cx = points.reduce((s, p) => s + p.x, 0) / points.length;
    const cy = points.reduce((s, p) => s + p.y, 0) / points.length;
    result.push({ zone, centroid: { x: cx, y: cy } });
  }
  return result;
}

/** Map catalogueId → category for fixed elements */
const fixedCatalogueMap: Record<string, string> = {
  evier: 'Cuisine', plantravail: 'Cuisine', ilot: 'Cuisine',
  frigo: 'Cuisine', four: 'Cuisine', lavevaisselle: 'Cuisine',
  microondes: 'Cuisine', hotte: 'Cuisine', congelateur: 'Cuisine',
  baignoire: 'Salle de bain', douche: 'Salle de bain', doucheitalienne: 'Salle de bain',
  lavabo: 'Salle de bain', doublevasque: 'Salle de bain', wc: 'Salle de bain',
  lavelinge: 'Salle de bain', sechelinge: 'Salle de bain', secheserviettes: 'Salle de bain',
  radiateur: 'Installations', radiateurpetit: 'Installations',
  prisecourant: 'Installations', interrupteur: 'Installations',
  tableauelectrique: 'Installations', cheminee: 'Installations',
  poele: 'Installations', cumulus: 'Installations', climatiseur: 'Installations',
};

// ═══════════════════════════════════════════════════════════════
// Score context builder
// ═══════════════════════════════════════════════════════════════

export function buildScoreCtx(
  piece: Piece, elementsMur: ElementMur[], fixes: MeublePlacement[],
  walls: WallInfo[], zones: FunctionalZone[], exclusionZones: ExclusionZone[],
): ScoreCtx {
  const b = polyBounds(piece.contour);
  const roomW = b.maxX - b.minX;
  const roomH = b.maxY - b.minY;
  const roomDiag = Math.sqrt(roomW ** 2 + roomH ** 2);
  const roomArea = Math.abs(aire(piece.contour));
  return {
    piece, walls,
    windowPos: getWindowPositions(piece, elementsMur),
    windowWalls: getWindowWallInfo(piece, elementsMur, walls),
    doorPos: getDoorPositions(piece, elementsMur),
    doorWalls: getDoorWallInfo(piece, elementsMur, walls),
    outlets: findOutlets(fixes),
    radiators: findRadiators(fixes),
    zones, exclusionZones, elementsMur,
    roomDiag: Math.max(roomDiag, 1),
    roomArea, roomW, roomH,
    fixZoneCentroids: inferZonesFromFixes(fixes),
  };
}
