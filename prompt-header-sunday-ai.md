# PROMPT — Header "Floating Pill + Expanding Menu Panel"
# Référence : sunday.ai | Projet cible : Réarrangeur

---

## 1. ÉTAT FERMÉ — La Pilule Flottante

Le header est un **élément flottant centré horizontalement** en haut de la page. Ce n'est PAS une barre pleine largeur. C'est une **capsule/pilule compacte**.

### Forme & Dimensions
- **Largeur** : ~280-320px (juste assez pour contenir les 3 éléments)
- **Hauteur** : ~48-56px
- **Border-radius** : totalement arrondi (`border-radius: 9999px` ou `rounded-full`)
- **Position** : `position: fixed`, centré horizontalement (`left: 50%; transform: translateX(-50%)`), avec un `top: 16-24px`
- **z-index** : très élevé (999+)
- **Fond** : blanc `#FFFFFF` avec une très légère ombre (`box-shadow: 0 2px 12px rgba(0,0,0,0.08)`) ou un border subtil `1px solid rgba(0,0,0,0.06)`

### Contenu (3 éléments alignés horizontalement, `display: flex; align-items: center; justify-content: space-between`)
```
┌──────────────────────────────────────┐
│   🔲 Logo     WORDMARK      ☰ Menu  │
└──────────────────────────────────────┘
```

- **À gauche** : Icône/logo (petit pictogramme ~24px, noir, forme abstraite — dans le cas de Sunday c'est un petit robot stylisé)
- **Au centre** : Le nom de marque en **uppercase lettres espacées** (tracking élargi). Typographie : sans-serif **géométrique bold** (ex: `font-weight: 700`, `letter-spacing: 0.12em`, `text-transform: uppercase`). Taille ~14-16px. Couleur noire `#1A1A1A`.
- **À droite** : Icône hamburger — 2 lignes horizontales fines (pas 3 !), `width: 20px`, `stroke-width: 1.5-2px`, noires

### Espacement interne
- `padding: 12px 20px` environ — l'ensemble est compact et aéré
- Gap entre les 3 éléments : `gap: 16-24px`

### Comportement au scroll
- La pilule reste fixe en haut
- Optionnel : légère réduction d'opacité ou scale au scroll, puis retour à 100% quand on arrête de scroller

---

## 2. ÉTAT OUVERT — Le Panel Menu

Au clic sur le hamburger, la pilule **s'expand** en un **panel rectangulaire** qui prend quasiment toute la largeur du viewport (avec des marges latérales).

### Animation d'ouverture
- La pilule se **transforme morphiquement** : elle grandit en largeur et en hauteur pour devenir un rectangle arrondi
- `width` passe de ~300px à ~90vw (max ~1200px)
- `height` passe de ~50px à ~400-500px
- `border-radius` passe de `9999px` à `16-24px`
- Durée : **400-600ms**, easing : `cubic-bezier(0.4, 0, 0.2, 1)` (ease-out prononcé)
- Le contenu intérieur apparaît en **fade-in décalé** (~100ms après le début de l'expansion)

### Structure du panel ouvert
```
┌──────────────────────────────────────────────────────────────┐
│  🔲 Logo              WORDMARK                          ✕   │  ← Header bar (même position)
│                                                              │
│  Technology          ┌─────────────────────────────┐         │
│  Company             │                             │         │
│  Careers             │    [Image / Vidéo]          │         │
│  Journal             │    avec bouton "Our story"  │         │
│  Beta                │                             │         │
│                      └─────────────────────────────┘         │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│  Tagline gauche       Info centre        CTA droite ●        │  ← Footer bar
└──────────────────────────────────────────────────────────────┘
```

### Détails du layout intérieur

**Header du panel (top)** :
- IDENTIQUE à la pilule fermée SAUF : le hamburger (☰) est remplacé par une croix (✕)
- L'icône ✕ a une animation de rotation subtile à l'apparition (`rotate(0deg → 90deg)`, 300ms)

**Zone principale (milieu)** — `display: grid; grid-template-columns: 1fr 1fr` ou flexbox :

- **Colonne gauche — Liens de navigation** :
  - Liste verticale de 4-5 liens
  - Typographie : sans-serif, `font-size: 18-22px`, `font-weight: 500-600`
  - Couleur : noir `#1A1A1A`
  - Espacement : `line-height: 2` ou `gap: 12-16px` entre chaque lien
  - Animation d'entrée : **stagger** — chaque lien apparaît avec un décalage de 50-80ms (translateY(10px) + opacity 0 → translateY(0) + opacity 1)
  - Hover : le lien se souligne ou se décale légèrement vers la droite (`translateX(4px)`)

- **Colonne droite — Média (image/vidéo)** :
  - Un bloc rectangulaire avec `border-radius: 12px`, `overflow: hidden`
  - Contient une image ou un poster vidéo
  - Un bouton/badge overlay sur l'image : icône ▶ play + texte "Our story" dans un tag arrondi semi-transparent (`backdrop-filter: blur(8px)`, fond `rgba(255,255,255,0.7)`)
  - L'image fait un léger **zoom-in** à l'ouverture du menu (scale de 1.05 à 1 en 600ms)

**Footer du panel (bas)** — barre d'information :
- Séparée du contenu principal par un `border-top: 1px solid rgba(0,0,0,0.08)`
- `display: flex; justify-content: space-between; align-items: center`
- 3 éléments textuels :
  - Gauche : Tagline (ex: "The helpful robotics company") — petite taille, gris moyen
  - Centre : Info (ex: "Launching 2026") — petite taille, gris moyen
  - Droite : CTA (ex: "Beta Application") avec un **point jaune** `#F7E731` (`●`) qui pulse doucement (animation `scale` en boucle ou glow)
- Typographie : `font-size: 12-14px`, `color: #666` ou `#888`

---

## 3. ANIMATION DE FERMETURE

L'inverse de l'ouverture :
- Le contenu intérieur fait un fade-out rapide (~150ms)
- Le panel se **contracte** morphiquement pour redevenir la pilule
- Le hamburger (☰) réapparaît à la place de la croix (✕)
- Durée : **300-400ms** (légèrement plus rapide que l'ouverture pour que ça paraisse réactif)

---

## 4. ADAPTATION AU PROJET "RÉARRANGEUR"

Pour adapter ce pattern à ton projet :

### Pilule fermée
```
┌──────────────────────────────────────┐
│   🔲        RÉARRANGEUR         ☰   │
└──────────────────────────────────────┘
```

### Panel ouvert
```
┌──────────────────────────────────────────────────────────────┐
│  🔲             RÉARRANGEUR                             ✕   │
│                                                              │
│  Sauvegarder         ┌─────────────────────────────┐         │
│  Charger             │                             │         │
│  Recommencer         │   [Preview / Image]         │         │
│                      │                             │         │
│                      └─────────────────────────────┘         │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│  01 Pièce             02 Aménagement      03 Résultat       │
└──────────────────────────────────────────────────────────────┘
```

- Les **steps** (01 Pièce, 02 Aménagement, 03 Résultat) vont dans le footer du panel avec le step actif highlighted en jaune
- Les **actions** (Sauvegarder, Charger, Recommencer) deviennent les liens principaux
- La colonne droite peut contenir un aperçu du projet en cours ou une image déco

### Header bar (état scroll dans le configurateur)
La pilule peut aussi afficher les steps en mode compact :
```
┌────────────────────────────────────────────────────────────────┐
│  🔲  RÉARRANGEUR    01 PIÈCE · 02 AMÉNAGEMENT · 03 RÉSULTAT  ─── ●─── ☰  │
└────────────────────────────────────────────────────────────────┘
```
Avec le step actif en blanc/jaune, les autres en gris atténué — et le toggle jaune (●───) à droite comme dans ta capture actuelle.

---

## 5. TOKENS DE DESIGN

| Token | Valeur |
|---|---|
| `--pill-bg` | `#FFFFFF` |
| `--pill-shadow` | `0 2px 12px rgba(0,0,0,0.08)` |
| `--pill-radius-closed` | `9999px` |
| `--pill-radius-open` | `16px` |
| `--pill-width-closed` | `300px` |
| `--pill-width-open` | `min(90vw, 1200px)` |
| `--pill-height-closed` | `52px` |
| `--pill-height-open` | `auto` (min ~400px) |
| `--text-primary` | `#1A1A1A` |
| `--text-secondary` | `#888888` |
| `--accent` | `#F7E731` |
| `--transition-open` | `500ms cubic-bezier(0.4, 0, 0.2, 1)` |
| `--transition-close` | `350ms cubic-bezier(0.4, 0, 0.2, 1)` |
| `--stagger-delay` | `60ms` par item |

---

## 6. POINTS CRITIQUES — Ce qui fait la différence

1. **C'est une PILULE, pas une barre** — l'erreur la plus courante est de faire un header full-width. Ici c'est un objet flottant, compact, centré.
2. **L'expansion est morphique** — le container CHANGE de forme. Ce n'est pas un dropdown qui apparaît EN DESSOUS. C'est le même élément qui grandit.
3. **Le layout ouvert est structuré** — deux colonnes, un footer. Pas juste une liste centrée sur fond noir.
4. **Le fond reste BLANC** — même ouvert, le panel est blanc/clair. Pas de fond noir.
5. **L'image dans le menu** — c'est ce qui donne du cachet. Sans elle, le menu paraît vide et basique.
6. **Le footer info** — ces 3 éléments en bas du panel ancrent le branding et donnent une raison d'agir (CTA).