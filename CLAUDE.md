# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Réarrangeur — webapp française de réagencement automatique de pièce. L'utilisateur dessine sa pièce (murs libres, y compris intérieurs), place portes/fenêtres/éléments fixes, coche des meubles dans un catalogue, puis génère un plan avec placement automatique. Un bouton "Réarranger" régénère une disposition différente.

## Commands

```bash
npm run dev      # Serveur de développement Vite (http://localhost:5173)
npm run build    # Type-check TypeScript + build production (tsc -b && vite build)
npm run lint     # ESLint
npm run preview  # Prévisualiser le build production
```

## Tech Stack

- React 19 + TypeScript 5.9 + Vite 7
- Tailwind CSS 4 (via `@tailwindcss/vite` plugin, pas de fichier tailwind.config)
- react-konva / Konva.js pour le canvas 2D (Stage, Layer, Line, Rect, Text, Arc, Circle)
- Zustand 5 pour le state management (store unique dans `src/store/index.ts`)
- Toutes les dimensions internes sont en **centimètres** (cm). Affichage en mètres pour l'utilisateur.

## Architecture

```
src/
  App.tsx              # Layout principal: Toolbar + Sidebar + Canvas selon le mode
  store/index.ts       # Store Zustand unique (état global de l'app)
  types/index.ts       # Toutes les interfaces TypeScript
  data/catalogue.ts    # Catalogue meubles mobiles (18) + éléments fixes (11)
  components/
    Toolbar.tsx        # Barre supérieure: étapes, actions, zoom, export PNG
    Sidebar.tsx        # Panneau gauche contextuel (change selon le mode)
    CanvasDessin.tsx    # Canvas mode dessin: placement libre de murs
    CanvasAmenagement.tsx  # Canvas mode aménagement: portes/fenêtres/fixes
    CanvasResultat.tsx     # Canvas mode résultat: affichage du plan généré
  utils/
    geometry.ts        # Fonctions géométriques (point-in-polygon, AABB, Liang-Barsky, etc.)
    placement.ts       # Algorithme de placement automatique des meubles
```

## Flux applicatif (3 modes)

1. **`dessin`** — Dessin libre de murs via un système de graphe (points + segments). L'utilisateur clique pour placer des points, chaque clic trace un mur depuis le point actif (vert). Cliquer un point existant permet de repartir de là. Validation manuelle via bouton "Valider" (≥3 murs). L'algorithme de contour extérieur utilise un parcours par angle minimum (rightmost-turn). Les murs intérieurs sont préservés dans `Piece.allWalls`.

2. **`amenagement`** — 3 onglets dans la sidebar:
   - **Murs**: placement de portes/fenêtres (clic sur un mur, snap au plus proche)
   - **Fixes**: drag-and-drop d'éléments fixes (cuisine/salle de bain) qui ne bougent pas au réagencement
   - **Meubles**: sélection par checkbox des meubles à placer automatiquement

3. **`resultat`** — Affichage du plan généré. Bouton "Réarranger" pour une nouvelle disposition, "Modifier" pour revenir en amenagement, "Export PNG" pour télécharger.

## Concepts clés

### Système de dessin (graphe)
- `drawPoints: Point[]` + `drawWalls: WallSegment[]` (indices from/to) + `activePointIndex`
- Snap à 50cm sur la grille, snap aux points existants dans un rayon de 25cm
- `validerPiece()` extrait le contour extérieur + conserve TOUS les murs dans `allWalls`

### Murs et collisions
- `piece.allWalls` contient TOUS les murs (extérieurs ET intérieurs) — c'est la source de vérité pour le rendu des murs et le placement des portes/fenêtres
- `piece.points` est le polygone du contour extérieur uniquement (pour le test point-in-polygon et l'aire)
- `segmentIntersectsRect` (Liang-Barsky) vérifie qu'un meuble ne traverse pas un mur
- Les portes/fenêtres stockent un `murIndex` indexé dans `piece.allWalls`

### Placement automatique (`genererPlacement`)
- Tri par taille décroissante avec aléatoire
- 40% des tentatives près des murs (bords), 60% aléatoire
- Validation: dans le polygone + ne traverse aucun mur + pas de collision avec meubles placés
- Fallback grille systématique si le random échoue
- Les éléments fixes sont passés comme obstacles pré-placés

### Coordonnées canvas
- Toutes les valeurs internes en cm
- `toScreen(x, y)` convertit cm → pixels écran avec padding et scale
- Grille duale: 50cm (fine) + 1m (épaisse), labels en mètres
- Canvas responsive via `ResizeObserver`
