import { create } from 'zustand';
import type { AppMode, DrawPhase, DrawMethod, DrawTool, TemplateShape, TemplateParams, ElementMur, FenetreVariant, MeublePlacement, Piece, Point, WallLine } from '../types';
import { catalogue } from '../data/catalogue';
import { genererPlacement } from '../utils/placement';
import { aire, polyBounds, wallsToPolygon } from '../utils/geometry';
import { defaultTemplateParams, generateTemplate } from '../utils/templates';

interface State {
  mode: AppMode;
  setMode: (m: AppMode) => void;

  // ── DESSIN ──
  drawPhase: DrawPhase;
  setDrawPhase: (p: DrawPhase) => void;
  targetSurfaceM2: number;
  setTargetSurfaceM2: (v: number) => void;
  drawMethod: DrawMethod | null;
  setDrawMethod: (m: DrawMethod) => void;
  activeTool: DrawTool;
  setActiveTool: (t: DrawTool) => void;

  // Contour (from drawn walls or template)
  contourPoints: Point[];
  contourClosed: boolean;
  drawnWalls: WallLine[];
  addDrawnWall: (w: WallLine) => void;
  addDrawnWalls: (ws: WallLine[]) => void;
  removeDrawnWall: (index: number) => void;
  undoLastDrawnWall: () => void;
  clearDrawnWalls: () => void;

  // Line tool state
  lineStart: Point | null;
  setLineStart: (p: Point | null) => void;

  // Freehand tool state
  freehandStroke: Point[];
  setFreehandStroke: (pts: Point[]) => void;


  // Template state
  templateShape: TemplateShape;
  setTemplateShape: (s: TemplateShape) => void;
  templateParams: TemplateParams | null;
  updateTemplateParam: (key: string, value: number) => void;
  initTemplate: () => void;

  // Validation contour
  drawError: string | null;
  setDrawError: (e: string | null) => void;
  validerContour: () => void;
  closeContourFromTemplate: () => void;

  // Inner walls
  innerWalls: WallLine[];
  innerWallStart: Point | null;
  setInnerWallStart: (p: Point | null) => void;
  addInnerWall: (fin: Point) => void;
  undoInnerWall: () => void;

  // Validation
  validerPiece: () => void;
  piece: Piece | null;

  // ── AMÉNAGEMENT ──
  placingTool: { type: 'porte' | 'fenetre'; variant?: FenetreVariant } | null;
  setPlacingTool: (t: { type: 'porte' | 'fenetre'; variant?: FenetreVariant } | null) => void;

  elementsMur: ElementMur[];
  ajouterElementMur: (el: ElementMur) => void;
  supprimerElementMur: (id: string) => void;
  inverserSensElement: (id: string) => void;

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
  selectedPlacement: number | null;
  setSelectedPlacement: (i: number | null) => void;
  generer: () => void;
  mettreAJourPlacement: (i: number, u: Partial<MeublePlacement>) => void;
  supprimerPlacement: (i: number) => void;

  // ── SAUVEGARDE ──
  sauvegarder: () => void;
  charger: () => void;

  // ── GLOBAL ──
  echelle: number;
  setEchelle: (e: number) => void;
  resetTout: () => void;
}

export const useStore = create<State>((set, get) => ({
  mode: 'dessin',
  setMode: (mode) => set({ mode }),

  // ── Dessin ──
  drawPhase: 'surface_input',
  setDrawPhase: (drawPhase) => set({ drawPhase }),
  targetSurfaceM2: 20,
  setTargetSurfaceM2: (v) => set({ targetSurfaceM2: v }),
  drawMethod: null,
  setDrawMethod: (drawMethod) => {
    set({ drawMethod });
    if (drawMethod === 'dessiner') {
      set({ drawPhase: 'contour_draw' });
    } else {
      const { targetSurfaceM2, templateShape } = get();
      const areaCm2 = targetSurfaceM2 * 10000;
      set({
        drawPhase: 'contour_template',
        templateParams: defaultTemplateParams(templateShape, areaCm2),
      });
    }
  },
  activeTool: 'line',
  setActiveTool: (activeTool) => set({ activeTool, lineStart: null, freehandStroke: [] }),

  // Contour
  contourPoints: [],
  contourClosed: false,
  drawnWalls: [],

  addDrawnWall: (w) => set((s) => ({ drawnWalls: [...s.drawnWalls, w] })),
  addDrawnWalls: (ws) => set((s) => ({ drawnWalls: [...s.drawnWalls, ...ws] })),
  removeDrawnWall: (index) => set((s) => ({
    drawnWalls: s.drawnWalls.filter((_, i) => i !== index),
  })),
  undoLastDrawnWall: () => set((s) => ({
    drawnWalls: s.drawnWalls.slice(0, -1),
  })),
  clearDrawnWalls: () => set({
    drawnWalls: [], lineStart: null, freehandStroke: [],
    contourPoints: [], contourClosed: false,
  }),

  // Line tool
  lineStart: null,
  setLineStart: (p) => set({ lineStart: p }),

  // Freehand
  freehandStroke: [],
  setFreehandStroke: (pts) => set({ freehandStroke: pts }),


  // Template
  templateShape: 'rectangle',
  setTemplateShape: (shape) => {
    const { targetSurfaceM2 } = get();
    const areaCm2 = targetSurfaceM2 * 10000;
    set({
      templateShape: shape,
      templateParams: defaultTemplateParams(shape, areaCm2),
    });
  },
  templateParams: null,
  updateTemplateParam: (key, value) => set((s) => {
    if (!s.templateParams) return {};
    return {
      templateParams: {
        ...s.templateParams,
        values: { ...s.templateParams.values, [key]: value },
      },
    };
  }),
  initTemplate: () => {
    const { targetSurfaceM2, templateShape } = get();
    const areaCm2 = targetSurfaceM2 * 10000;
    set({ templateParams: defaultTemplateParams(templateShape, areaCm2) });
  },

  drawError: null,
  setDrawError: (e) => set({ drawError: e }),

  // Validate contour: build a closed polygon from wall segments (order/direction agnostic)
  // Always tries to extract a valid polygon — graph-based first, then naive fallback
  validerContour: () => {
    const { drawnWalls } = get();
    if (drawnWalls.length < 3) {
      set({ drawError: 'Il faut au moins 3 murs pour former une piece.' });
      return;
    }

    // Try graph-based extraction (handles mixed directions)
    let pts = wallsToPolygon(drawnWalls);

    // Fallback: naive ordered points (debut of each wall + last fin)
    if (!pts) {
      const naive: Point[] = drawnWalls.map(w => w.debut);
      naive.push(drawnWalls[drawnWalls.length - 1].fin);
      // Deduplicate consecutive identical points
      const deduped: Point[] = [naive[0]];
      for (let i = 1; i < naive.length; i++) {
        if (Math.abs(naive[i].x - deduped[deduped.length - 1].x) > 2 ||
            Math.abs(naive[i].y - deduped[deduped.length - 1].y) > 2) {
          deduped.push(naive[i]);
        }
      }
      // Remove last point if it matches first (closure)
      if (deduped.length > 1 &&
          Math.abs(deduped[0].x - deduped[deduped.length - 1].x) <= 2 &&
          Math.abs(deduped[0].y - deduped[deduped.length - 1].y) <= 2) {
        deduped.pop();
      }
      if (deduped.length >= 3) pts = deduped;
    }

    if (!pts || pts.length < 3) {
      set({ drawError: 'Impossible d\'extraire un contour valide. Verifiez que les murs forment une forme fermee.' });
      return;
    }

    const MAX_CM = 1000;
    const b = polyBounds(pts);
    const offX = (MAX_CM - (b.maxX - b.minX)) / 2 - b.minX;
    const offY = (MAX_CM - (b.maxY - b.minY)) / 2 - b.minY;
    const centered = pts.map(p => ({ x: p.x + offX, y: p.y + offY }));
    set({
      contourPoints: centered,
      contourClosed: true,
      drawError: null,
      drawPhase: 'murs_interieurs',
    });
  },

  // Close contour from template
  closeContourFromTemplate: () => {
    const { templateParams } = get();
    if (!templateParams) return;
    const result = generateTemplate(templateParams);
    const MAX_CM = 1000;
    const b = polyBounds(result.contour);
    const offX = (MAX_CM - (b.maxX - b.minX)) / 2 - b.minX;
    const offY = (MAX_CM - (b.maxY - b.minY)) / 2 - b.minY;
    const centered = result.contour.map(p => ({ x: p.x + offX, y: p.y + offY }));
    set({
      contourPoints: centered,
      contourClosed: true,
      drawPhase: 'murs_interieurs',
    });
  },

  // Inner walls
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

    // Center piece within the 0–1000 grid
    const MAX_CM = 1000;
    const bounds = polyBounds(contourPoints);
    const offsetX = (MAX_CM - (bounds.maxX - bounds.minX)) / 2 - bounds.minX;
    const offsetY = (MAX_CM - (bounds.maxY - bounds.minY)) / 2 - bounds.minY;

    const centered = contourPoints.map(p => ({ x: p.x + offsetX, y: p.y + offsetY }));
    const centeredInner = innerWalls.map(w => ({
      debut: { x: w.debut.x + offsetX, y: w.debut.y + offsetY },
      fin: { x: w.fin.x + offsetX, y: w.fin.y + offsetY },
    }));

    const contourWalls: WallLine[] = centered.map((p, i) => ({
      debut: p,
      fin: centered[(i + 1) % centered.length],
    }));
    const allWalls = [...contourWalls, ...centeredInner];
    const surfaceM2 = Math.round(aire(centered) / 10000 * 10) / 10;

    set({
      piece: {
        contour: centered,
        innerWalls: centeredInner,
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
  inverserSensElement: (id) => set((s) => ({
    elementsMur: s.elementsMur.map((e) => e.id === id ? { ...e, sens: (e.sens === 1 ? -1 : 1) as 1 | -1 } : e),
  })),

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
  selectedPlacement: null,
  setSelectedPlacement: (i) => set({ selectedPlacement: i }),

  generer: () => {
    const { selectedIds, piece, fixes, elementsMur } = get();
    if (!piece) return;
    const choisis = catalogue.filter((m) => selectedIds.has(m.id));
    const result = genererPlacement(choisis, piece, fixes, elementsMur);
    const placedIds = new Set(result.map((r) => r.catalogueId));
    set({
      placements: result,
      nonPlaces: choisis.filter((m) => !placedIds.has(m.id)).map((m) => m.nom),
      isGenerated: true,
      mode: 'resultat',
    });
  },

  mettreAJourPlacement: (i, u) => set((s) => ({
    placements: s.placements.map((m, idx) => (idx === i ? { ...m, ...u } : m)),
  })),

  supprimerPlacement: (i) => set((s) => ({
    placements: s.placements.filter((_, idx) => idx !== i),
    selectedPlacement: null,
  })),

  // ── Sauvegarde ──
  sauvegarder: () => {
    const s = get();
    const data = {
      piece: s.piece,
      elementsMur: s.elementsMur,
      fixes: s.fixes,
      selectedIds: [...s.selectedIds],
      contourPoints: s.contourPoints,
      contourClosed: s.contourClosed,
      innerWalls: s.innerWalls,
      drawnWalls: s.drawnWalls,
      placements: s.placements,
      nonPlaces: s.nonPlaces,
      isGenerated: s.isGenerated,
      mode: s.mode,
      drawPhase: s.drawPhase,
      targetSurfaceM2: s.targetSurfaceM2,
      drawMethod: s.drawMethod,
      templateShape: s.templateShape,
      templateParams: s.templateParams,
    };
    localStorage.setItem('rearrangeur-save', JSON.stringify(data));
  },

  charger: () => {
    const raw = localStorage.getItem('rearrangeur-save');
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      set({
        piece: data.piece ?? null,
        elementsMur: data.elementsMur ?? [],
        fixes: data.fixes ?? [],
        selectedIds: new Set(data.selectedIds ?? []),
        contourPoints: data.contourPoints ?? [],
        contourClosed: data.contourClosed ?? false,
        innerWalls: data.innerWalls ?? [],
        drawnWalls: data.drawnWalls ?? [],
        placements: data.placements ?? [],
        nonPlaces: data.nonPlaces ?? [],
        isGenerated: data.isGenerated ?? false,
        mode: data.mode ?? (data.piece ? 'amenagement' : 'dessin'),
        drawPhase: data.drawPhase ?? 'surface_input',
        targetSurfaceM2: data.targetSurfaceM2 ?? 20,
        drawMethod: data.drawMethod ?? null,
        templateShape: data.templateShape ?? 'rectangle',
        templateParams: data.templateParams ?? null,
      });
    } catch { /* ignore corrupt data */ }
  },

  // ── Global ──
  echelle: 1,
  setEchelle: (echelle) => set({ echelle }),

  resetTout: () => set({
    mode: 'dessin', drawPhase: 'surface_input',
    contourPoints: [], contourClosed: false,
    drawnWalls: [], lineStart: null, freehandStroke: [],
    innerWalls: [], innerWallStart: null,
    piece: null, elementsMur: [], fixes: [],
    selectedIds: new Set(), placements: [], nonPlaces: [],
    isGenerated: false, selectedPlacement: null,
    placingTool: null as { type: 'porte' | 'fenetre'; variant?: FenetreVariant } | null,
    targetSurfaceM2: 20, drawMethod: null, activeTool: 'line',
    templateShape: 'rectangle', templateParams: null,
    drawError: null,
  }),
}));
