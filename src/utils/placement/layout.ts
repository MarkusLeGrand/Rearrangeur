import type { MeubleCatalogue, MeublePlacement, Piece, ElementMur } from '../../types';
import { rotatedRectCorners } from '../geometry';
import type { PlacedItem, WallInfo, ExclusionZone, ScoreCtx, LayoutItem } from './types';
import { getRule } from './rules';
import { shuffle } from './walls';
import { scoreLayout } from './scoring';
import { positionValide, type Strictness } from './validation';
import {
  tryPlaceAlongWall, tryPlaceBedAgainstWall, placeSatellite,
  placeChairsAroundTable, placeFreeSpace, placeTapisUnderGroup,
} from './strategies';

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

export function toPlacedItem(m: MeublePlacement): PlacedItem {
  const cx = m.x + m.largeur / 2, cy = m.y + m.hauteur / 2;
  return {
    cx, cy, w: m.largeur, h: m.hauteur, angleDeg: m.rotation,
    corners: rotatedRectCorners(cx, cy, m.largeur, m.hauteur, m.rotation),
    catalogueId: m.catalogueId,
  };
}

export function buildPlacement(
  meuble: MeubleCatalogue,
  pos: { cx: number; cy: number; angleDeg: number },
): MeublePlacement {
  return {
    catalogueId: meuble.id, nom: meuble.nom,
    largeur: meuble.largeur, hauteur: meuble.hauteur, couleur: meuble.couleur,
    x: pos.cx - meuble.largeur / 2, y: pos.cy - meuble.hauteur / 2,
    rotation: pos.angleDeg, fixe: false,
  };
}

// Strictness levels to try in order — always place everything
const STRICTNESS_LEVELS: Strictness[] = ['strict', 'relaxed', 'minimal'];

// ═══════════════════════════════════════════════════════════════
// Generate one complete layout (5-phase greedy)
//
// Each piece tries strict rules first. If it can't be placed,
// falls back to relaxed, then minimal. Every piece MUST be placed.
// ═══════════════════════════════════════════════════════════════

export function generateOneLayout(
  meubles: MeubleCatalogue[],
  piece: Piece, fixes: MeublePlacement[],
  elementsMur: ElementMur[],
  walls: WallInfo[], exclusionZones: ExclusionZone[],
  scoreCtx: ScoreCtx,
): LayoutItem[] {

  const placed: PlacedItem[] = fixes.map(toPlacedItem);
  const result: LayoutItem[] = [];

  function commit(meuble: MeubleCatalogue, pos: { cx: number; cy: number; angleDeg: number }) {
    result.push({ meuble, pos });
    placed.push({
      cx: pos.cx, cy: pos.cy, w: meuble.largeur, h: meuble.hauteur,
      angleDeg: pos.angleDeg,
      corners: rotatedRectCorners(pos.cx, pos.cy, meuble.largeur, meuble.hauteur, pos.angleDeg),
      catalogueId: meuble.id,
    });
  }

  function pickBest(
    meuble: MeubleCatalogue,
    candidates: Array<{ cx: number; cy: number; angleDeg: number }>,
  ): { cx: number; cy: number; angleDeg: number } | null {
    if (candidates.length === 0) return null;
    if (candidates.length === 1) return candidates[0];

    let bestScore = -Infinity;
    let bestPos = candidates[0];
    for (const c of candidates) {
      const testItems: LayoutItem[] = [...result.map(r => ({ ...r })), { meuble, pos: c }];
      const s = scoreLayout(testItems, scoreCtx);
      if (s > bestScore) { bestScore = s; bestPos = c; }
    }
    return bestPos;
  }

  // ── Try to place a wall item with progressive fallback ──
  function tryPlaceWall(m: MeubleCatalogue): boolean {
    for (const strictness of STRICTNESS_LEVELS) {
      const allCandidates: Array<{ cx: number; cy: number; angleDeg: number }> = [];
      for (const w of shuffle(walls)) {
        allCandidates.push(...tryPlaceAlongWall(m, w, piece, placed, exclusionZones, walls, elementsMur, strictness));
        if (allCandidates.length >= 5) break;
      }
      // Also try free space if no wall positions found
      if (allCandidates.length === 0) {
        allCandidates.push(...placeFreeSpace(m, piece, placed, exclusionZones, walls, true, elementsMur, strictness));
      }
      const best = pickBest(m, allCandidates);
      if (best) { commit(m, best); return true; }
    }
    return false;
  }

  // ── Try to place an anchor with progressive fallback ──
  function tryPlaceAnchor(m: MeubleCatalogue): boolean {
    const rule = getRule(m.id);
    const isBed = rule.headAgainstWall === true;
    for (const strictness of STRICTNESS_LEVELS) {
      let candidates: Array<{ cx: number; cy: number; angleDeg: number }> = [];

      if (isBed) {
        // Bed: HEAD against wall (perpendicular), not side against wall
        for (const w of shuffle(walls)) {
          candidates.push(...tryPlaceBedAgainstWall(m, w, piece, placed, exclusionZones, walls, elementsMur, strictness));
          if (candidates.length >= 8) break;
        }
      } else if (rule.wallAlign) {
        for (const w of shuffle(walls)) {
          candidates.push(...tryPlaceAlongWall(m, w, piece, placed, exclusionZones, walls, elementsMur, strictness));
          if (candidates.length >= 8) break;
        }
      }

      // If bed placement failed on shuffled walls, try ALL walls more thoroughly
      if (candidates.length === 0 && isBed) {
        for (const w of walls) {
          candidates.push(...tryPlaceBedAgainstWall(m, w, piece, placed, exclusionZones, walls, elementsMur, strictness));
        }
      }
      if (candidates.length === 0) {
        candidates = placeFreeSpace(m, piece, placed, exclusionZones, walls, isBed || !!rule.wallAlign, elementsMur, strictness);
      }
      const best = pickBest(m, candidates);
      if (best) { commit(m, best); return true; }
    }
    return false;
  }

  // ── Try to place a satellite with progressive fallback ──
  function tryPlaceSatelliteItem(m: MeubleCatalogue): boolean {
    const rule = getRule(m.id);
    if (!rule.anchorId) return tryPlaceFiller(m);

    const anchorIds = rule.anchorId.split('|');
    let anchor: PlacedItem | null = null;
    for (const aid of anchorIds) {
      const found = placed.find(p => p.catalogueId === aid);
      if (found) { anchor = found; break; }
    }

    for (const strictness of STRICTNESS_LEVELS) {
      let candidates: Array<{ cx: number; cy: number; angleDeg: number }>;
      if (anchor) {
        if ((m.id === 'chaise' || m.id === 'tabouret') &&
            ['table6', 'table4', 'tableronde'].includes(anchor.catalogueId)) {
          candidates = placeChairsAroundTable(m, anchor, piece, placed, exclusionZones, walls, elementsMur, strictness);
        } else {
          candidates = placeSatellite(m, rule, anchor, piece, placed, exclusionZones, walls, elementsMur, strictness);
        }
      } else {
        candidates = [];
      }

      if (candidates.length === 0) {
        candidates = placeFreeSpace(m, piece, placed, exclusionZones, walls, true, elementsMur, strictness);
      }

      const best = pickBest(m, candidates);
      if (best) { commit(m, best); return true; }
    }
    return false;
  }

  // ── Try to place a filler with progressive fallback ──
  function tryPlaceFiller(m: MeubleCatalogue): boolean {
    const rule = getRule(m.id);
    for (const strictness of STRICTNESS_LEVELS) {
      let candidates: Array<{ cx: number; cy: number; angleDeg: number }>;

      if (rule.underFurniture) {
        const targetIds = rule.underFurniture.split('|');
        candidates = placeTapisUnderGroup(m, placed, piece, exclusionZones, walls, elementsMur, targetIds, strictness);
        if (candidates.length === 0) {
          candidates = placeFreeSpace(m, piece, placed, exclusionZones, walls, true, elementsMur, strictness);
        }
      } else {
        candidates = placeFreeSpace(m, piece, placed, exclusionZones, walls, true, elementsMur, strictness);
      }

      const best = pickBest(m, candidates);
      if (best) { commit(m, best); return true; }
    }
    return false;
  }

  // ── Classify furniture by role ──
  const anchorMeubles: MeubleCatalogue[] = [];
  const wallMeubles: MeubleCatalogue[] = [];
  const satelliteMeubles: MeubleCatalogue[] = [];
  const fillerMeubles: MeubleCatalogue[] = [];

  for (const m of meubles) {
    const rule = getRule(m.id);
    switch (rule.role) {
      case 'anchor': anchorMeubles.push(m); break;
      case 'wall': wallMeubles.push(m); break;
      case 'satellite': satelliteMeubles.push(m); break;
      case 'filler': fillerMeubles.push(m); break;
    }
  }

  // Priority order: biggest items first get the best spots
  // Small random jitter for variety on "Rearranger"
  const sortBySize = (arr: MeubleCatalogue[]) =>
    arr.sort((a, b) => (b.largeur * b.hauteur) - (a.largeur * a.hauteur) + (Math.random() - 0.5) * 500);
  sortBySize(anchorMeubles);
  sortBySize(wallMeubles);
  sortBySize(fillerMeubles);

  // ── Phase 1: ANCHORS FIRST (lits, tables) — most important, best spots ──
  for (const m of anchorMeubles) tryPlaceAnchor(m);

  // ── Phase 2: Wall items (canapes, TV, armoires, biblio) ──
  for (const m of wallMeubles) tryPlaceWall(m);

  // ── Phase 3: Satellites (chevets, chaises, table basse) ──
  for (const m of satelliteMeubles) tryPlaceSatelliteItem(m);

  // ── Phase 4: Fillers (tapis, poufs, fauteuils) ──
  for (const m of fillerMeubles) tryPlaceFiller(m);

  // ── Phase 5: Resolve facing ──
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
    if (positionValide(item.pos.cx, item.pos.cy, item.meuble.largeur, item.meuble.hauteur, normRot, piece, othersPlaced, exclusionZones, item.meuble.id, walls, elementsMur, 'relaxed')) {
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
