export interface Point { x: number; y: number }

export interface WallLine { debut: Point; fin: Point }

export interface Piece {
  contour: Point[];         // polygone fermé (contour extérieur)
  innerWalls: WallLine[];   // murs intérieurs ajoutés par l'utilisateur
  allWalls: WallLine[];     // TOUS les murs = arêtes contour + murs intérieurs
  surface: number;          // m²
}

export type ElementMurType = 'porte' | 'fenetre';
export type FenetreVariant = 'standard' | 'petite' | 'porte_fenetre' | 'baie_vitree';

export interface ElementMur {
  id: string;
  type: ElementMurType;
  murIndex: number;       // index dans piece.allWalls
  position: number;       // 0–1 le long du mur
  largeur: number;        // cm
  sens: 1 | -1;           // sens d'ouverture (+1 normal, -1 inversé)
  fenetreVariant?: FenetreVariant;
}

export interface MeubleCatalogue {
  id: string;
  nom: string;
  largeur: number;        // cm
  hauteur: number;        // cm
  couleur: string;
  categorie: string;
  fixe?: boolean;
}

export interface MeublePlacement {
  catalogueId: string;
  nom: string;
  largeur: number;
  hauteur: number;
  couleur: string;
  x: number;
  y: number;
  rotation: number;
  fixe: boolean;
}

export type AppMode = 'dessin' | 'amenagement' | 'resultat';
export type DrawPhase = 'surface_input' | 'mode_choice' | 'contour_draw' | 'contour_template' | 'murs_interieurs' | 'validation';
export type DrawMethod = 'dessiner' | 'generer';
export type DrawTool = 'line' | 'freehand' | 'arc' | 'eraser';
export type TemplateShape = 'rectangle' | 'L' | 'T' | 'U';

export interface TemplateParams {
  shape: TemplateShape;
  targetArea: number;  // cm²
  values: Record<string, number>;
}

export interface TemplateHandle {
  id: string;
  paramKey: string;
  position: Point;
  axis: 'x' | 'y';
  min: number;
  max: number;
}

export interface TemplateResult {
  contour: Point[];
  handles: TemplateHandle[];
}
