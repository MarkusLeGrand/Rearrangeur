import { useState, useEffect, useRef, useCallback } from 'react';

interface Props {
  onEnterApp: () => void;
}

const sections = [
  { id: 'introduction', label: 'Introduction', subtitle: "Decouvrez l'outil" },
  { id: 'fonctionnement', label: 'Fonctionnement', subtitle: 'En 3 etapes' },
  { id: 'technologie', label: 'Technologie', subtitle: "L'algorithme" },
  { id: 'resultats', label: 'Resultats', subtitle: 'Export & partage' },
];

export function LandingHeader({ onEnterApp }: Props) {
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [pastHero, setPastHero] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const ticking = useRef(false);

  // Track scroll for TOC visibility
  useEffect(() => {
    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(() => {
        setPastHero(window.scrollY > window.innerHeight * 0.8);
        ticking.current = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Scroll-spy via IntersectionObserver
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: '-40% 0px -40% 0px' }
    );

    sections.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const scrollTo = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMenuOpen(false);
  }, []);

  return (
    <>
      {/* ── Floating Pill ── */}
      <div className={`pill${menuOpen ? ' open' : ''}`}>
        {/* Top bar row */}
        <div className="pill-bar">
          <button className="pill-home" onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); setMenuOpen(false); }}>
            <div className="pill-logo">
              <span className="pill-logo-mark">R</span>
            </div>
            <span className="pill-wordmark">Rearrangeur</span>
          </button>

          {/* Burger / Close — pushed to right */}
          <div style={{ marginLeft: 'auto' }}>
            <button
              className={`pill-burger${menuOpen ? ' open' : ''}`}
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Menu"
            >
              <span />
              <span />
            </button>
          </div>
        </div>

        {/* Panel content */}
        <div className="pill-panel">
          <div className="pill-panel-main">
            {/* Left — section links */}
            <div className="pill-panel-links">
              {sections.map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => scrollTo(id)}
                  className="pill-panel-link"
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Right — CTA image area */}
            <button
              onClick={() => { onEnterApp(); setMenuOpen(false); }}
              className="pill-panel-media pill-panel-media--cta"
            >
              <span className="pill-panel-media-cta-text">Essayer</span>
              <span className="pill-panel-media-cta-arrow">&rarr;</span>
            </button>
          </div>

          {/* Footer */}
          <div className="pill-panel-footer">
            <span className="pill-panel-footer-info">Reagencement automatique</span>
            <span className="pill-panel-footer-info">2026</span>
            <button
              onClick={() => { onEnterApp(); setMenuOpen(false); }}
              className="pill-panel-footer-cta"
            >
              Essayer
              <span className="pill-panel-footer-dot" />
            </button>
          </div>
        </div>
      </div>

      {/* ── TOC Sidebar ── */}
      <nav className={`landing-toc${pastHero ? ' landing-toc--visible' : ''}`}>
        {sections.map(({ id, label, subtitle }) => (
          <button
            key={id}
            onClick={() => scrollTo(id)}
            className={`landing-toc-item${activeSection === id ? ' active' : ''}`}
          >
            <div className="landing-toc-thumb" />
            <div className="landing-toc-text">
              <span className="landing-toc-label">{label}</span>
              <span className="landing-toc-subtitle">{subtitle}</span>
            </div>
          </button>
        ))}
      </nav>
    </>
  );
}
