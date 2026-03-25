import type { FurnitureRule } from './types';

// ═══════════════════════════════════════════════════════════════
// Interior design rules — from DTU & NF reference
//
// Clearances from official reference tables:
//   - Front of bed (access side): 60cm min, 80cm ideal
//   - Front of armoire: 90cm min (door opening)
//   - Front of sofa → table basse: 35-50cm
//   - Around dining table (chairs out): 80cm min, 100cm ideal
//   - Front of kitchen counters: 90cm min
//   - Radiator clearance: 10cm min, 30cm ideal
//   - Window clearance: 30cm min
//   - Door swing: fully clear
//
// Proportion rules:
//   - Sofa length = max 2/3 of wall
//   - Carpet = min 2/3 of room length
// ═══════════════════════════════════════════════════════════════

const RULES: Record<string, FurnitureRule> = {
  // ── Salon ──
  canape3: {
    role: 'wall', wallAlign: true, facing: 'meubletv',
    prefersLight: true, blocksFenetre: false, group: 'salon',
    neverBackToDoor: true,
    maxWallProportion: 0.67,       // 2/3 rule
    clearanceFront: 35,             // toward table basse
  },
  canape2: {
    role: 'wall', wallAlign: true, facing: 'meubletv',
    prefersLight: true, blocksFenetre: false, group: 'salon',
    neverBackToDoor: true,
    maxWallProportion: 0.67,
    clearanceFront: 35,
  },
  canapeangle: {
    role: 'wall', wallAlign: true, facing: 'meubletv',
    prefersLight: true, blocksFenetre: false, group: 'salon',
    neverBackToDoor: true,
    clearanceFront: 35,
  },
  fauteuil: {
    role: 'filler', prefersLight: true, facing: 'meubletv', group: 'salon',
    clearanceFront: 35,
  },
  pouf: { role: 'filler', group: 'salon' },
  tablebasse: {
    role: 'satellite', group: 'salon',
    anchorId: 'canape3|canape2|canapeangle|canapelit',
    relativePos: 'front', relativeOffset: 40,  // 35-50cm arm's reach
  },
  meubletv: {
    role: 'wall', wallAlign: true, group: 'salon',
    avoidsLight: true,              // never face window (reflections)
    blocksFenetre: false,
    minViewingDistance: 200,         // 2m min from sofa (2-3x screen diag)
  },
  biblio: {
    role: 'wall', wallAlign: true, blocksFenetre: true,
    clearanceFront: 40,
  },
  console: {
    role: 'wall', wallAlign: true, blocksFenetre: false,
    nearDoor: true,
  },

  // ── Chambre ──
  litdouble: {
    role: 'anchor', wallAlign: true, group: 'chambre',
    headAgainstWall: true,
    accessBothSides: 60,            // 60cm min each side (couple)
    neverUnderWindow: true,
    notInDoorAxis: true,            // never in direct axis of door
    clearanceFront: 90,             // 90cm at foot of bed
  },
  litsimple: {
    role: 'anchor', wallAlign: true, group: 'chambre',
    headAgainstWall: true,
    accessBothSides: 0,             // single bed: one side against wall OK
    neverUnderWindow: true,
    notInDoorAxis: true,
    clearanceFront: 60,
  },
  lit140: {
    role: 'anchor', wallAlign: true, group: 'chambre',
    headAgainstWall: true,
    accessBothSides: 60,
    neverUnderWindow: true,
    notInDoorAxis: true,
    clearanceFront: 90,
  },
  chevet: {
    role: 'satellite', group: 'chambre',
    anchorId: 'litdouble|lit140|litsimple',
    relativePos: 'side', relativeOffset: 0,
  },
  armoire: {
    role: 'wall', wallAlign: true, blocksFenetre: true,
    clearanceFront: 90, group: 'chambre',  // 90cm for door opening
  },
  armoire2p: {
    role: 'wall', wallAlign: true, blocksFenetre: true,
    clearanceFront: 90, group: 'chambre',
  },
  commode: {
    role: 'wall', wallAlign: true, blocksFenetre: false, group: 'chambre',
    clearanceFront: 50,
  },
  coiffeuse: {
    role: 'wall', wallAlign: true, prefersLight: true, blocksFenetre: false,
    group: 'chambre', clearanceFront: 50,
  },

  // ── Salle à manger ──
  table6: {
    role: 'anchor', group: 'salle_a_manger',
    clearanceBehind: 80,            // 80cm min (chair pulled out + passage)
  },
  table4: {
    role: 'anchor', group: 'salle_a_manger',
    clearanceBehind: 80,
  },
  tableronde: {
    role: 'anchor', group: 'salle_a_manger',
    clearanceBehind: 80,
  },
  chaise: {
    role: 'satellite',
    anchorId: 'table6|table4|tableronde',
    relativePos: 'side', relativeOffset: 5,
    clearanceBehind: 80,            // space to pull chair out and pass
    group: 'salle_a_manger',
  },
  tabouret: {
    role: 'satellite',
    anchorId: 'table6|table4|tableronde|ilot',
    relativePos: 'side', relativeOffset: 5,
    clearanceBehind: 60,
    group: 'salle_a_manger',
  },
  buffet: {
    role: 'wall', wallAlign: true, blocksFenetre: true,
    group: 'salle_a_manger', clearanceFront: 50,
  },
  vaisselier: {
    role: 'wall', wallAlign: true, blocksFenetre: true,
    group: 'salle_a_manger', clearanceFront: 50,
  },

  // ── Bureau ──
  bureau: {
    role: 'anchor', wallAlign: true,
    needsOutlet: true, group: 'bureau',
    prefersLight: true,             // side of window, never facing it
    clearanceFront: 70,             // space for desk chair
    blocksFenetre: false,
  },
  bureauangle: {
    role: 'anchor', wallAlign: true,
    needsOutlet: true, group: 'bureau',
    prefersLight: true,
    clearanceFront: 70,
    blocksFenetre: false,
  },
  chaisebureau: {
    role: 'satellite', group: 'bureau',
    anchorId: 'bureau|bureauangle',
    relativePos: 'front', relativeOffset: 5,
  },
  etagere: {
    role: 'wall', wallAlign: true, blocksFenetre: true, group: 'bureau',
    clearanceFront: 30,
  },
  classeur: {
    role: 'wall', wallAlign: true, blocksFenetre: true, group: 'bureau',
    clearanceFront: 30,
  },

  // ── Divers ──
  canapelit: {
    role: 'wall', wallAlign: true, blocksFenetre: false,
    facing: 'meubletv', group: 'salon',
    neverBackToDoor: true,
    maxWallProportion: 0.67,
    clearanceFront: 35,
  },
  tapis: {
    role: 'filler',
    underFurniture: 'canape3|canape2|canapeangle|canapelit|tablebasse|fauteuil',
  },
  porte_manteaux: { role: 'wall', wallAlign: true, nearDoor: true },
  meuble_chaussures: { role: 'wall', wallAlign: true, nearDoor: true },

  // ── Cuisine (fixed) ──
  evier: { role: 'wall', wallAlign: true, blocksFenetre: false, clearanceFront: 90 },
  plantravail: { role: 'wall', wallAlign: true, blocksFenetre: false, clearanceFront: 90 },
  ilot: { role: 'anchor', clearanceFront: 90, clearanceSides: 90 },
  frigo: { role: 'wall', wallAlign: true, blocksFenetre: true, clearanceFront: 90 },
  four: { role: 'wall', wallAlign: true, blocksFenetre: true, clearanceFront: 90 },
  lavevaisselle: { role: 'wall', wallAlign: true, clearanceFront: 80 },
  microondes: { role: 'wall', wallAlign: true, clearanceFront: 50 },
  hotte: { role: 'wall', wallAlign: true },
  congelateur: { role: 'wall', wallAlign: true, blocksFenetre: true, clearanceFront: 80 },

  // ── Salle de bain (fixed) ──
  baignoire: { role: 'wall', wallAlign: true, clearanceSides: 70, clearanceFront: 70 },
  douche: { role: 'wall', wallAlign: true, clearanceFront: 70 },
  doucheitalienne: { role: 'wall', wallAlign: true, clearanceFront: 70 },
  lavabo: { role: 'wall', wallAlign: true, clearanceFront: 70, clearanceSides: 20 },
  doublevasque: { role: 'wall', wallAlign: true, clearanceFront: 70, clearanceSides: 20 },
  wc: { role: 'wall', wallAlign: true, clearanceFront: 60, clearanceSides: 20 },
  lavelinge: { role: 'wall', wallAlign: true, clearanceFront: 80 },
  sechelinge: { role: 'wall', wallAlign: true, clearanceFront: 80 },
  secheserviettes: { role: 'wall', wallAlign: true },

  // ── Installations (fixed) ──
  radiateur: { role: 'wall', wallAlign: true, radiatorClearance: 10 },
  radiateurpetit: { role: 'wall', wallAlign: true, radiatorClearance: 10 },
  prisecourant: { role: 'wall', wallAlign: true },
  interrupteur: { role: 'wall', wallAlign: true },
  tableauelectrique: { role: 'wall', wallAlign: true, clearanceFront: 60 },
  cheminee: { role: 'wall', wallAlign: true, clearanceFront: 100 },
  poele: { role: 'wall', wallAlign: true, clearanceFront: 100 },
  cumulus: { role: 'wall', wallAlign: true, clearanceFront: 50 },
  climatiseur: { role: 'wall', wallAlign: true, clearanceFront: 50 },
};

export function getRule(id: string): FurnitureRule {
  return RULES[id] ?? { role: 'filler' };
}
