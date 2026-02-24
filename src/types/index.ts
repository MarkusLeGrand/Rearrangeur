export interface Point { x: number; y: number }

export interface WallLine { debut: Point; fin: Point }

export interface Piece {
  contour: Point[];         // polygone fermé (contour extérieur)
  innerWalls: WallLine[];   // murs intérieurs ajoutés par l'utilisateur
  allWalls: WallLine[];     // TOUS les murs = arêtes contour + murs intérieurs
  surface: number;          // m²
}

export type ElementMurType = 'porte' | 'fenetre';

export interface ElementMur {
  id: string;
  type: ElementMurType;
  murIndex: number;       // index dans piece.allWalls
  position: number;       // 0–1 le long du mur
  largeur: number;        // cm
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
export type DrawPhase = 'contour' | 'murs_interieurs';
