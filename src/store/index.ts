import { create } from 'zustand';
import type { AppMode, DrawPhase, ElementMur, MeublePlacement, Piece, Point, WallLine } from '../types';
import { catalogue } from '../data/catalogue';
import { genererPlacement } from '../utils/placement';
import { aire } from '../utils/geometry';

interface State {
  mode: AppMode;
  setMode: (m: AppMode) => void;

  // ── DESSIN ──
  drawPhase: DrawPhase;
  setDrawPhase: (p: DrawPhase) => void;

  // Phase 1: contour
  contourPoints: Point[];
  contourClosed: boolean;
  addContourPoint: (p: Point) => void;
  closeContour: () => void;
  undoContourPoint: () => void;
  clearContour: () => void;

  // Phase 2: murs intérieurs
  innerWalls: WallLine[];
  innerWallStart: Point | null;
  setInnerWallStart: (p: Point | null) => void;
  addInnerWall: (fin: Point) => void;
  undoInnerWall: () => void;

  // Validation
  validerPiece: () => void;
  piece: Piece | null;

  // ── AMÉNAGEMENT ──
  placingTool: 'porte' | 'fenetre' | null;
  setPlacingTool: (t: 'porte' | 'fenetre' | null) => void;

  elementsMur: ElementMur[];
  ajouterElementMur: (el: ElementMur) => void;
  supprimerElementMur: (id: string) => void;

  fixes: MeublePlacement[];
  ajouterFixe: (m: MeublePlacement) => void;
  supprimerFixe: (i: number) => void;
  mettreAJourFixe: (i: number, u: Partial<MeublePlacement>) => void;

  selectedIds: Set<string>;
  toggleMeuble: (id: string) => void;

  // ── RÉSULTAT ──
  placements: MeublePlacement[];
  nonPlaces: string[];
  isGenerated: boolean;
  generer: () => void;

  // ── GLOBAL ──
  echelle: number;
  setEchelle: (e: number) => void;
  resetTout: () => void;
}

export const useStore = create<State>((set, get) => ({
  mode: 'dessin',
  setMode: (mode) => set({ mode }),

  // ── Dessin ──
  drawPhase: 'contour',
  setDrawPhase: (drawPhase) => set({ drawPhase }),

  contourPoints: [],
  contourClosed: false,

  addContourPoint: (p) => set((s) => ({
    contourPoints: [...s.contourPoints, p],
  })),

  closeContour: () => {
    const { contourPoints } = get();
    if (contourPoints.length < 3) return;
    set({ contourClosed: true, drawPhase: 'murs_interieurs' });
  },

  undoContourPoint: () => set((s) => ({
    contourPoints: s.contourPoints.slice(0, -1),
  })),

  clearContour: () => set({
    contourPoints: [], contourClosed: false, innerWalls: [],
    innerWallStart: null, drawPhase: 'contour',
  }),

  innerWalls: [],
  innerWallStart: null,
  setInnerWallStart: (p) => set({ innerWallStart: p }),

  addInnerWall: (fin) => {
    const { innerWallStart } = get();
    if (!innerWallStart) return;
    set((s) => ({
      innerWalls: [...s.innerWalls, { debut: innerWallStart, fin }],
      innerWallStart: null,
    }));
  },

  undoInnerWall: () => set((s) => ({
    innerWalls: s.innerWalls.slice(0, -1),
  })),

  validerPiece: () => {
    const { contourPoints, innerWalls } = get();
    if (contourPoints.length < 3) return;

    // Construire allWalls = arêtes du contour + murs intérieurs
    const contourWalls: WallLine[] = contourPoints.map((p, i) => ({
      debut: p,
      fin: contourPoints[(i + 1) % contourPoints.length],
    }));
    const allWalls = [...contourWalls, ...innerWalls];

    const surfaceM2 = Math.round(aire(contourPoints) / 10000 * 10) / 10;

    set({
      piece: {
        contour: contourPoints,
        innerWalls,
        allWalls,
        surface: surfaceM2,
      },
      mode: 'amenagement',
    });
  },

  piece: null,

  // ── Aménagement ──
  placingTool: null,
  setPlacingTool: (t) => set({ placingTool: t }),

  elementsMur: [],
  ajouterElementMur: (el) => set((s) => ({ elementsMur: [...s.elementsMur, el] })),
  supprimerElementMur: (id) => set((s) => ({ elementsMur: s.elementsMur.filter((e) => e.id !== id) })),

  fixes: [],
  ajouterFixe: (m) => set((s) => ({ fixes: [...s.fixes, m] })),
  supprimerFixe: (i) => set((s) => ({ fixes: s.fixes.filter((_, idx) => idx !== i) })),
  mettreAJourFixe: (i, u) => set((s) => ({
    fixes: s.fixes.map((m, idx) => (idx === i ? { ...m, ...u } : m)),
  })),

  selectedIds: new Set(),
  toggleMeuble: (id) => set((s) => {
    const next = new Set(s.selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    return { selectedIds: next };
  }),

  // ── Résultat ──
  placements: [],
  nonPlaces: [],
  isGenerated: false,

  generer: () => {
    const { selectedIds, piece, fixes } = get();
    if (!piece) return;
    const choisis = catalogue.filter((m) => selectedIds.has(m.id));
    const result = genererPlacement(choisis, piece, fixes);
    const placedIds = new Set(result.map((r) => r.catalogueId));
    set({
      placements: result,
      nonPlaces: choisis.filter((m) => !placedIds.has(m.id)).map((m) => m.nom),
      isGenerated: true,
      mode: 'resultat',
    });
  },

  // ── Global ──
  echelle: 1.5,
  setEchelle: (echelle) => set({ echelle }),

  resetTout: () => set({
    mode: 'dessin', drawPhase: 'contour',
    contourPoints: [], contourClosed: false,
    innerWalls: [], innerWallStart: null,
    piece: null, elementsMur: [], fixes: [],
    selectedIds: new Set(), placements: [], nonPlaces: [],
    isGenerated: false, placingTool: null,
  }),
}));
