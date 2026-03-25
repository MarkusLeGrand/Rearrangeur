import type { Point } from '../../types';

export interface PlacedItem {
  cx: number; cy: number; w: number; h: number; angleDeg: number;
  corners: Point[];
  catalogueId: string;
}

export interface WallInfo {
  index: number;
  debut: Point; fin: Point;
  angleDeg: number;
  normalX: number; normalY: number;
  length: number;
  freeLength: number;
}

export interface ExclusionZone {
  corners: Point[];
  type: 'porte' | 'fenetre';
  depth: number;
}

export interface FunctionalZone {
  id: string;
  furnitureIds: string[];
  prefer: 'window' | 'door' | 'center' | 'any';
}

export interface SAConfig {
  numCandidates: number;
  iterationsPerCandidate: number;
  initialTemp: number;
  coolingRate: number;
}

export type PlacementRole = 'wall' | 'anchor' | 'satellite' | 'filler';

export interface FurnitureRule {
  role: PlacementRole;
  wallAlign?: boolean;
  needsOutlet?: boolean;
  group?: string;
  anchorId?: string;
  relativePos?: 'side' | 'front' | 'behind';
  relativeOffset?: number;
  facing?: string;
  prefersLight?: boolean;
  avoidsLight?: boolean;
  nearDoor?: boolean;

  // ── Clearances (cm) — from reference tables ──
  clearanceFront?: number;       // min space in front
  clearanceSides?: number;       // min space on each side
  clearanceBehind?: number;      // min space behind (chairs at table)

  // ── Bed rules ──
  headAgainstWall?: boolean;     // headboard must touch a wall
  accessBothSides?: number;      // min clearance on both sides (cm)
  neverUnderWindow?: boolean;    // don't place headboard under window
  notInDoorAxis?: boolean;       // avoid placing in direct line of door

  // ── Sofa rules ──
  neverBackToDoor?: boolean;     // sofa should never have back to entry door

  // ── Technical rules ──
  blocksFenetre?: boolean;       // tall furniture should not block windows
  minViewingDistance?: number;    // TV: min distance from seating (cm)
  underFurniture?: string;       // tapis: should be under this group
  radiatorClearance?: number;    // min distance from radiators (cm)

  // ── Proportion rule ──
  maxWallProportion?: number;    // max % of wall length (e.g. 0.67 = 2/3 rule)
}

export interface LayoutItem {
  meuble: import('../../types').MeubleCatalogue;
  pos: { cx: number; cy: number; angleDeg: number };
}

export interface ScoreCtx {
  piece: import('../../types').Piece;
  walls: WallInfo[];
  windowPos: Point[];
  windowWalls: Array<{ pos: Point; wallInfo: WallInfo; largeur: number }>;
  doorPos: Point[];
  doorWalls: Array<{ pos: Point; wallInfo: WallInfo; sens: number; largeur: number }>;
  outlets: Point[];
  radiators: Point[];
  zones: FunctionalZone[];
  exclusionZones: ExclusionZone[];
  elementsMur: import('../../types').ElementMur[];
  roomDiag: number;
  roomArea: number;
  roomW: number;
  roomH: number;
  fixZoneCentroids: Array<{ zone: string; centroid: import('../../types').Point }>;
}
