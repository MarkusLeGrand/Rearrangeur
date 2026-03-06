import type { MeubleCatalogue } from '../types';

export const catalogue: MeubleCatalogue[] = [
  { id: 'canape3', nom: 'Canapé 3 places', largeur: 220, hauteur: 90, couleur: '#6B7280', categorie: 'Salon' },
  { id: 'canape2', nom: 'Canapé 2 places', largeur: 160, hauteur: 85, couleur: '#6B7280', categorie: 'Salon' },
  { id: 'canapeangle', nom: 'Canapé d\'angle', largeur: 250, hauteur: 200, couleur: '#4B5563', categorie: 'Salon' },
  { id: 'fauteuil', nom: 'Fauteuil', largeur: 80, hauteur: 80, couleur: '#9CA3AF', categorie: 'Salon' },
  { id: 'pouf', nom: 'Pouf', largeur: 50, hauteur: 50, couleur: '#D1D5DB', categorie: 'Salon' },
  { id: 'tablebasse', nom: 'Table basse', largeur: 120, hauteur: 60, couleur: '#92400E', categorie: 'Salon' },
  { id: 'meubletv', nom: 'Meuble TV', largeur: 160, hauteur: 45, couleur: '#78350F', categorie: 'Salon' },
  { id: 'biblio', nom: 'Bibliothèque', largeur: 120, hauteur: 35, couleur: '#78350F', categorie: 'Salon' },
  { id: 'console', nom: 'Console', largeur: 100, hauteur: 35, couleur: '#A16207', categorie: 'Salon' },

  { id: 'litdouble', nom: 'Lit double', largeur: 160, hauteur: 200, couleur: '#7C3AED', categorie: 'Chambre' },
  { id: 'litsimple', nom: 'Lit simple', largeur: 90, hauteur: 190, couleur: '#8B5CF6', categorie: 'Chambre' },
  { id: 'lit140', nom: 'Lit 140', largeur: 140, hauteur: 190, couleur: '#7C3AED', categorie: 'Chambre' },
  { id: 'chevet', nom: 'Table de chevet', largeur: 45, hauteur: 40, couleur: '#A78BFA', categorie: 'Chambre' },
  { id: 'armoire', nom: 'Armoire', largeur: 150, hauteur: 60, couleur: '#5B21B6', categorie: 'Chambre' },
  { id: 'armoire2p', nom: 'Armoire 2 portes', largeur: 100, hauteur: 55, couleur: '#5B21B6', categorie: 'Chambre' },
  { id: 'commode', nom: 'Commode', largeur: 100, hauteur: 50, couleur: '#6D28D9', categorie: 'Chambre' },
  { id: 'coiffeuse', nom: 'Coiffeuse', largeur: 100, hauteur: 45, couleur: '#A78BFA', categorie: 'Chambre' },

  { id: 'table6', nom: 'Table 6 pers.', largeur: 180, hauteur: 90, couleur: '#B45309', categorie: 'Salle à manger' },
  { id: 'table4', nom: 'Table 4 pers.', largeur: 120, hauteur: 80, couleur: '#B45309', categorie: 'Salle à manger' },
  { id: 'tableronde', nom: 'Table ronde', largeur: 110, hauteur: 110, couleur: '#B45309', categorie: 'Salle à manger' },
  { id: 'chaise', nom: 'Chaise', largeur: 45, hauteur: 45, couleur: '#D97706', categorie: 'Salle à manger' },
  { id: 'tabouret', nom: 'Tabouret', largeur: 35, hauteur: 35, couleur: '#D97706', categorie: 'Salle à manger' },
  { id: 'buffet', nom: 'Buffet', largeur: 160, hauteur: 50, couleur: '#92400E', categorie: 'Salle à manger' },
  { id: 'vaisselier', nom: 'Vaisselier', largeur: 120, hauteur: 45, couleur: '#92400E', categorie: 'Salle à manger' },

  { id: 'bureau', nom: 'Bureau', largeur: 140, hauteur: 70, couleur: '#0369A1', categorie: 'Bureau' },
  { id: 'bureauangle', nom: 'Bureau d\'angle', largeur: 160, hauteur: 160, couleur: '#0369A1', categorie: 'Bureau' },
  { id: 'chaisebureau', nom: 'Chaise de bureau', largeur: 55, hauteur: 55, couleur: '#0284C7', categorie: 'Bureau' },
  { id: 'etagere', nom: 'Étagère', largeur: 80, hauteur: 30, couleur: '#075985', categorie: 'Bureau' },
  { id: 'classeur', nom: 'Classeur', largeur: 45, hauteur: 60, couleur: '#075985', categorie: 'Bureau' },

  { id: 'canapelit', nom: 'Canapé-lit', largeur: 200, hauteur: 90, couleur: '#6B7280', categorie: 'Divers' },
  { id: 'tapis', nom: 'Tapis', largeur: 200, hauteur: 140, couleur: '#D4C4A8', categorie: 'Divers' },
  { id: 'porte_manteaux', nom: 'Porte-manteaux', largeur: 40, hauteur: 40, couleur: '#78716C', categorie: 'Divers' },
  { id: 'meuble_chaussures', nom: 'Meuble chaussures', largeur: 80, hauteur: 35, couleur: '#78350F', categorie: 'Divers' },
];

export const fixedCatalogue: MeubleCatalogue[] = [
  { id: 'evier', nom: 'Évier', largeur: 80, hauteur: 60, couleur: '#60A5FA', categorie: 'Cuisine', fixe: true },
  { id: 'plantravail', nom: 'Plan de travail', largeur: 200, hauteur: 60, couleur: '#059669', categorie: 'Cuisine', fixe: true },
  { id: 'ilot', nom: 'Îlot central', largeur: 120, hauteur: 80, couleur: '#047857', categorie: 'Cuisine', fixe: true },
  { id: 'frigo', nom: 'Réfrigérateur', largeur: 70, hauteur: 65, couleur: '#D1D5DB', categorie: 'Cuisine', fixe: true },
  { id: 'four', nom: 'Four', largeur: 60, hauteur: 60, couleur: '#374151', categorie: 'Cuisine', fixe: true },
  { id: 'lavevaisselle', nom: 'Lave-vaisselle', largeur: 60, hauteur: 60, couleur: '#9CA3AF', categorie: 'Cuisine', fixe: true },
  { id: 'microondes', nom: 'Micro-ondes', largeur: 50, hauteur: 35, couleur: '#6B7280', categorie: 'Cuisine', fixe: true },
  { id: 'hotte', nom: 'Hotte', largeur: 60, hauteur: 50, couleur: '#9CA3AF', categorie: 'Cuisine', fixe: true },
  { id: 'congelateur', nom: 'Congélateur', largeur: 60, hauteur: 60, couleur: '#D1D5DB', categorie: 'Cuisine', fixe: true },

  { id: 'baignoire', nom: 'Baignoire', largeur: 170, hauteur: 75, couleur: '#2563EB', categorie: 'Salle de bain', fixe: true },
  { id: 'douche', nom: 'Douche', largeur: 90, hauteur: 90, couleur: '#3B82F6', categorie: 'Salle de bain', fixe: true },
  { id: 'doucheitalienne', nom: 'Douche italienne', largeur: 120, hauteur: 90, couleur: '#3B82F6', categorie: 'Salle de bain', fixe: true },
  { id: 'lavabo', nom: 'Lavabo', largeur: 60, hauteur: 45, couleur: '#60A5FA', categorie: 'Salle de bain', fixe: true },
  { id: 'doublevasque', nom: 'Double vasque', largeur: 120, hauteur: 50, couleur: '#60A5FA', categorie: 'Salle de bain', fixe: true },
  { id: 'wc', nom: 'WC', largeur: 40, hauteur: 65, couleur: '#93C5FD', categorie: 'Salle de bain', fixe: true },
  { id: 'lavelinge', nom: 'Lave-linge', largeur: 60, hauteur: 60, couleur: '#E5E7EB', categorie: 'Salle de bain', fixe: true },
  { id: 'sechelinge', nom: 'Sèche-linge', largeur: 60, hauteur: 60, couleur: '#E5E7EB', categorie: 'Salle de bain', fixe: true },
  { id: 'secheserviettes', nom: 'Sèche-serviettes', largeur: 50, hauteur: 15, couleur: '#9CA3AF', categorie: 'Salle de bain', fixe: true },

  { id: 'radiateur', nom: 'Radiateur', largeur: 80, hauteur: 15, couleur: '#F87171', categorie: 'Installations', fixe: true },
  { id: 'radiateurpetit', nom: 'Petit radiateur', largeur: 50, hauteur: 12, couleur: '#F87171', categorie: 'Installations', fixe: true },
  { id: 'prisecourant', nom: 'Prise de courant', largeur: 8, hauteur: 8, couleur: '#FBBF24', categorie: 'Installations', fixe: true },
  { id: 'interrupteur', nom: 'Interrupteur', largeur: 8, hauteur: 8, couleur: '#FCD34D', categorie: 'Installations', fixe: true },
  { id: 'tableauelectrique', nom: 'Tableau électrique', largeur: 40, hauteur: 30, couleur: '#F59E0B', categorie: 'Installations', fixe: true },
  { id: 'cheminee', nom: 'Cheminée', largeur: 120, hauteur: 50, couleur: '#DC2626', categorie: 'Installations', fixe: true },
  { id: 'poele', nom: 'Poêle', largeur: 60, hauteur: 60, couleur: '#B91C1C', categorie: 'Installations', fixe: true },
  { id: 'cumulus', nom: 'Cumulus', largeur: 60, hauteur: 60, couleur: '#E5E7EB', categorie: 'Installations', fixe: true },
  { id: 'climatiseur', nom: 'Climatiseur', largeur: 80, hauteur: 20, couleur: '#7DD3FC', categorie: 'Installations', fixe: true },
];

export const categories = [...new Set(catalogue.map((m) => m.categorie))];
export const fixedCategories = [...new Set(fixedCatalogue.map((m) => m.categorie))];
