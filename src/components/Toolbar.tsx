import { useState } from 'react';
import type Konva from 'konva';
import type { AppMode } from '../types';
import { useStore } from '../store';

interface Props {
  stageRef: React.RefObject<Konva.Stage | null>;
  onBackToLanding: () => void;
}

export function Toolbar({ stageRef, onBackToLanding }: Props) {
  const mode = useStore((s) => s.mode);
  const setMode = useStore((s) => s.setMode);
  const piece = useStore((s) => s.piece);
  const selectedIds = useStore((s) => s.selectedIds);
  const generer = useStore((s) => s.generer);
  const isGenerated = useStore((s) => s.isGenerated);
  const nonPlaces = useStore((s) => s.nonPlaces);
  const echelle = useStore((s) => s.echelle);
  const setEchelle = useStore((s) => s.setEchelle);
  const resetTout = useStore((s) => s.resetTout);
  const sauvegarder = useStore((s) => s.sauvegarder);
  const charger = useStore((s) => s.charger);
  const [saveMsg, setSaveMsg] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  const exportPNG = () => {
    const stage = stageRef.current;
    if (!stage) return;
    const uri = stage.toDataURL({ pixelRatio: 2 });
    const a = document.createElement('a');
    a.download = 'plan.png';
    a.href = uri;
    a.click();
  };

  const steps: { key: AppMode; label: string; num: string; done: boolean }[] = [
    { key: 'dessin', num: '01', label: 'Piece', done: piece !== null },
    { key: 'amenagement', num: '02', label: 'Amenagement', done: isGenerated },
    { key: 'resultat', num: '03', label: 'Resultat', done: false },
  ];

  const canNavigate = (key: AppMode) =>
    key === 'dessin' ||
    (key === 'amenagement' && piece !== null) ||
    (key === 'resultat' && isGenerated);

  // Which CTA to show inline
  const inlineCTA = mode === 'amenagement'
    ? { label: 'Generer', action: generer, disabled: selectedIds.size === 0 }
    : mode === 'resultat'
      ? { label: 'Rearranger', action: generer, disabled: false }
      : null;

  return (
    <div className={`pill pill--app${menuOpen ? ' open' : ''}`}>
      {/* ── Top bar row ── */}
      <div className="pill-bar">
        {/* Logo + Wordmark — link to landing */}
        <button className="pill-home" onClick={() => { onBackToLanding(); setMenuOpen(false); }}>
          <div className="pill-logo">
            <span className="pill-logo-mark">R</span>
          </div>
          <span className="pill-wordmark">Rearrangeur</span>
        </button>

        {/* Surface badge */}
        {piece && <span className="pill-surface">{piece.surface} m&sup2;</span>}

        {/* Inline elements (hidden when open) */}
        <div className="pill-inline">
          {/* Steps */}
          <nav className="pill-steps">
            {steps.map((s, i) => {
              const active = mode === s.key;
              const ok = canNavigate(s.key);
              return (
                <span key={s.key} style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                  {i > 0 && <span className="pill-step-dot">&middot;</span>}
                  <button
                    onClick={() => ok && setMode(s.key)}
                    disabled={!ok}
                    className={`pill-step${active ? ' active' : ''}${s.done && !active ? ' done' : ''}`}
                  >
                    {s.num} {s.label}
                  </button>
                </span>
              );
            })}
          </nav>

          {/* CTA */}
          {inlineCTA && (
            <button
              onClick={inlineCTA.action}
              disabled={inlineCTA.disabled}
              className="pill-cta"
            >
              {inlineCTA.label}
            </button>
          )}

          {/* Non-places warning */}
          {nonPlaces.length > 0 && mode === 'resultat' && (
            <span className="pill-badge-warn">
              {nonPlaces.length} non place{nonPlaces.length > 1 ? 's' : ''}
            </span>
          )}

          {/* Zoom */}
          <div className="pill-zoom">
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.1"
              value={echelle}
              onChange={(e) => setEchelle(parseFloat(e.target.value))}
              className="pill-zoom-slider"
            />
          </div>
        </div>

        {/* Burger / Close */}
        <button
          className={`pill-burger${menuOpen ? ' open' : ''}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menu"
        >
          <span />
          <span />
        </button>
      </div>

      {/* ── Panel content ── */}
      <div className="pill-panel">
        <div className="pill-panel-main">
          {/* Left — links */}
          <div className="pill-panel-links">
            <button
              onClick={() => {
                sauvegarder();
                setSaveMsg('Sauvegarde !');
                setTimeout(() => setSaveMsg(''), 2000);
              }}
              className="pill-panel-link"
            >
              Sauvegarder
            </button>
            <button
              onClick={() => { charger(); setMenuOpen(false); }}
              className="pill-panel-link"
            >
              Charger
            </button>
            {mode === 'resultat' && (
              <>
                <button onClick={exportPNG} className="pill-panel-link">
                  Export PNG
                </button>
                <button
                  onClick={() => { setMode('amenagement'); setMenuOpen(false); }}
                  className="pill-panel-link"
                >
                  Modifier
                </button>
              </>
            )}
            <button
              onClick={() => { resetTout(); setMenuOpen(false); }}
              className="pill-panel-link pill-panel-link--danger"
            >
              Recommencer
            </button>
            {saveMsg && <span className="pill-toast">{saveMsg}</span>}
          </div>

          {/* Right — CTA area */}
          {mode === 'amenagement' ? (
            <button
              onClick={() => { generer(); setMenuOpen(false); }}
              disabled={selectedIds.size === 0}
              className="pill-panel-media pill-panel-media--cta"
            >
              <span className="pill-panel-media-cta-text">Generer</span>
              <span className="pill-panel-media-cta-arrow">&rarr;</span>
            </button>
          ) : mode === 'resultat' ? (
            <button
              onClick={() => { generer(); setMenuOpen(false); }}
              className="pill-panel-media pill-panel-media--cta"
            >
              <span className="pill-panel-media-cta-text">Rearranger</span>
              <span className="pill-panel-media-cta-arrow">&rarr;</span>
            </button>
          ) : (
            <div className="pill-panel-media pill-panel-media--cta pill-panel-media--info">
              <span className="pill-panel-media-cta-text">Dessinez</span>
              <span className="pill-panel-media-cta-sub">Tracez les murs de votre piece</span>
            </div>
          )}
        </div>

        {/* Footer — steps */}
        <div className="pill-panel-footer">
          {steps.map((s) => {
            const active = mode === s.key;
            const ok = canNavigate(s.key);
            return (
              <button
                key={s.key}
                onClick={() => { if (ok) { setMode(s.key); setMenuOpen(false); } }}
                disabled={!ok}
                className={`pill-panel-footer-step${active ? ' active' : ''}`}
              >
                {s.num} {s.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
