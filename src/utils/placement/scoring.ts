import type { Point } from '../../types';
import { distPointSegment, rotatedRectCorners } from '../geometry';
import { getRule } from './rules';
import { distPt } from './walls';
import { checkCirculationScore } from './validation';
import type { LayoutItem, ScoreCtx, PlacedItem } from './types';

// ═══════════════════════════════════════════════════════════════
// Scoring engine — based on architecture reference
//
// LEVEL 3 - SOFT CONSTRAINTS (scored):
//   Wall proximity, bed not in door axis, sofa not back to door,
//   desk side of window, TV opposite window, proportion rules,
//   functional grouping, facing correctness
//
// LEVEL 4 - BONUS (scored):
//   Light maximization, visual balance, alignment,
//   circulation fluidity, mass balance
//
// Weights (total = 1.0):
//   Wall proximity       10%
//   Light rules           8%
//   Functional grouping  14%
//   Spacing harmony       8%
//   Facing correctness    8%
//   Circulation          14%
//   Bed/room rules       10%
//   Ergonomic distances   6%
//   Alignment             5%
//   Coverage balance      4%
//   Door proximity        3%
//   Outlet proximity      2%
//   Radiator safety       3%
//   Quantity bonus         5%
// ═══════════════════════════════════════════════════════════════

// Map furniture categories to zone types they should AVOID
// (negative affinity: penalize being close to these fix zones)
const CATEGORY_ZONE_REPULSION: Record<string, string[]> = {
  'Salon': ['sdb', 'cuisine'],
  'Chambre': ['cuisine'],
  'Bureau': ['sdb'],
  'Salle à manger': [], // dining can be near kitchen
  'Divers': [],
};

/** Perpendicular extent from center based on rotation relative to wall */
function perpExtent(w: number, h: number, angleDeg: number, wallAngleDeg: number): number {
  const diff = (angleDeg - wallAngleDeg) * Math.PI / 180;
  return Math.abs(Math.cos(diff)) * h / 2 + Math.abs(Math.sin(diff)) * w / 2;
}

export interface ScoreWeights {
  wall: number; light: number; group: number; spacing: number;
  facing: number; circ: number; bed: number; ergo: number;
  align: number; balance: number; door: number; outlet: number;
  radiator: number; qty: number;
}

export function scoreLayout(items: LayoutItem[], ctx: ScoreCtx, weights?: ScoreWeights): number {
  if (items.length === 0) return 0;

  let sWall = 0, sLight = 0, sGroup = 0, sSpacing = 0;
  let sFacing = 0, sBalance = 0, sDoor = 0, sOutlet = 0;
  let sCirc = 0, sBed = 0, sErgo = 0, sAlign = 0, sRadiator = 0;

  let nWall = 0, nLight = 0, nFacing = 0, nDoor = 0, nOutlet = 0;
  let nBed = 0, nErgo = 0, nRadiator = 0;

  const posMap = new Map<string, { x: number; y: number; angleDeg: number }>();
  for (const it of items) posMap.set(it.meuble.id, { x: it.pos.cx, y: it.pos.cy, angleDeg: it.pos.angleDeg });

  for (const it of items) {
    const rule = getRule(it.meuble.id);
    const { cx, cy, angleDeg } = it.pos;

    // ── Wall proximity (wall-aligned furniture flush against wall) ──
    if (rule.wallAlign) {
      let minWDist = Infinity;
      let nearestWallAngle = 0;
      for (const w of ctx.walls) {
        const d = distPointSegment({ x: cx, y: cy }, w.debut, w.fin);
        if (d < minWDist) { minWDist = d; nearestWallAngle = w.angleDeg; }
      }
      const perp = perpExtent(it.meuble.largeur, it.meuble.hauteur, angleDeg, nearestWallAngle);
      const idealDist = perp + 2;
      const wallErr = Math.abs(minWDist - idealDist);
      sWall += Math.max(0, 1 - wallErr / 35);
      nWall++;

      // ── 2/3 proportion rule (sofa max 2/3 of wall) ──
      if (rule.maxWallProportion) {
        let nearestWallLen = 100;
        for (const w of ctx.walls) {
          const d = distPointSegment({ x: cx, y: cy }, w.debut, w.fin);
          if (d < minWDist + 10) nearestWallLen = w.length;
        }
        const furniLen = Math.max(it.meuble.largeur, it.meuble.hauteur);
        if (furniLen / nearestWallLen <= rule.maxWallProportion) {
          sWall += 0.3; // bonus for good proportion
        }
      }
    }

    // ── Light rules ──
    if ((rule.prefersLight || rule.avoidsLight) && ctx.windowPos.length > 0) {
      nLight++;
      const minWinDist = Math.min(...ctx.windowPos.map(w => distPt({ x: cx, y: cy }, w)));

      if (rule.prefersLight) {
        // Bureau: should be SIDE of window, not facing it
        // Score: close to window but not directly in front
        sLight += Math.max(0, 1 - minWinDist / ctx.roomDiag);
      } else {
        // TV: wall OPPOSITE to window (avoid reflections)
        sLight += Math.min(1, minWinDist / (ctx.roomDiag * 0.4));
      }
    }

    // ── Facing correctness ──
    if (rule.facing) {
      const target = posMap.get(rule.facing);
      if (target) {
        nFacing++;
        const desiredAngle = Math.atan2(target.y - cy, target.x - cx) * 180 / Math.PI;
        const diff = Math.abs(((angleDeg - desiredAngle + 180) % 360 + 360) % 360 - 180);
        sFacing += diff < 30 ? 1 : diff < 60 ? 0.7 : diff < 90 ? 0.3 : 0;
      }
    }

    // ── Sofa: never back to main door ──
    if (rule.neverBackToDoor && ctx.doorPos.length > 0) {
      nBed++; // reuse nBed counter for room rules
      const sofaBackAngle = (angleDeg + 180) % 360;
      let backToDoor = false;
      for (const door of ctx.doorPos) {
        const doorAngle = Math.atan2(door.y - cy, door.x - cx) * 180 / Math.PI;
        const diff = Math.abs(((sofaBackAngle - doorAngle + 180) % 360 + 360) % 360 - 180);
        if (diff < 45) { backToDoor = true; break; }
      }
      sBed += backToDoor ? 0.1 : 1;
    }

    // ── Bed: not in door axis (soft score) ──
    if (rule.notInDoorAxis && ctx.doorWalls.length > 0) {
      nBed++;
      let inAxis = false;
      for (const dw of ctx.doorWalls) {
        const axisX = dw.pos.x + dw.wallInfo.normalX * 300;
        const axisY = dw.pos.y + dw.wallInfo.normalY * 300;
        const d = distPointToSeg({ x: cx, y: cy }, dw.pos, { x: axisX, y: axisY });
        if (d < Math.max(it.meuble.largeur, it.meuble.hauteur) / 2 + 20) { inAxis = true; break; }
      }
      sBed += inAxis ? 0.2 : 1;
    }

    // ── Bed: head close to wall ──
    if (rule.headAgainstWall) {
      nBed++;
      const rad = angleDeg * Math.PI / 180;
      const headCx = cx - Math.sin(rad) * (it.meuble.hauteur / 2);
      const headCy = cy + Math.cos(rad) * (it.meuble.hauteur / 2);
      let minHeadDist = Infinity;
      for (const w of ctx.walls) {
        const d = distPointSegment({ x: headCx, y: headCy }, w.debut, w.fin);
        if (d < minHeadDist) minHeadDist = d;
      }
      sBed += Math.max(0, 1 - minHeadDist / 20);

      // Penalty: head under window
      if (rule.neverUnderWindow) {
        for (const wPos of ctx.windowPos) {
          if (distPt({ x: headCx, y: headCy }, wPos) < 80) sBed -= 0.5;
        }
      }
    }

    // ── Outlet proximity ──
    if (rule.needsOutlet && ctx.outlets.length > 0) {
      nOutlet++;
      const minDist = Math.min(...ctx.outlets.map(o => distPt({ x: cx, y: cy }, o)));
      sOutlet += Math.max(0, 1 - minDist / 300);
    }

    // ── Door proximity (entrance furniture) ──
    if (rule.nearDoor && ctx.doorPos.length > 0) {
      nDoor++;
      const minDist = Math.min(...ctx.doorPos.map(d => distPt({ x: cx, y: cy }, d)));
      sDoor += Math.max(0, 1 - minDist / 200);
    }

    // ── Ergonomic: TV viewing distance ──
    if (rule.minViewingDistance) {
      const sofaIds = ['canape3', 'canape2', 'canapeangle', 'canapelit', 'fauteuil'];
      let checked = false;
      for (const sid of sofaIds) {
        const sPos = posMap.get(sid);
        if (sPos) {
          nErgo++;
          checked = true;
          const d = distPt({ x: cx, y: cy }, { x: sPos.x, y: sPos.y });
          const maxDist = rule.minViewingDistance * 3;
          if (d >= rule.minViewingDistance && d <= maxDist) sErgo += 1;
          else if (d < rule.minViewingDistance) sErgo += d / rule.minViewingDistance;
          else sErgo += Math.max(0.3, 1 - (d - maxDist) / 200);
        }
      }
      if (!checked) { nErgo++; sErgo += 0.3; }
    }

    // ── Ergonomic: clearance behind (table/chairs) ──
    if (rule.clearanceBehind) {
      nErgo++;
      const rad2 = angleDeg * Math.PI / 180;
      const behindX = cx + Math.sin(rad2) * (it.meuble.hauteur / 2 + rule.clearanceBehind / 2);
      const behindY = cy - Math.cos(rad2) * (it.meuble.hauteur / 2 + rule.clearanceBehind / 2);
      let clear = true;
      for (const other of items) {
        if (other === it) continue;
        const d = distPt({ x: behindX, y: behindY }, { x: other.pos.cx, y: other.pos.cy });
        const otherHalf = Math.max(other.meuble.largeur, other.meuble.hauteur) / 2;
        if (d < rule.clearanceBehind / 2 + otherHalf + 5) { clear = false; break; }
      }
      sErgo += clear ? 1 : 0.1;
    }

    // ── Radiator: nothing blocking (10cm min, 30cm ideal) ──
    if (ctx.radiators.length > 0) {
      const minRadDist = Math.min(...ctx.radiators.map(r => distPt({ x: cx, y: cy }, r)));
      const halfSize = Math.max(it.meuble.largeur, it.meuble.hauteur) / 2;
      const edgeDist = minRadDist - halfSize;
      if (edgeDist < 50) { // only score items near radiators
        nRadiator++;
        if (edgeDist < 10) sRadiator += 0;        // blocking!
        else if (edgeDist < 30) sRadiator += 0.5;  // too close
        else sRadiator += 1;                        // good
      }
    }
  }

  // ── Zone compatibility (auto-detected from fixed elements) ──
  // Penalize furniture placed near fixture zones it should avoid
  const hasFixZones = ctx.fixZoneCentroids.length > 0;
  let sZone = 0, nZone = 0;
  if (hasFixZones) {
    for (const it of items) {
      const cat = it.meuble.categorie;
      const repulsions = CATEGORY_ZONE_REPULSION[cat];
      if (!repulsions || repulsions.length === 0) continue;
      // Check distance to each repulsive zone centroid
      let worstScore = 1; // best = 1 (far away from repulsive zones)
      for (const repZone of repulsions) {
        const centroidInfo = ctx.fixZoneCentroids.find(z => z.zone === repZone);
        if (!centroidInfo) continue;
        nZone++;
        const d = distPt({ x: it.pos.cx, y: it.pos.cy }, centroidInfo.centroid);
        // Score: 0 if right on top of repulsive zone, 1 if far away
        // Use 200cm as the "safe" distance threshold
        const score = Math.min(1, d / 200);
        if (score < worstScore) worstScore = score;
        sZone += score;
      }
    }
  }

  // ── Functional grouping (zone coherence) ──
  let nGroup = 0;
  for (const zone of ctx.zones) {
    const zoneItems = items.filter(it => zone.furnitureIds.includes(it.meuble.id));
    if (zoneItems.length < 2) continue;
    nGroup++;
    const zcx = zoneItems.reduce((s, it) => s + it.pos.cx, 0) / zoneItems.length;
    const zcy = zoneItems.reduce((s, it) => s + it.pos.cy, 0) / zoneItems.length;
    let avgDist = 0;
    for (const it of zoneItems) avgDist += distPt({ x: it.pos.cx, y: it.pos.cy }, { x: zcx, y: zcy });
    avgDist /= zoneItems.length;
    sGroup += Math.max(0, 1 - avgDist / (ctx.roomDiag * 0.25));
  }

  // ── Spacing harmony (sweet spot 30-120cm edge-to-edge) ──
  let spacingSum = 0;
  for (let i = 0; i < items.length; i++) {
    let minEdgeDist = Infinity;
    const sizeI = (items[i].meuble.largeur + items[i].meuble.hauteur) / 4;
    for (let j = 0; j < items.length; j++) {
      if (i === j) continue;
      const d = distPt(
        { x: items[i].pos.cx, y: items[i].pos.cy },
        { x: items[j].pos.cx, y: items[j].pos.cy },
      );
      const sizeJ = (items[j].meuble.largeur + items[j].meuble.hauteur) / 4;
      const edge = d - sizeI - sizeJ;
      if (edge < minEdgeDist) minEdgeDist = edge;
    }
    if (minEdgeDist < 5) spacingSum += 0.05;
    else if (minEdgeDist < 20) spacingSum += 0.3;
    else if (minEdgeDist <= 120) spacingSum += 1.0;
    else if (minEdgeDist <= 200) spacingSum += 0.6;
    else spacingSum += 0.2;
  }
  sSpacing = items.length > 1 ? spacingSum / items.length : 1;

  // ── Coverage balance (furniture spread across room) ──
  if (items.length > 1) {
    const allCx = items.map(it => it.pos.cx);
    const allCy = items.map(it => it.pos.cy);
    const spreadX = Math.max(...allCx) - Math.min(...allCx);
    const spreadY = Math.max(...allCy) - Math.min(...allCy);
    sBalance = Math.min(1, (spreadX / Math.max(ctx.roomW, 1) + spreadY / Math.max(ctx.roomH, 1)) / 1.4);
  } else {
    sBalance = 0.5;
  }

  // ── Alignment (furniture edges aligned) ──
  if (items.length > 2) {
    let alignCount = 0, alignTotal = 0;
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const d = distPt({ x: items[i].pos.cx, y: items[i].pos.cy }, { x: items[j].pos.cx, y: items[j].pos.cy });
        if (d > ctx.roomDiag * 0.5) continue;
        alignTotal++;
        const ci = items[i].pos, cj = items[j].pos;
        const tol = 12;
        if (Math.abs(ci.cx - cj.cx) < tol || Math.abs(ci.cy - cj.cy) < tol) { alignCount++; continue; }
        const cornersI = rotatedRectCorners(ci.cx, ci.cy, items[i].meuble.largeur, items[i].meuble.hauteur, ci.angleDeg);
        const cornersJ = rotatedRectCorners(cj.cx, cj.cy, items[j].meuble.largeur, items[j].meuble.hauteur, cj.angleDeg);
        const edgesI = getEdgeCoords(cornersI);
        const edgesJ = getEdgeCoords(cornersJ);
        for (const ei of edgesI) {
          let found = false;
          for (const ej of edgesJ) { if (Math.abs(ei - ej) < tol) { found = true; break; } }
          if (found) { alignCount++; break; }
        }
      }
    }
    sAlign = alignTotal > 0 ? alignCount / alignTotal : 0.5;
  } else {
    sAlign = 0.5;
  }

  // ── Circulation ──
  const placedItems: PlacedItem[] = items.map(it => ({
    cx: it.pos.cx, cy: it.pos.cy,
    w: it.meuble.largeur, h: it.meuble.hauteur,
    angleDeg: it.pos.angleDeg,
    corners: rotatedRectCorners(it.pos.cx, it.pos.cy, it.meuble.largeur, it.meuble.hauteur, it.pos.angleDeg),
    catalogueId: it.meuble.id,
  }));
  sCirc = checkCirculationScore(placedItems, ctx.piece, ctx.doorPos);

  // ── Weighted sum (dynamic weights from mode) ──
  const norm = (v: number, n: number) => n > 0 ? v / n : 0;

  const w = weights ?? {
    wall: 0.10, light: 0.08, group: 0.14, spacing: 0.08,
    facing: 0.08, circ: 0.14, bed: 0.10, ergo: 0.06,
    align: 0.05, balance: 0.04, door: 0.03, outlet: 0.02,
    radiator: 0.03, qty: 0.05,
  };

  // If fix zones detected, zone compatibility gets 10% weight (taken from group + spacing)
  const W_ZONE = hasFixZones && nZone > 0 ? 0.10 : 0;
  const groupW = hasFixZones ? w.group * 0.6 : w.group;
  const spacingW = hasFixZones ? w.spacing * 0.8 : w.spacing;

  const raw =
    norm(sWall, nWall) * w.wall +
    norm(sLight, nLight) * w.light +
    norm(sGroup, nGroup) * groupW +
    sSpacing * spacingW +
    norm(sFacing, nFacing) * w.facing +
    sCirc * w.circ +
    norm(sBed, nBed) * w.bed +
    norm(sErgo, nErgo) * w.ergo +
    sAlign * w.align +
    sBalance * w.balance +
    norm(sDoor, nDoor) * w.door +
    norm(sOutlet, nOutlet) * w.outlet +
    norm(sRadiator, nRadiator) * w.radiator +
    Math.min(1, items.length / 5) * w.qty +
    norm(sZone, nZone) * W_ZONE;

  const totalW = Object.values(w).reduce((s, v) => s + v, 0) + W_ZONE;
  let usedW = totalW;
  if (nWall === 0) usedW -= w.wall;
  if (nLight === 0) usedW -= w.light;
  if (nFacing === 0) usedW -= w.facing;
  if (nBed === 0) usedW -= w.bed;
  if (nErgo === 0) usedW -= w.ergo;
  if (nDoor === 0) usedW -= w.door;
  if (nOutlet === 0) usedW -= w.outlet;
  if (nRadiator === 0) usedW -= w.radiator;
  if (nGroup === 0) usedW -= groupW;
  if (nZone === 0) usedW -= W_ZONE;

  return usedW > 0 ? raw / usedW * totalW : raw;
}

function getEdgeCoords(corners: Point[]): number[] {
  const xs = corners.map(c => c.x);
  const ys = corners.map(c => c.y);
  return [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
}

function distPointToSeg(point: Point, a: Point, b: Point): number {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return distPt(a, point);
  let t = ((point.x - a.x) * dx + (point.y - a.y) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return distPt(point, { x: a.x + t * dx, y: a.y + t * dy });
}
