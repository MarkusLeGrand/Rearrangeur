import type { MeubleCatalogue } from '../types';

export const catalogue: MeubleCatalogue[] = [
  { id: 'canape3', nom: 'Canapé 3 places', largeur: 220, hauteur: 90, couleur: '#6B7280', categorie: 'Salon' },
  { id: 'canape2', nom: 'Canapé 2 places', largeur: 160, hauteur: 85, couleur: '#6B7280', categorie: 'Salon' },
  { id: 'fauteuil', nom: 'Fauteuil', largeur: 80, hauteur: 80, couleur: '#9CA3AF', categorie: 'Salon' },
  { id: 'tablebasse', nom: 'Table basse', largeur: 120, hauteur: 60, couleur: '#92400E', categorie: 'Salon' },
  { id: 'meubletv', nom: 'Meuble TV', largeur: 160, hauteur: 45, couleur: '#78350F', categorie: 'Salon' },
  { id: 'biblio', nom: 'Bibliothèque', largeur: 120, hauteur: 35, couleur: '#78350F', categorie: 'Salon' },

  { id: 'litdouble', nom: 'Lit double', largeur: 160, hauteur: 200, couleur: '#7C3AED', categorie: 'Chambre' },
  { id: 'litsimple', nom: 'Lit simple', largeur: 90, hauteur: 190, couleur: '#8B5CF6', categorie: 'Chambre' },
  { id: 'chevet', nom: 'Table de chevet', largeur: 45, hauteur: 40, couleur: '#A78BFA', categorie: 'Chambre' },
  { id: 'armoire', nom: 'Armoire', largeur: 150, hauteur: 60, couleur: '#5B21B6', categorie: 'Chambre' },
  { id: 'commode', nom: 'Commode', largeur: 100, hauteur: 50, couleur: '#6D28D9', categorie: 'Chambre' },

  { id: 'table6', nom: 'Table 6 pers.', largeur: 180, hauteur: 90, couleur: '#B45309', categorie: 'Salle à manger' },
  { id: 'table4', nom: 'Table 4 pers.', largeur: 120, hauteur: 80, couleur: '#B45309', categorie: 'Salle à manger' },
  { id: 'chaise', nom: 'Chaise', largeur: 45, hauteur: 45, couleur: '#D97706', categorie: 'Salle à manger' },
  { id: 'buffet', nom: 'Buffet', largeur: 160, hauteur: 50, couleur: '#92400E', categorie: 'Salle à manger' },

  { id: 'bureau', nom: 'Bureau', largeur: 140, hauteur: 70, couleur: '#0369A1', categorie: 'Bureau' },
  { id: 'chaisebureau', nom: 'Chaise de bureau', largeur: 55, hauteur: 55, couleur: '#0284C7', categorie: 'Bureau' },
  { id: 'etagere', nom: 'Étagère', largeur: 80, hauteur: 30, couleur: '#075985', categorie: 'Bureau' },
];

export const fixedCatalogue: MeubleCatalogue[] = [
  { id: 'evier', nom: 'Évier', largeur: 80, hauteur: 60, couleur: '#60A5FA', categorie: 'Cuisine', fixe: true },
  { id: 'plantravail', nom: 'Plan de travail', largeur: 200, hauteur: 60, couleur: '#059669', categorie: 'Cuisine', fixe: true },
  { id: 'ilot', nom: 'Îlot central', largeur: 120, hauteur: 80, couleur: '#047857', categorie: 'Cuisine', fixe: true },
  { id: 'frigo', nom: 'Réfrigérateur', largeur: 70, hauteur: 65, couleur: '#D1D5DB', categorie: 'Cuisine', fixe: true },
  { id: 'four', nom: 'Four', largeur: 60, hauteur: 60, couleur: '#374151', categorie: 'Cuisine', fixe: true },
  { id: 'lavevaisselle', nom: 'Lave-vaisselle', largeur: 60, hauteur: 60, couleur: '#9CA3AF', categorie: 'Cuisine', fixe: true },

  { id: 'baignoire', nom: 'Baignoire', largeur: 170, hauteur: 75, couleur: '#2563EB', categorie: 'Salle de bain', fixe: true },
  { id: 'douche', nom: 'Douche', largeur: 90, hauteur: 90, couleur: '#3B82F6', categorie: 'Salle de bain', fixe: true },
  { id: 'lavabo', nom: 'Lavabo', largeur: 60, hauteur: 45, couleur: '#60A5FA', categorie: 'Salle de bain', fixe: true },
  { id: 'wc', nom: 'WC', largeur: 40, hauteur: 65, couleur: '#93C5FD', categorie: 'Salle de bain', fixe: true },
  { id: 'lavelinge', nom: 'Lave-linge', largeur: 60, hauteur: 60, couleur: '#E5E7EB', categorie: 'Salle de bain', fixe: true },
];

export const categories = [...new Set(catalogue.map((m) => m.categorie))];
export const fixedCategories = [...new Set(fixedCatalogue.map((m) => m.categorie))];
