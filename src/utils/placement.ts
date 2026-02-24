import type { MeubleCatalogue, MeublePlacement, Piece } from '../types';
import { rectsOverlap, meubleBBox, rectDansPoly, polyBounds, segCroiseRect } from './geometry';

const MARGE = 10;
const MARGE_MUR = 5;

export function genererPlacement(
  meubles: MeubleCatalogue[],
  piece: Piece,
  fixes: MeublePlacement[]
): MeublePlacement[] {
  if (meubles.length === 0) return [];
  const bounds = polyBounds(piece.contour);
  const shuffled = [...meubles].sort((a, b) =>
    (b.largeur * b.hauteur) - (a.largeur * a.hauteur) + (Math.random() - 0.5) * 5000
  );
  const placed: MeublePlacement[] = [...fixes];
  const result: MeublePlacement[] = [];

  for (const m of shuffled) {
    const pos = trouverPos(m, placed, piece, bounds);
    if (pos) { placed.push(pos); result.push(pos); }
  }
  return result;
}

function toucheMur(bbox: { x: number; y: number; w: number; h: number }, piece: Piece): boolean {
  for (const w of piece.allWalls) {
    if (segCroiseRect(w.debut, w.fin, bbox, MARGE_MUR)) return true;
  }
  return false;
}

function trouverPos(
  meuble: MeubleCatalogue,
  placed: MeublePlacement[],
  piece: Piece,
  bounds: { minX: number; minY: number; maxX: number; maxY: number }
): MeublePlacement | null {
  const rots = [0, 90] as const;
  const MAX = 400;
  const rw = bounds.maxX - bounds.minX;
  const rh = bounds.maxY - bounds.minY;

  for (let i = 0; i < MAX; i++) {
    const rot = rots[Math.floor(Math.random() * 2)];
    const w = rot === 90 ? meuble.hauteur : meuble.largeur;
    const h = rot === 90 ? meuble.largeur : meuble.hauteur;
    let x: number, y: number;

    if (i < MAX * 0.4) {
      const side = Math.floor(Math.random() * 4);
      const rx = () => bounds.minX + MARGE_MUR + Math.random() * Math.max(0, rw - w - MARGE_MUR * 2);
      const ry = () => bounds.minY + MARGE_MUR + Math.random() * Math.max(0, rh - h - MARGE_MUR * 2);
      if (side === 0) { x = rx(); y = bounds.minY + MARGE_MUR; }
      else if (side === 1) { x = rx(); y = bounds.maxY - h - MARGE_MUR; }
      else if (side === 2) { x = bounds.minX + MARGE_MUR; y = ry(); }
      else { x = bounds.maxX - w - MARGE_MUR; y = ry(); }
    } else {
      x = bounds.minX + MARGE_MUR + Math.random() * Math.max(0, rw - w - MARGE_MUR * 2);
      y = bounds.minY + MARGE_MUR + Math.random() * Math.max(0, rh - h - MARGE_MUR * 2);
    }

    x = Math.round(x / 5) * 5;
    y = Math.round(y / 5) * 5;

    const c: MeublePlacement = {
      catalogueId: meuble.id, nom: meuble.nom,
      largeur: meuble.largeur, hauteur: meuble.hauteur,
      couleur: meuble.couleur, x, y, rotation: rot, fixe: false,
    };
    const bbox = meubleBBox(c);
    if (!rectDansPoly(bbox, piece.contour)) continue;
    if (toucheMur(bbox, piece)) continue;
    if (placed.some((p) => rectsOverlap(bbox, meubleBBox(p), MARGE))) continue;
    return c;
  }

  // Fallback grille
  for (const rot of rots) {
    const w = rot === 90 ? meuble.hauteur : meuble.largeur;
    const h = rot === 90 ? meuble.largeur : meuble.hauteur;
    for (let y = bounds.minY + MARGE_MUR; y + h <= bounds.maxY - MARGE_MUR; y += 10) {
      for (let x = bounds.minX + MARGE_MUR; x + w <= bounds.maxX - MARGE_MUR; x += 10) {
        const c: MeublePlacement = {
          catalogueId: meuble.id, nom: meuble.nom,
          largeur: meuble.largeur, hauteur: meuble.hauteur,
          couleur: meuble.couleur, x, y, rotation: rot, fixe: false,
        };
        const bbox = meubleBBox(c);
        if (!rectDansPoly(bbox, piece.contour)) continue;
        if (toucheMur(bbox, piece)) continue;
        if (placed.some((p) => rectsOverlap(bbox, meubleBBox(p), MARGE))) continue;
        return c;
      }
    }
  }
  return null;
}
