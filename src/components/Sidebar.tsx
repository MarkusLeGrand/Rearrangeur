import { useState, useEffect } from 'react';
import { catalogue, fixedCatalogue, categories, fixedCategories } from '../data/catalogue';
import { useStore } from '../store';
import type { MeubleCatalogue, DrawTool, TemplateShape } from '../types';
import { aire, wallsSurface } from '../utils/geometry';
import { generateTemplate } from '../utils/templates';

export function Sidebar() {
  const mode = useStore((s) => s.mode);
  if (mode === 'dessin') return <SidebarDessin />;
  if (mode === 'amenagement') return <SidebarAmenagement />;
  return <SidebarResultat />;
}

/* ═══════════════════════════════════════════
   Shared step layout — every step looks the same
   ═══════════════════════════════════════════ */

function StepShell({ title, stepLabel, stepIdx, totalSteps, children }: {
  title: string;
  stepLabel: string;
  stepIdx: number;
  totalSteps: number;
  children: React.ReactNode;
}) {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-title">{title}</div>
      </div>
      <div className="draw-progress">
        {Array.from({ length: totalSteps }, (_, i) => (
          <div key={i} className="draw-progress-step" style={{ display: 'flex', alignItems: 'center' }}>
            <div className={`draw-progress-dot${i === stepIdx ? ' active' : i < stepIdx ? ' done' : ''}`} />
            {i < totalSteps - 1 && <div className={`draw-progress-line${i < stepIdx ? ' done' : ''}`} />}
          </div>
        ))}
      </div>
      <div className="sidebar-body">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(0,0,0,0.2)', fontFamily: 'Inter', letterSpacing: '0.06em' }}>
            {stepIdx + 1}/{totalSteps}
          </span>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--h-noir)', fontFamily: 'Inter' }}>
            {stepLabel}
          </span>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   DESSIN — 4 étapes
   ═══════════════════════════════════════════ */

const DESSIN_STEPS = 4;
const dessinIdx: Record<string, number> = {
  surface_input: 0, mode_choice: 1, contour_draw: 2, contour_template: 2, murs_interieurs: 3,
};
const dessinLabels: Record<string, string> = {
  surface_input: 'Surface', mode_choice: 'Methode', contour_draw: 'Contour', contour_template: 'Contour', murs_interieurs: 'Murs interieurs',
};

const toolIcons: Record<DrawTool, string> = { line: '/', freehand: '~', eraser: 'x' };
const toolLabels: Record<DrawTool, string> = { line: 'Ligne', freehand: 'Stylo', eraser: 'Gomme' };
const tools: DrawTool[] = ['line', 'freehand', 'eraser'];
const shapeIcons: Record<TemplateShape, string> = { rectangle: '\u25ad', L: 'L', T: 'T', U: 'U' };

function ToolPalette() {
  const activeTool = useStore((s) => s.activeTool);
  const setActiveTool = useStore((s) => s.setActiveTool);
  return (
    <div className="tool-palette">
      {tools.map((t) => (
        <button key={t} onClick={() => setActiveTool(t)}
          className={`tool-btn${activeTool === t ? ' active' : ''}`}>
          <span className="tool-btn-icon">{toolIcons[t]}</span>
          {toolLabels[t]}
        </button>
      ))}
    </div>
  );
}

function SidebarDessin() {
  const phase = useStore((s) => s.drawPhase);
  const targetSurfaceM2 = useStore((s) => s.targetSurfaceM2);
  const setTargetSurfaceM2 = useStore((s) => s.setTargetSurfaceM2);
  const setDrawPhase = useStore((s) => s.setDrawPhase);
  const drawMethod = useStore((s) => s.drawMethod);
  const setDrawMethod = useStore((s) => s.setDrawMethod);
  const drawnWalls = useStore((s) => s.drawnWalls);
  const innerWalls = useStore((s) => s.innerWalls);
  const validerContour = useStore((s) => s.validerContour);
  const closeContourFromTemplate = useStore((s) => s.closeContourFromTemplate);
  const templateShape = useStore((s) => s.templateShape);
  const setTemplateShape = useStore((s) => s.setTemplateShape);
  const templateParams = useStore((s) => s.templateParams);
  const validerPiece = useStore((s) => s.validerPiece);
  const drawError = useStore((s) => s.drawError);
  const setDrawError = useStore((s) => s.setDrawError);

  const [m2Input, setM2Input] = useState(String(targetSurfaceM2));
  useEffect(() => { setM2Input(String(targetSurfaceM2)); }, [targetSurfaceM2]);
  const commitM2 = () => {
    const val = Number(m2Input);
    if (!isNaN(val) && val >= 5 && val <= 200) setTargetSurfaceM2(Math.round(val));
    else setM2Input(String(targetSurfaceM2));
  };

  const templateSurface = templateParams
    ? Math.round(aire(generateTemplate(templateParams).contour) / 10000 * 10) / 10
    : 0;
  const liveSurface = wallsSurface(drawnWalls);

  return (
    <StepShell title="Dessiner la piece" stepLabel={dessinLabels[phase] ?? ''} stepIdx={dessinIdx[phase] ?? 0} totalSteps={DESSIN_STEPS}>

      {/* ── 1. Surface ── */}
      {phase === 'surface_input' && (
        <>
          <p className="sidebar-desc">Quelle surface approximative ?</p>
          <div className="m2-input-group">
            <input type="number" min={5} max={200} value={m2Input}
              onChange={(e) => setM2Input(e.target.value)}
              onBlur={commitM2}
              onKeyDown={(e) => { if (e.key === 'Enter') commitM2(); }}
              className="m2-input" />
            <span className="m2-input-unit">m&sup2;</span>
          </div>
          <input type="range" min={5} max={200} value={targetSurfaceM2}
            onChange={(e) => setTargetSurfaceM2(Number(e.target.value))}
            className="m2-slider" />
          <button onClick={() => setDrawPhase('mode_choice')} className="sidebar-btn sidebar-btn--primary">
            Continuer
          </button>
        </>
      )}

      {/* ── 2. Méthode ── */}
      {phase === 'mode_choice' && (
        <>
          <p className="sidebar-desc">Comment definir le contour ?</p>
          <div className="mode-cards">
            <button onClick={() => setDrawMethod('dessiner')} className="mode-card">
              <div className="mode-card-icon">&#9998;</div>
              <div className="mode-card-text">
                <div className="mode-card-title">Dessiner</div>
                <div className="mode-card-desc">Tracez librement</div>
              </div>
            </button>
            <button onClick={() => setDrawMethod('generer')} className="mode-card">
              <div className="mode-card-icon">&#9632;</div>
              <div className="mode-card-text">
                <div className="mode-card-title">Generer</div>
                <div className="mode-card-desc">Forme + dimensions</div>
              </div>
            </button>
          </div>
          <button onClick={() => setDrawPhase('surface_input')} className="sidebar-btn sidebar-btn--ghost">
            Retour
          </button>
        </>
      )}

      {/* ── 3a. Contour dessin ── */}
      {phase === 'contour_draw' && (
        <>
          <ToolPalette />
          <p className="sidebar-desc">Tracez les murs puis fermez la forme.</p>
          {liveSurface !== null && liveSurface > 0 && (
            <div className={`sidebar-badge sidebar-badge--${Math.abs(liveSurface / targetSurfaceM2 - 1) <= 0.1 ? 'success' : liveSurface > targetSurfaceM2 * 1.1 ? 'warn' : 'info'}`}>
              <div className="sidebar-badge-label">~{liveSurface} m² / {targetSurfaceM2} m² cible</div>
            </div>
          )}
          {drawError && (
            <div className="sidebar-badge sidebar-badge--warn">
              <div className="sidebar-badge-label">{drawError}</div>
            </div>
          )}
          <button onClick={() => { setDrawError(null); validerContour(); }} className="sidebar-btn sidebar-btn--primary">
            Valider le contour
          </button>
          <button onClick={() => { setDrawPhase('mode_choice'); setDrawError(null); }} className="sidebar-btn sidebar-btn--ghost">
            Retour
          </button>
        </>
      )}

      {/* ── 3b. Contour template ── */}
      {phase === 'contour_template' && (
        <>
          <p className="sidebar-desc">Tirez les poignees pour ajuster.</p>
          <div className="shape-selector">
            {(['rectangle', 'L', 'T', 'U'] as TemplateShape[]).map((s) => (
              <button key={s} onClick={() => setTemplateShape(s)}
                className={`shape-btn${templateShape === s ? ' active' : ''}`}>
                <span className="shape-btn-icon">{shapeIcons[s]}</span>
                {s === 'rectangle' ? 'Rect' : s}
              </button>
            ))}
          </div>
          {templateParams && (
            <div className="param-display">
              {Object.entries(templateParams.values).map(([key, val]) => (
                <div key={key} className="param-row">
                  <span className="param-row-label">{key}</span>
                  <span className="param-row-value">{(val / 100).toFixed(1)} m</span>
                </div>
              ))}
            </div>
          )}
          <div className="sidebar-badge sidebar-badge--info">
            <div className="sidebar-badge-label">
              {templateSurface} m&sup2; / {targetSurfaceM2} m&sup2; cible
            </div>
          </div>
          <button onClick={closeContourFromTemplate} className="sidebar-btn sidebar-btn--primary">
            Valider le contour
          </button>
          <button onClick={() => setDrawPhase('mode_choice')} className="sidebar-btn sidebar-btn--ghost">
            Retour
          </button>
        </>
      )}

      {/* ── 4. Murs intérieurs ── */}
      {phase === 'murs_interieurs' && (
        <>
          <ToolPalette />
          <p className="sidebar-desc">Ajoutez des murs interieurs (optionnel).</p>
          {innerWalls.length > 0 && (
            <div className="sidebar-badge sidebar-badge--info">
              <div className="sidebar-badge-label">
                {innerWalls.length} mur{innerWalls.length !== 1 ? 's' : ''} interieur{innerWalls.length !== 1 ? 's' : ''}
              </div>
            </div>
          )}
          <button onClick={validerPiece} className="sidebar-btn sidebar-btn--primary">
            Continuer
          </button>
          <button onClick={() => {
            useStore.setState({ contourPoints: [], contourClosed: false, innerWalls: [], innerWallStart: null });
            setDrawPhase(drawMethod === 'generer' ? 'contour_template' : 'contour_draw');
          }} className="sidebar-btn sidebar-btn--ghost">
            Retour
          </button>
        </>
      )}

    </StepShell>
  );
}

/* ═══════════════════════════════════════════
   AMÉNAGEMENT — 3 étapes
   ═══════════════════════════════════════════ */

const AMENAGEMENT_STEPS = 3;
const amenagementLabels = ['Ouvertures', 'Elements fixes', 'Meubles'];

function SidebarAmenagement() {
  const [step, setStep] = useState(0);
  const setMode = useStore((s) => s.setMode);
  const setDrawPhase = useStore((s) => s.setDrawPhase);
  const generer = useStore((s) => s.generer);
  const selectedIds = useStore((s) => s.selectedIds);

  const next = () => setStep(s => Math.min(AMENAGEMENT_STEPS - 1, s + 1));
  const prev = () => {
    if (step > 0) setStep(s => s - 1);
    else { setMode('dessin'); setDrawPhase('murs_interieurs'); }
  };

  return (
    <StepShell title="Amenager la piece" stepLabel={amenagementLabels[step]} stepIdx={step} totalSteps={AMENAGEMENT_STEPS}>

      {/* ── 1. Ouvertures ── */}
      {step === 0 && (
        <>
          <StepOuvertures />
          <button onClick={next} className="sidebar-btn sidebar-btn--primary">Continuer</button>
          <button onClick={prev} className="sidebar-btn sidebar-btn--ghost">Retour</button>
        </>
      )}

      {/* ── 2. Fixes ── */}
      {step === 1 && (
        <>
          <StepFixes />
          <button onClick={next} className="sidebar-btn sidebar-btn--primary">Continuer</button>
          <button onClick={prev} className="sidebar-btn sidebar-btn--ghost">Retour</button>
        </>
      )}

      {/* ── 3. Meubles ── */}
      {step === 2 && (
        <>
          <StepMeubles />
          <button onClick={generer} disabled={selectedIds.size === 0} className="sidebar-btn sidebar-btn--primary">
            Generer le plan
          </button>
          <button onClick={prev} className="sidebar-btn sidebar-btn--ghost">Retour</button>
        </>
      )}

    </StepShell>
  );
}

function StepOuvertures() {
  const elementsMur = useStore((s) => s.elementsMur);
  const supprimerElementMur = useStore((s) => s.supprimerElementMur);
  const inverserSensElement = useStore((s) => s.inverserSensElement);
  const setPlacingTool = useStore((s) => s.setPlacingTool);

  const fenetreLabel = (variant?: string) => {
    switch (variant) {
      case 'petite': return 'Petite fen.';
      case 'porte_fenetre': return 'Porte-fen.';
      case 'baie_vitree': return 'Baie vitree';
      default: return 'Fenetre std';
    }
  };

  return (
    <>
      <p className="sidebar-desc">Cliquez sur un mur pour placer une ouverture.</p>

      <div className="sidebar-placed-label" style={{ marginTop: 4, marginBottom: 4 }}>Portes</div>
      <div className="sidebar-actions">
        <button onClick={() => setPlacingTool({ type: 'porte' })}
          className="sidebar-action-btn sidebar-action-btn--porte">
          + Porte (83 cm)
        </button>
      </div>

      <div className="sidebar-placed-label" style={{ marginTop: 12, marginBottom: 4 }}>Fenetres</div>
      <div className="sidebar-actions" style={{ flexWrap: 'wrap' }}>
        <button onClick={() => setPlacingTool({ type: 'fenetre', variant: 'petite' })}
          className="sidebar-action-btn sidebar-action-btn--fenetre">Petite 60cm</button>
        <button onClick={() => setPlacingTool({ type: 'fenetre', variant: 'standard' })}
          className="sidebar-action-btn sidebar-action-btn--fenetre">Standard 120cm</button>
        <button onClick={() => setPlacingTool({ type: 'fenetre', variant: 'porte_fenetre' })}
          className="sidebar-action-btn sidebar-action-btn--fenetre">Porte-fen. 140cm</button>
        <button onClick={() => setPlacingTool({ type: 'fenetre', variant: 'baie_vitree' })}
          className="sidebar-action-btn sidebar-action-btn--fenetre">Baie 220cm</button>
      </div>

      {elementsMur.length > 0 && (
        <div className="sidebar-placed">
          <div className="sidebar-placed-label">Places</div>
          {elementsMur.map((el) => (
            <div key={el.id} className="sidebar-placed-item">
              <span>{el.type === 'porte' ? 'Porte' : fenetreLabel(el.fenetreVariant)} ({el.largeur} cm)</span>
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => inverserSensElement(el.id)} className="sidebar-item-action" title="Inverser">&lt;-&gt;</button>
                <button onClick={() => supprimerElementMur(el.id)} className="sidebar-item-action" title="Supprimer">x</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function StepFixes() {
  const fixes = useStore((s) => s.fixes);
  const supprimerFixe = useStore((s) => s.supprimerFixe);
  const [catActive, setCatActive] = useState(fixedCategories[0]);
  const filtered = fixedCatalogue.filter((m) => m.categorie === catActive);

  const handleDragStart = (e: React.DragEvent, item: MeubleCatalogue) => {
    e.dataTransfer.setData('fixe', JSON.stringify(item));
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <>
      <p className="sidebar-desc">Glissez les elements fixes sur le plan.</p>
      <div className="sidebar-cats">
        {fixedCategories.map((cat) => (
          <button key={cat} onClick={() => setCatActive(cat)}
            className={`sidebar-cat${catActive === cat ? ' active' : ''}`}>{cat}</button>
        ))}
      </div>
      {filtered.map((item) => (
        <div key={item.id} draggable onDragStart={(e) => handleDragStart(e, item)}
          className="sidebar-item sidebar-item--drag">
          <div className="sidebar-swatch" style={{ backgroundColor: item.couleur }} />
          <div style={{ minWidth: 0 }}>
            <div className="sidebar-item-name">{item.nom}</div>
            <div className="sidebar-item-dim">{(item.largeur / 100).toFixed(1)} x {(item.hauteur / 100).toFixed(1)} m</div>
          </div>
        </div>
      ))}
      {fixes.length > 0 && (
        <div className="sidebar-placed">
          <div className="sidebar-placed-label">Sur le plan</div>
          {fixes.map((m, i) => (
            <div key={i} className="sidebar-placed-item">
              <span>{m.nom}</span>
              <button onClick={() => supprimerFixe(i)} className="sidebar-item-action">Retirer</button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function StepMeubles() {
  const selectedIds = useStore((s) => s.selectedIds);
  const toggleMeuble = useStore((s) => s.toggleMeuble);
  const [catActive, setCatActive] = useState(categories[0]);
  const [recherche, setRecherche] = useState('');
  const filtered = catalogue.filter((m) =>
    m.categorie === catActive && (recherche === '' || m.nom.toLowerCase().includes(recherche.toLowerCase()))
  );

  return (
    <>
      <p className="sidebar-desc">Cochez les meubles a placer.</p>
      <input type="text" placeholder="Rechercher..." value={recherche}
        onChange={(e) => setRecherche(e.target.value)}
        className="sidebar-search" />
      <div className="sidebar-cats">
        {categories.map((cat) => (
          <button key={cat} onClick={() => setCatActive(cat)}
            className={`sidebar-cat${catActive === cat ? ' active' : ''}`}>{cat}</button>
        ))}
      </div>
      {filtered.map((m) => {
        const checked = selectedIds.has(m.id);
        return (
          <label key={m.id} className={`sidebar-check${checked ? ' checked' : ''}`}>
            <input type="checkbox" checked={checked} onChange={() => toggleMeuble(m.id)} />
            <div className="sidebar-swatch" style={{ backgroundColor: m.couleur }} />
            <div style={{ minWidth: 0 }}>
              <div className="sidebar-item-name">{m.nom}</div>
              <div className="sidebar-item-dim">{(m.largeur / 100).toFixed(1)} x {(m.hauteur / 100).toFixed(1)} m</div>
            </div>
          </label>
        );
      })}
      <div className="sidebar-count">
        {selectedIds.size} meuble{selectedIds.size !== 1 ? 's' : ''} selectionne{selectedIds.size !== 1 ? 's' : ''}
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════
   RÉSULTAT
   ═══════════════════════════════════════════ */

function SidebarResultat() {
  const piece = useStore((s) => s.piece);
  const placements = useStore((s) => s.placements);
  const nonPlaces = useStore((s) => s.nonPlaces);
  const selectedPlacement = useStore((s) => s.selectedPlacement);
  const setSelectedPlacement = useStore((s) => s.setSelectedPlacement);
  const mettreAJourPlacement = useStore((s) => s.mettreAJourPlacement);
  const supprimerPlacement = useStore((s) => s.supprimerPlacement);
  const generer = useStore((s) => s.generer);
  const setMode = useStore((s) => s.setMode);

  const sel = selectedPlacement !== null ? placements[selectedPlacement] : null;

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-title">Resultat</div>
      </div>
      <div className="sidebar-body">

        {/* ── Selected furniture panel ── */}
        {sel && selectedPlacement !== null ? (
          <>
            <div className="sidebar-badge sidebar-badge--neutral">
              <div className="sidebar-badge-label">{sel.nom}</div>
            </div>
            <div className="sidebar-badge sidebar-badge--info">
              <div className="sidebar-badge-label">
                {(sel.largeur / 100).toFixed(1)} x {(sel.hauteur / 100).toFixed(1)} m — {sel.rotation}°
              </div>
            </div>
            <button onClick={() => {
              mettreAJourPlacement(selectedPlacement, { rotation: (sel.rotation + 90) % 360 });
            }} className="sidebar-btn sidebar-btn--primary">
              Tourner 90°
            </button>
            <button onClick={() => {
              supprimerPlacement(selectedPlacement);
            }} className="sidebar-btn sidebar-btn--danger">
              Supprimer
            </button>
            <button onClick={() => setSelectedPlacement(null)} className="sidebar-btn sidebar-btn--ghost">
              Deselectionner
            </button>
          </>
        ) : (
          <>
            {/* ── Overview ── */}
            <p className="sidebar-desc">Cliquez un meuble pour le modifier.</p>
            {piece && (
              <div className="sidebar-badge sidebar-badge--neutral">
                <div className="sidebar-badge-label">Surface : {piece.surface} m&sup2;</div>
              </div>
            )}
            <div className="sidebar-badge sidebar-badge--success">
              <div className="sidebar-badge-label">
                {placements.length} meuble{placements.length !== 1 ? 's' : ''} place{placements.length !== 1 ? 's' : ''}
              </div>
            </div>
            {nonPlaces.length > 0 && (
              <div className="sidebar-badge sidebar-badge--warn">
                <div className="sidebar-badge-label">
                  {nonPlaces.length} non place{nonPlaces.length !== 1 ? 's' : ''}
                </div>
                {nonPlaces.map((n, i) => <div key={i} className="sidebar-badge-detail">{n}</div>)}
              </div>
            )}
            {/* Furniture list */}
            <div className="sidebar-placed">
              {placements.map((m, i) => (
                <div key={i} className="sidebar-placed-item" style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedPlacement(i)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="sidebar-swatch" style={{ backgroundColor: m.couleur }} />
                    <span>{m.nom}</span>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={generer} className="sidebar-btn sidebar-btn--primary">
              Rearranger
            </button>
            <button onClick={() => setMode('amenagement')} className="sidebar-btn sidebar-btn--ghost">
              Modifier l'amenagement
            </button>
          </>
        )}
      </div>
    </div>
  );
}
