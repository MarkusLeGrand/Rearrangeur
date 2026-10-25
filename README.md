# Réarrangeur

> Dessinez votre pièce, choisissez vos meubles : Réarrangeur calcule un aménagement cohérent, et en propose un nouveau à chaque clic.

Une application web 100 % navigateur qui place automatiquement les meubles dans une pièce en suivant de vraies règles d'aménagement intérieur (dégagements, circulation, lumière, orientation), puis affine le résultat par recuit simulé.

---

## À propos

Réarrangeur part d'un constat simple : réorganiser une pièce sur papier est fastidieux, et un placement aléatoire n'a aucun intérêt. L'application guide l'utilisateur en trois étapes :

1. **Dessin** : on trace la pièce (à main levée, à la ligne, ou à partir d'un gabarit), avec ses murs intérieurs.
2. **Aménagement** : on place les portes, les fenêtres et les éléments fixes (cuisine, salle de bain, radiateurs, prises…), puis on coche les meubles voulus et leurs quantités.
3. **Résultat** : un moteur de placement génère le plan. Le bouton **Réarranger** relance le calcul pour obtenir une autre disposition.

Toutes les dimensions sont manipulées en centimètres en interne et affichées en mètres.

## Fonctionnalités

### Dessin de la pièce
- Saisie d'une **surface cible** (m²), puis choix entre **Dessiner** et **Générer**.
- **Outils de dessin** : ligne, stylo à main levée (tracé simplifié par l'algorithme de Douglas-Peucker) et gomme, avec magnétisme sur une grille de 10 cm.
- **Gabarits paramétriques** : rectangle, L, T et U, dimensionnés à partir de la surface cible et ajustables via des poignées.
- Extraction automatique du **contour fermé** à partir des murs tracés, quel que soit leur ordre ou leur sens (`wallsToPolygon`).
- Ajout de **murs intérieurs**, pris en compte dans le rendu et dans les collisions.

### Aménagement
- Placement de **portes** (avec sens d'ouverture inversable) et de **fenêtres** en 4 variantes : standard, petite, porte-fenêtre, baie vitrée.
- **Éléments fixes** déplaçables, orientables et redimensionnables : 27 éléments répartis en Cuisine, Salle de bain et Installations (radiateurs, prises, tableau électrique, cheminée…).
- **Catalogue de 33 meubles** (Salon, Chambre, Salle à manger, Bureau, Divers) avec sélection des quantités.
- Trois **modes de placement** : `optimal`, `cosy` et `minimaliste`, chacun avec ses propres pondérations de score et paramètres d'optimisation.

### Génération et résultat
- Animation de l'apparition des meubles un par un.
- Liste des meubles **non placés** (ex. `Chaise (3/4)`) quand la pièce est trop petite.
- Retouches manuelles : déplacement (magnétisme 10 cm), rotation par poignée, suppression.
- **Export PNG** du plan (rendu Konva en `pixelRatio: 2`).
- **Sauvegarde automatique** dans le `localStorage` (debounce d'1 s) et rechargement au démarrage.
- Page d'accueil de présentation avant l'entrée dans l'outil.

## Le moteur de placement

Le cœur du projet se trouve dans `src/utils/placement/`. Pour chaque génération :

1. **Analyse de la pièce** : informations sur chaque mur (normale, longueur libre), zones d'exclusion (débattement complet des portes, 30 cm devant les fenêtres), positions des prises et radiateurs, zones fonctionnelles déduites des meubles choisis.
2. **Construction gloutonne en 5 phases** (`layout.ts`) :
   ancres (lits, tables) → meubles muraux (canapés, TV, armoires) → satellites (chevets, chaises, table basse) → remplissage (tapis, poufs, fauteuils) → résolution des orientations.
   Chaque meuble est d'abord tenté avec des règles strictes, puis assouplies (`strict` → `relaxed` → `minimal`).
3. **Stratégies spécialisées** (`strategies.ts`) : tête de lit contre un mur, chaises réparties autour d'une table (y compris ronde), tapis centré sous un groupe, placement le long d'un mur…
4. **Optimisation par recuit simulé** (`optimizer.ts`) avec cinq perturbations : déplacement, rotation alignée sur les murs, collage au mur, échange de deux meubles, déplacement de groupe.
5. **Score multicritère** (`scoring.ts`) : proximité des murs, lumière, regroupement fonctionnel, espacement, orientation, circulation, règles de la chambre, ergonomie, alignement, équilibre visuel, portes, prises, radiateurs.

Plusieurs candidats sont générés puis optimisés (12 à 14 selon le mode, 600 à 700 itérations chacun) et le meilleur score est conservé. Les règles de dégagement (`rules.ts`) reprennent des valeurs de référence : 60 cm minimum devant un lit, 90 cm devant une armoire, 80 cm autour d'une table, canapé limité aux 2/3 du mur, etc.

Les validations géométriques (`validation.ts`, `geometry.ts`) s'appuient sur des rectangles orientés : point dans polygone, rectangle tourné inclus dans la pièce, chevauchement entre meubles, intersection segment/rectangle pour qu'aucun meuble ne traverse un mur.

## Stack technique

| Domaine | Outil |
|---|---|
| Interface | React 19 + TypeScript 5.9 |
| Build / dev server | Vite 7 |
| Style | Tailwind CSS 4 (plugin `@tailwindcss/vite`) |
| Canvas 2D | Konva 10 via `react-konva` |
| État global | Zustand 5 (store unique) |
| Qualité | ESLint 9 + `typescript-eslint` |

Aucun backend : tout tourne dans le navigateur.

## Installation & lancement

Prérequis : Node.js (une version récente compatible avec Vite 7, ≥ 20.19) et npm.

```bash
git clone https://github.com/MarkusLeGrand/Rearrangeur.git
cd Rearrangeur
npm install
npm run dev        # http://localhost:5173
```

Autres scripts :

```bash
npm run build      # vérification TypeScript + build de production (dist/)
npm run preview    # sert le build de production
npm run lint       # ESLint
```

## Utilisation

- **Molette** : zoom sur le canvas (dessin, aménagement, résultat).
- **Clic** sur un meuble ou un élément fixe : sélection ; il devient alors déplaçable, avec une poignée de rotation et un bouton de suppression.
- **Clic droit** sur un élément fixe en mode aménagement : suppression.
- Les étapes *Dessin / Aménagement / Résultat* sont accessibles depuis la barre supérieure dès qu'elles sont débloquées.

## Architecture

```
src/
├── App.tsx                  # Page d'accueil puis layout Toolbar + Sidebar + Canvas selon le mode
├── store/index.ts           # Store Zustand : état des 3 modes, génération, sauvegarde localStorage
├── types/index.ts           # Modèle de données (Piece, ElementMur, MeublePlacement…)
├── data/catalogue.ts        # Meubles mobiles et éléments fixes
├── components/
│   ├── LandingPage.tsx      # Page de présentation
│   ├── Toolbar.tsx          # Étapes, Réarranger, export PNG, réinitialisation
│   ├── Sidebar.tsx          # Panneau contextuel (outils, catalogue, inventaire)
│   ├── CanvasDessin.tsx     # Tracé des murs et gabarits
│   ├── CanvasAmenagement.tsx# Portes, fenêtres, éléments fixes
│   ├── CanvasResultat.tsx   # Plan généré et retouches
│   └── FurnitureSymbols.tsx # Symboles graphiques des meubles
└── utils/
    ├── geometry.ts          # Polygones, rectangles orientés, Douglas-Peucker, extraction de contour
    ├── templates.ts         # Gabarits rectangle / L / T / U
    └── placement/           # Moteur de placement
        ├── index.ts         # Point d'entrée genererPlacement + modes
        ├── walls.ts         # Analyse des murs, zones d'exclusion, zones fonctionnelles
        ├── rules.ts         # Règles par meuble (rôle, dégagements, contraintes)
        ├── strategies.ts    # Stratégies de placement spécialisées
        ├── layout.ts        # Construction gloutonne en 5 phases
        ├── optimizer.ts     # Recuit simulé
        ├── scoring.ts       # Fonction de score multicritère
        └── validation.ts    # Validité d'une position
```

Le flux est unidirectionnel : les composants lisent et modifient le store Zustand ; l'action `generer()` appelle `genererPlacement()`, fonction pure qui prend la pièce, les ouvertures, les éléments fixes et les meubles choisis, et renvoie une liste de `MeublePlacement`.

## Pistes d'amélioration

- **Tests unitaires** sur `geometry.ts` et le moteur de placement (aucun test n'existe pour l'instant).
- Exécuter la génération dans un **Web Worker** pour ne pas bloquer l'interface sur les grandes pièces.
- **Génération reproductible** via une graine aléatoire, pour pouvoir partager ou revenir à une disposition.
- **Export / import** du projet en JSON, en plus de la sauvegarde locale.
- Catalogue de meubles **personnalisés** (dimensions saisies par l'utilisateur).
- **Annuler / rétablir** global sur les modifications du plan.
- Vue 3D du résultat.
