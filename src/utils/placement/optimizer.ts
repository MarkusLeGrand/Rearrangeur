import type { MeublePlacement, Piece } from '../../types';
import { rotatedRectCorners, distPointSegment } from '../geometry';
import type { PlacedItem, WallInfo, ExclusionZone, SAConfig, ScoreCtx, LayoutItem } from './types';
import { scoreLayout, type ScoreWeights } from './scoring';
import { positionValide } from './validation';
import { toPlacedItem } from './layout';
import { getRule } from './rules';
import type { ElementMur } from '../../types';

// ═══════════════════════════════════════════════════════════════
// Simulated annealing optimizer
//
// Perturbation types:
// - Move (40%): shift proportional to furniture size
// - Rotate (15%): pick random wall-aligned rotation
// - Nudge to wall (20%): snap to nearest wall at ideal distance
// - Swap (10%): swap positions of two furniture items
// - Group move (15%): move satellite with its anchor
// ═══════════════════════════════════════════════════════════════

export function optimizeLayout(
  layout: LayoutItem[],
  piece: Piece, fixes: MeublePlacement[],
  walls: WallInfo[], exclusionZones: ExclusionZone[],
  scoreCtx: ScoreCtx,
  config: SAConfig,
  elementsMur: ElementMur[],
  scoreWeights?: ScoreWeights,
): LayoutItem[] {
  if (layout.length === 0) return layout;

  let current = layout.map(it => ({ meuble: it.meuble, pos: { ...it.pos } }));
  let currentScore = scoreLayout(current, scoreCtx, scoreWeights);

  let best = current.map(it => ({ meuble: it.meuble, pos: { ...it.pos } }));
  let bestScore = currentScore;

  let temp = config.initialTemp;

  // Available rotations from walls
  const wallAngles = new Set<number>();
  for (const w of walls) {
    wallAngles.add(((Math.round(w.angleDeg) % 360) + 360) % 360);
    wallAngles.add(((Math.round(w.angleDeg) + 90) % 360 + 360) % 360);
    wallAngles.add(((Math.round(w.angleDeg) + 180) % 360 + 360) % 360);
    wallAngles.add(((Math.round(w.angleDeg) + 270) % 360 + 360) % 360);
  }
  [0, 90, 180, 270].forEach(a => wallAngles.add(a));
  const rotations = [...wallAngles];

  const fixedPlaced = fixes.map(toPlacedItem);

  for (let iter = 0; iter < config.iterationsPerCandidate; iter++) {
    const pertType = Math.random();
    const saved: Array<{ idx: number; pos: { cx: number; cy: number; angleDeg: number } }> = [];

    if (pertType < 0.40) {
      // ── Move: shift proportional to furniture size ──
      const idx = Math.floor(Math.random() * current.length);
      const item = current[idx];
      saved.push({ idx, pos: { ...item.pos } });

      const size = Math.max(item.meuble.largeur, item.meuble.hauteur);
      // Smaller moves as temperature decreases
      const maxDist = Math.max(10, size * 0.8 * (temp / config.initialTemp));
      const dist = 5 + Math.random() * maxDist;
      const angle = Math.random() * Math.PI * 2;
      item.pos.cx = Math.round((item.pos.cx + Math.cos(angle) * dist) / 5) * 5;
      item.pos.cy = Math.round((item.pos.cy + Math.sin(angle) * dist) / 5) * 5;

    } else if (pertType < 0.55) {
      // ── Rotate ──
      const idx = Math.floor(Math.random() * current.length);
      saved.push({ idx, pos: { ...current[idx].pos } });
      current[idx].pos.angleDeg = rotations[Math.floor(Math.random() * rotations.length)];

    } else if (pertType < 0.75) {
      // ── Nudge to nearest wall ──
      const idx = Math.floor(Math.random() * current.length);
      const item = current[idx];
      saved.push({ idx, pos: { ...item.pos } });

      let bestWallPos: { cx: number; cy: number; angleDeg: number } | null = null;
      let bestWallDist = Infinity;
      for (const w of walls) {
        const d = distPointSegment({ x: item.pos.cx, y: item.pos.cy }, w.debut, w.fin);
        if (d < bestWallDist) {
          bestWallDist = d;
          // Use rotation-aware perpendicular extent
          const angleDiff = (item.pos.angleDeg - w.angleDeg) * Math.PI / 180;
          const perpDim = Math.abs(Math.cos(angleDiff)) * item.meuble.hauteur / 2
            + Math.abs(Math.sin(angleDiff)) * item.meuble.largeur / 2;
          const dx = w.fin.x - w.debut.x, dy = w.fin.y - w.debut.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          if (len === 0) continue;
          const t = Math.max(0, Math.min(1,
            ((item.pos.cx - w.debut.x) * dx + (item.pos.cy - w.debut.y) * dy) / (len * len)));
          const wallPtX = w.debut.x + dx * t;
          const wallPtY = w.debut.y + dy * t;
          bestWallPos = {
            cx: Math.round((wallPtX + w.normalX * (perpDim + 2)) / 5) * 5,
            cy: Math.round((wallPtY + w.normalY * (perpDim + 2)) / 5) * 5,
            angleDeg: ((Math.round(w.angleDeg) % 360) + 360) % 360,
          };
        }
      }
      if (bestWallPos) {
        item.pos = bestWallPos;
      }

    } else if (pertType < 0.85) {
      // ── Swap: exchange positions of two items ──
      if (current.length < 2) continue;
      const i = Math.floor(Math.random() * current.length);
      let j = Math.floor(Math.random() * (current.length - 1));
      if (j >= i) j++;
      saved.push({ idx: i, pos: { ...current[i].pos } });
      saved.push({ idx: j, pos: { ...current[j].pos } });
      const tmpPos = { ...current[i].pos };
      current[i].pos = { ...current[j].pos };
      current[j].pos = tmpPos;

    } else {
      // ── Group move: move satellite with anchor ──
      const idx = Math.floor(Math.random() * current.length);
      const item = current[idx];
      const rule = getRule(item.meuble.id);

      // Find related items (satellites of this anchor, or anchor of this satellite)
      const related: number[] = [idx];
      if (rule.role === 'anchor') {
        for (let k = 0; k < current.length; k++) {
          if (k === idx) continue;
          const r = getRule(current[k].meuble.id);
          if (r.anchorId?.split('|').includes(item.meuble.id)) related.push(k);
        }
      } else if (rule.anchorId) {
        const anchorIds = rule.anchorId.split('|');
        for (let k = 0; k < current.length; k++) {
          if (k === idx) continue;
          if (anchorIds.includes(current[k].meuble.id)) related.push(k);
        }
      }

      // Move all related items together
      const dist = 5 + Math.random() * 40;
      const angle = Math.random() * Math.PI * 2;
      const dx = Math.round(Math.cos(angle) * dist / 5) * 5;
      const dy = Math.round(Math.sin(angle) * dist / 5) * 5;

      for (const ri of related) {
        saved.push({ idx: ri, pos: { ...current[ri].pos } });
        current[ri].pos.cx += dx;
        current[ri].pos.cy += dy;
      }
    }

    // Validate all modified items
    let valid = true;
    for (const s of saved) {
      const item = current[s.idx];
      const otherPlaced: PlacedItem[] = [
        ...fixedPlaced,
        ...current.filter((_, i) => i !== s.idx).map(it => ({
          cx: it.pos.cx, cy: it.pos.cy, w: it.meuble.largeur, h: it.meuble.hauteur,
          angleDeg: it.pos.angleDeg,
          corners: rotatedRectCorners(it.pos.cx, it.pos.cy, it.meuble.largeur, it.meuble.hauteur, it.pos.angleDeg),
          catalogueId: it.meuble.id,
        })),
      ];

      if (!positionValide(
        item.pos.cx, item.pos.cy, item.meuble.largeur, item.meuble.hauteur,
        item.pos.angleDeg, piece, otherPlaced, exclusionZones,
        item.meuble.id, walls, elementsMur, 'relaxed',
      )) {
        valid = false;
        break;
      }
    }

    if (!valid) {
      // Revert all
      for (const s of saved) current[s.idx].pos = s.pos;
      continue;
    }

    const newScore = scoreLayout(current, scoreCtx, scoreWeights);
    const delta = newScore - currentScore;

    if (delta > 0 || Math.random() < Math.exp(delta / temp)) {
      currentScore = newScore;
      if (newScore > bestScore) {
        bestScore = newScore;
        best = current.map(it => ({ meuble: it.meuble, pos: { ...it.pos } }));
      }
    } else {
      for (const s of saved) current[s.idx].pos = s.pos;
    }

    temp *= config.coolingRate;
  }

  return best;
}
