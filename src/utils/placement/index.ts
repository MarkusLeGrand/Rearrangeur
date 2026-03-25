import type { MeubleCatalogue, MeublePlacement, Piece, ElementMur } from '../../types';
import type { SAConfig } from './types';
import { analyzeWalls, buildExclusionZones, inferZones, buildScoreCtx } from './walls';
import { scoreLayout, type ScoreWeights } from './scoring';
import { generateOneLayout, buildPlacement } from './layout';
import { optimizeLayout } from './optimizer';

// ═══════════════════════════════════════════════════════════════
// Placement modes
// ═══════════════════════════════════════════════════════════════

export type PlacementMode = 'optimal' | 'cosy' | 'minimaliste';

interface ModeConfig {
  sa: SAConfig;
  scoreWeights: ScoreWeights;
}

const MODES: Record<PlacementMode, ModeConfig> = {
  // ── Optimal: maximize space & circulation ──
  optimal: {
    sa: { numCandidates: 14, iterationsPerCandidate: 700, initialTemp: 0.8, coolingRate: 0.996 },
    scoreWeights: {
      wall: 0.10, light: 0.08, group: 0.12, spacing: 0.08,
      facing: 0.08, circ: 0.16, bed: 0.10, ergo: 0.07,
      align: 0.06, balance: 0.05, door: 0.03, outlet: 0.02,
      radiator: 0.03, qty: 0.02,
    },
  },
  // ── Cosy: grouped, warm, everything close together ──
  cosy: {
    sa: { numCandidates: 12, iterationsPerCandidate: 600, initialTemp: 0.7, coolingRate: 0.995 },
    scoreWeights: {
      wall: 0.08, light: 0.06, group: 0.22, spacing: 0.04,
      facing: 0.10, circ: 0.10, bed: 0.10, ergo: 0.06,
      align: 0.04, balance: 0.02, door: 0.03, outlet: 0.02,
      radiator: 0.03, qty: 0.10,
    },
  },
  // ── Minimaliste: max spacing, strict alignment, open feel ──
  minimaliste: {
    sa: { numCandidates: 14, iterationsPerCandidate: 700, initialTemp: 0.9, coolingRate: 0.997 },
    scoreWeights: {
      wall: 0.12, light: 0.10, group: 0.08, spacing: 0.14,
      facing: 0.06, circ: 0.14, bed: 0.08, ergo: 0.04,
      align: 0.10, balance: 0.06, door: 0.02, outlet: 0.02,
      radiator: 0.02, qty: 0.02,
    },
  },
};

// ═══════════════════════════════════════════════════════════════
// Main entry point
// ═══════════════════════════════════════════════════════════════

export function genererPlacement(
  meubles: MeubleCatalogue[],
  piece: Piece,
  fixes: MeublePlacement[],
  elementsMur: ElementMur[] = [],
  mode: PlacementMode = 'optimal',
): MeublePlacement[] {
  if (meubles.length === 0) return [];

  const config = MODES[mode];
  const walls = analyzeWalls(piece, elementsMur);
  const exclusionZones = buildExclusionZones(piece, elementsMur);
  const zones = inferZones(meubles);
  const scoreCtx = buildScoreCtx(piece, elementsMur, fixes, walls, zones, exclusionZones);

  let bestLayout: Array<{ meuble: MeubleCatalogue; pos: { cx: number; cy: number; angleDeg: number } }> = [];
  let bestScore = -Infinity;

  for (let i = 0; i < config.sa.numCandidates; i++) {
    const layout = generateOneLayout(meubles, piece, fixes, elementsMur, walls, exclusionZones, scoreCtx);
    const optimized = optimizeLayout(layout, piece, fixes, walls, exclusionZones, scoreCtx, config.sa, elementsMur, config.scoreWeights);
    const score = scoreLayout(optimized, scoreCtx, config.scoreWeights);

    if (score > bestScore) {
      bestScore = score;
      bestLayout = optimized;
    }
  }

  return bestLayout.map(it => buildPlacement(it.meuble, it.pos));
}
